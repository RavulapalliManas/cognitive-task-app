"""
Enhanced Scoring System for Cognitive Assessment
Provides domain-specific scoring and composite metrics.

Dependencies:
- numpy
- typing
"""
import numpy as np

from scipy.spatial.distance import directed_hausdorff
import numpy as np
from scipy.spatial import Delaunay
from typing import Dict, List, Any, Optional, Tuple, Set
import math

def calculate_hausdorff_distance(set_a: List[Tuple[float, float]], set_b: List[Tuple[float, float]]) -> float:
    """
    Calculate max(directed_hausdorff(A,B), directed_hausdorff(B,A))
    """
    if not set_a or not set_b:
        return 1000.0 # High penalty
    
    u = np.array(set_a)
    v = np.array(set_b)
    
    d1 = directed_hausdorff(u, v)[0]
    d2 = directed_hausdorff(v, u)[0]
    return max(d1, d2)


def calculate_arkin_metric(poly_a: List[Tuple[float, float]], poly_b: List[Tuple[float, float]]) -> float:
    """
    Simplified Arkin's Turning Function metric (Dissimilarity).
    Ideally requires resampling to equal length. 
    Here we use a simplified shape signature: 
    Histogram of edge angles? Or cumulative turning angle?
    
    True Arkin's involves integrating the difference of turning functions.
    We'll approximate: 
    1. Resample both to N=20 points (equidistant).
    2. Compute turning angles at each vertex.
    3. Compute L2 difference of turning angle sequences.
    """
    if len(poly_a) < 3 or len(poly_b) < 3:
        return 1.0 # Max dissimilarity
        
    def resample_polygon(poly, n=20):
        # Calculate total perimeter
        perimeter = 0
        segments = []
        for i in range(len(poly)):
            p1 = poly[i]
            p2 = poly[(i+1)%len(poly)]
            dist = math.sqrt((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2)
            segments.append(dist)
            perimeter += dist
            
        step = perimeter / n
        new_poly = [poly[0]]
        current_dist = 0
        
        # Naive resampling (just taking points at step intervals)
        # For true accuracy needed for Arkin's, this is complex.
        # Fallback: Just compare normalized side lengths and internal angles?
        # Let's use "Shape Context" simplified: Sequence of internal angles.
        return poly # Placeholder for full resampling if needed
        
    def get_turning_angles(poly):
        angles = []
        for i in range(len(poly)):
            p1 = poly[i-1]
            p2 = poly[i]
            p3 = poly[(i+1)%len(poly)]
            
            # Vector 1
            v1x, v1y = p2[0]-p1[0], p2[1]-p1[1]
            # Vector 2
            v2x, v2y = p3[0]-p2[0], p3[1]-p2[1]
            
            angle1 = math.atan2(v1y, v1x)
            angle2 = math.atan2(v2y, v2x)
            
            diff = angle2 - angle1
            # Normalize to -pi to pi
            while diff <= -math.pi: diff += 2*math.pi
            while diff > math.pi: diff -= 2*math.pi
            
            angles.append(diff)
        return angles

    # Use simplified angle sequence comparison (Rotation invariant?)
    # Arkin's minimizes over shifts. 
    # For now: Just L2 of turning angles (assuming matching start vertex is hard).
    # We will assume "similar orientation" if user drew it upright.
    
    ang_a = get_turning_angles(poly_a)
    ang_b = get_turning_angles(poly_b)
    
    # Pad to match lengths
    max_len = max(len(ang_a), len(ang_b))
    ang_a += [0] * (max_len - len(ang_a))
    ang_b += [0] * (max_len - len(ang_b))
    
    # Compute difference
    diff_sum = sum([(a - b)**2 for a, b in zip(ang_a, ang_b)])
    
    # Normalize
    return min(1.0, math.sqrt(diff_sum) / max_len)

def calculate_smoothness_jerk(points: List[Dict[str, float]], timestamps: List[int]) -> float:
    """
    Calculate Log Dimensionless Jerk or SPARC-like smoothness.
    Lower is better (smoother).
    Simple version: Variance of acceleration?
    """
    if len(points) < 3:
        return 0.0
        
    velocities = []
    for i in range(len(points)-1):
        dt = (timestamps[i+1] - timestamps[i]) / 1000.0 # seconds
        if dt <= 0: continue
        
        dx = points[i+1]['x'] - points[i]['x']
        dy = points[i+1]['y'] - points[i]['y']
        vel = math.sqrt(dx*dx + dy*dy) / dt
        velocities.append(vel)
        
    if not velocities:
        return 0.0
        
    # Acceleration
    accels = []
    for i in range(len(velocities)-1):
        # We don't have dt for velocity pairs easily unless we track it
        # Assuming roughly constant sampling for simplicity in this fallback
        dv = velocities[i+1] - velocities[i]
        accels.append(abs(dv))
        
    if not accels:
        return 0.0
        
    # Smoothness metric: Mean Squared Jerk / Velocity^2?
    # Let's return Mean Absolute Acceleration as a proxy for Tremor/Jerk
    return float(np.mean(accels))



def analyze_delaunay_lures(points: List[Dict[str, float]], true_order: List[int], submissions: List[int]) -> Dict[str, float]:
    """
    Analyze if mistakes correspond to Delaunay 'lure' edges (visual proximity).
    
    Args:
        points: List of {x, y, index...}
        true_order: List of correct indices
        submissions: List of indices selected by user in order
    
    Returns:
        {
            'lure_susceptibility': 0.0-1.0 (fraction of mistakes that were lures),
            'delaunay_compliance': 0.0-1.0 (fraction of correct moves that are Delaunay edges)
        }
    """
    if not points or len(points) < 3:
        return {'lure_susceptibility': 0.0, 'delaunay_compliance': 0.0}

    # 1. Build Delaunay Edges
    coords = np.array([[p['x'], p['y']] for p in points])
    try:
        tri = Delaunay(coords)
    except Exception:
        return {'lure_susceptibility': 0.0, 'delaunay_compliance': 0.0}

    delaunay_edges: Set[Tuple[int, int]] = set()
    for simplex in tri.simplices:
        for i in range(3):
            u, v = sorted((simplex[i], simplex[(i+1)%3]))
            delaunay_edges.add((u, v))

    # 2. Analyze Submission Path
    lure_mistakes = 0
    total_mistakes = 0
    
    # We iterate through user submissions.
    # We maintain 'current node' state. 
    # Logic: The user starts at 'nothing'. The first click should be true_order[0].
    # If they click wrong, we can't easily say "where they came from" unless we assume they were at the last CORRECT node?
    # Or we look at the submitted edge: submission[i-1] -> submission[i].
    
    if len(submissions) < 2:
        return {'lure_susceptibility': 0.0, 'delaunay_compliance': 0.0}

    # We only count edges formed by consecutive clicks in the submission
    for i in range(1, len(submissions)):
        prev = submissions[i-1]
        curr = submissions[i]
        
        # Check if this move was correct according to true_order?
        # Requires aligning submission stream to true_order.
        # But simple "is this edge a Lure?" check:
        # If the edge (prev, curr) IS in Delaunay but NOT in true_order (consecutive), it might be a lure.
        # But wait, true_order has edges (TO[k], TO[k+1]).
        
        # Is (prev, curr) a valid edge in the true sequence?
        # We need to find if prev, curr are consecutive in true_order.
        is_valid_edge = False
        try:
            prev_idx_in_order = true_order.index(prev)
            if prev_idx_in_order < len(true_order) - 1:
                if true_order[prev_idx_in_order + 1] == curr:
                    is_valid_edge = True
        except ValueError:
            pass
            
        if not is_valid_edge:
            total_mistakes += 1
            edge = tuple(sorted((prev, curr)))
            if edge in delaunay_edges:
                lure_mistakes += 1

    lure_score = (lure_mistakes / total_mistakes) if total_mistakes > 0 else 0.0
    
    return {
        'lure_susceptibility': float(lure_score),
        'total_lure_errors': float(lure_mistakes)
    }


def score_level_2_memory(true_order: List[int], 
                         submissions: List[int],
                         points: List[Dict[str, float]]) -> Dict[str, float]:
    """
    Score Level 2 (Spatial Memory) using Hausdorff Distance.
    """
    # Accuracy (Did they click the correct sequence?)
    # This function is not defined in the provided context, assuming it exists elsewhere or is a placeholder.
    # For now, a dummy accuracy score.
    def score_accuracy(true_order_local, submissions_local):
        correct_count = 0
        for i in range(min(len(true_order_local), len(submissions_local))):
            if true_order_local[i] == submissions_local[i]:
                correct_count += 1
        return (correct_count / len(true_order_local)) if true_order_local else 0.0

    acc = score_accuracy(true_order, submissions)
    
    # Hausdorff Distance (Spatial Precision)
    # Set A: Target Coordinates
    # Set B: User Coordinates (based on clicked indices)
    
    idx_to_coord = {p['index']: (p['x'], p['y']) for p in points}
    
    target_set = []
    for idx in true_order:
        if idx in idx_to_coord:
            target_set.append(idx_to_coord[idx])
            
    user_set = []
    for idx in submissions:
        if idx in idx_to_coord:
            user_set.append(idx_to_coord[idx])
            
    # Calculate Hausdorff
    # Note: If sets are empty, returns high penalty
    h_dist = calculate_hausdorff_distance(target_set, user_set)
    
    # Calculate Drift Vectors (Submission - Target)
    drift_vectors = []
    # We need to align submission to target. 
    # Assumption: i-th submission corresponds to i-th target in sequence?
    # Or nearest neighbor?
    # memory task is sequential (click 1, then 2...)
    for i, sub_idx in enumerate(submissions):
        if i >= len(true_order): break
        target_idx = true_order[i]
        
        if sub_idx in idx_to_coord and target_idx in idx_to_coord:
            tx, ty = idx_to_coord[target_idx]
            sx, sy = idx_to_coord[sub_idx]
            # Vector from Target to Submission
            drift_vectors.append({'x': sx - tx, 'y': sy - ty})
            
    # Normalize score: Assume 300px error is 0 score
    # h_dist is in pixels
    spatial_score = max(0.0, 100.0 - (h_dist / 3.0)) # Scaling factor k=1/3
    
    # Composite
    # Memory = 60% Accuracy (Recall) + 40% Spatial (Precision)
    score = (acc * 60) + (spatial_score * 0.4)
    
    return {
        'accuracy': float(acc),
        'hausdorff_distance': float(h_dist),
        'avg_spatial_error': float(h_dist), # For backward compatibility
        'score': float(score),
        'drift_vectors': drift_vectors
    }


def analyze_kinetic_hull(kinetic_data: List[Dict[str, float]], submissions: List[Any], start_time_ms: int) -> Dict[str, float]:
    """
    Analyze correlation between Hull Area expansion and Reaction Time.
    
    Args:
        kinetic_data: List of {t: seconds, area: float}
        submissions: List of submission items with timestamp_ms
        start_time_ms: Task start time
        
    Returns:
        {
            'hull_rt_correlation': float (-1 to 1),
            'avg_expansion_rate': float
        }
    """
    if not kinetic_data or len(submissions) < 2:
        return {}

    # Convert kinetic data to arrays
    # t is in seconds relative to start
    k_times = np.array([d['t'] for d in kinetic_data])
    k_areas = np.array([d['area'] for d in kinetic_data])
    
    # Calculate expansion rate (dArea/dt)
    # simple difference
    if len(k_times) < 2:
        return {}
        
    # Interpolate area at click times to find expansion during intervals
    # reaction_times = []
    # expansion_rates = []
    
    last_t = 0.0
    
    rts = []
    expansions = []
    
    # Sort submissions by time just in case
    sorted_subs = sorted(submissions, key=lambda s: s.timestamp_ms)
    
    for i, sub in enumerate(sorted_subs):
        current_t = (sub.timestamp_ms - start_time_ms) / 1000.0
        
        if i == 0:
            last_t = current_t
            continue
            
        # Reaction time for this target
        rt = current_t - last_t
        if rt <= 0:
            last_t = current_t
            continue
            
        # Calculate average expansion of hull during this interval
        # Find kinetic samples between last_t and current_t
        mask = (k_times >= last_t) & (k_times <= current_t)
        relevant_areas = k_areas[mask]
        
        if len(relevant_areas) > 1:
            # Expansion = max area - min area? Or total change?
            # "Expansion" usually implies getting bigger.
            # Let's use (EndArea - StartArea) / RT
            # Or better: average derivative?
            # Let's use simple change in area over the interval
            area_change = relevant_areas[-1] - relevant_areas[0]
            expansion_rate = area_change / rt
            expansions.append(expansion_rate)
            rts.append(rt)
        
        last_t = current_t
        
    if len(rts) < 3:
        return {'hull_rt_correlation': 0.0, 'avg_expansion_rate': 0.0}
        
    # Correlate
    try:
        corr = np.corrcoef(expansions, rts)[0, 1]
        if np.isnan(corr):
            corr = 0.0
    except Exception:
        corr = 0.0
        
    return {
        'hull_rt_correlation': float(corr),
        'avg_expansion_rate': float(np.mean(expansions))
    }


class ScoreWeights:
    """Configurable weights for composite scoring."""
    
    # Domain weights for global composite
    MEMORY = 0.25
    ATTENTION = 0.25
    VISUOSPATIAL = 0.30
    RECOGNITION = 0.20
    
    # Within-level component weights
    ACCURACY = 0.5
    TIME = 0.3
    ATTENTION_COMPONENT = 0.2


def compute_memory_score(level_scores: List[Dict[str, float]]) -> float:
    """
    Compute memory domain score from Level 2 and Level 7 results.
    
    Args:
        level_scores: List of score dictionaries from relevant levels
        
    Returns:
        Memory score (0-100)
    """
    if not level_scores:
        return 0.0
    
    scores = [s.get('composite_score', 0.0) for s in level_scores]
    return float(np.mean(scores))


def compute_attention_score(level_scores: List[Dict[str, float]]) -> float:
    """
    Compute attention domain score from Level 3 and Level 4 results.
    
    Args:
        level_scores: List of score dictionaries from relevant levels
        
    Returns:
        Attention score (0-100)
    """
    if not level_scores:
        return 0.0
    
    scores = [s.get('composite_score', 0.0) for s in level_scores]
    return float(np.mean(scores))


def compute_visuospatial_score(level_scores: List[Dict[str, float]]) -> float:
    """
    Compute visuospatial domain score from Level 1, Level 6, and Level 7 results.
    
    Args:
        level_scores: List of score dictionaries from relevant levels
        
    Returns:
        Visuospatial score (0-100)
    """
    if not level_scores:
        return 0.0
    
    scores = [s.get('composite_score', 0.0) for s in level_scores]
    return float(np.mean(scores))


def compute_recognition_score(level_scores: List[Dict[str, float]]) -> float:
    """
    Compute recognition domain score from Level 5 results.
    
    Args:
        level_scores: List of score dictionaries from Level 5
        
    Returns:
        Recognition score (0-100)
    """
    if not level_scores:
        return 0.0
    
    scores = [s.get('recognition_score', s.get('composite_score', 0.0)) for s in level_scores]
    return float(np.mean(scores))


def compute_composite_score(all_level_results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Compute overall composite score and cognitive profile.
    
    Args:
        all_level_results: List of all level/sublevel results with scores
        
    Returns:
        {
            'composite_score': float (0-100),
            'cognitive_profile': {
                'memory': float,
                'attention': float,
                'visuospatial': float,
                'recognition': float
            },
            'domain_breakdown': {...}
        }
    """
    # Group results by level
    levels = {}
    for result in all_level_results:
        level_num = result.get('level', 0)
        if level_num not in levels:
            levels[level_num] = []
        levels[level_num].append(result)
    
    # Compute domain scores
    memory_levels = []
    attention_levels = []
    visuospatial_levels = []
    recognition_levels = []
    
    # Level 1 → Visuospatial
    if 1 in levels:
        visuospatial_levels.extend(levels[1])
    
    # Level 2 → Memory
    if 2 in levels:
        memory_levels.extend(levels[2])
    
    # Level 3 → Attention
    if 3 in levels:
        attention_levels.extend(levels[3])
    
    # Level 4 → Attention + Memory
    if 4 in levels:
        attention_levels.extend(levels[4])
    
    # Level 5 → Recognition
    if 5 in levels:
        recognition_levels.extend(levels[5])
    
    # Level 6 → Visuospatial
    if 6 in levels:
        visuospatial_levels.extend(levels[6])
    
    # Level 7 → Memory + Visuospatial
    if 7 in levels:
        memory_levels.extend(levels[7])
        visuospatial_levels.extend(levels[7])
    
    # Calculate domain scores
    memory = compute_memory_score(memory_levels)
    attention = compute_attention_score(attention_levels)
    visuospatial = compute_visuospatial_score(visuospatial_levels)
    recognition = compute_recognition_score(recognition_levels)
    
    # Weighted geometric mean for composite
    if all([memory > 0, attention > 0, visuospatial > 0, recognition > 0]):
        composite = (
            (memory ** ScoreWeights.MEMORY) *
            (attention ** ScoreWeights.ATTENTION) *
            (visuospatial ** ScoreWeights.VISUOSPATIAL) *
            (recognition ** ScoreWeights.RECOGNITION)
        ) ** (1.0 / (ScoreWeights.MEMORY + ScoreWeights.ATTENTION + 
                     ScoreWeights.VISUOSPATIAL + ScoreWeights.RECOGNITION))
    else:
        # Fallback to arithmetic mean if any domain is missing
        available_scores = [s for s in [memory, attention, visuospatial, recognition] if s > 0]
        composite = float(np.mean(available_scores)) if available_scores else 0.0
    
    return {
        'composite_score': float(composite),
        'cognitive_profile': {
            'memory': float(memory),
            'attention': float(attention),
            'visuospatial': float(visuospatial),
            'recognition': float(recognition)
        },
        'domain_breakdown': {
            'memory': {
                'score': float(memory),
                'n_tests': len(memory_levels)
            },
            'attention': {
                'score': float(attention),
                'n_tests': len(attention_levels)
            },
            'visuospatial': {
                'score': float(visuospatial),
                'n_tests': len(visuospatial_levels)
            },
            'recognition': {
                'score': float(recognition),
                'n_tests': len(recognition_levels)
            }
        }
    }


def score_level_5_recognition(correct: bool, 
                              reaction_time_ms: int,
                              confidence_rating: int,
                              time_limit_ms: int = 60000) -> Dict[str, float]:
    """
    Score Level 5 shape recognition task.
    
    Args:
        correct: Whether the selection was correct
        reaction_time_ms: Time taken to respond
        confidence_rating: User's confidence (1-5)
        time_limit_ms: Maximum allowed time
        
    Returns:
        {
            'correctness': 0.0 or 1.0,
            'time_score': 0.0-1.0,
            'confidence_score': 0.0-1.0,
            'recognition_score': 0.0-100.0
        }
    """
    # Correctness: binary
    correctness = 1.0 if correct else 0.0
    
    # Time score: exponential decay (faster = better)
    # Expected time: 15 seconds (reasonable recognition time)
    expected_time = 15000  # 15 seconds
    time_ratio = min(reaction_time_ms / expected_time, 3.0)  # Cap at 3x expected
    time_score = math.exp(-0.5 * (time_ratio - 1.0))  # Peak at expected time
    time_score = max(0.0, min(1.0, time_score))
    
    # Confidence calibration score
    # High confidence + correct = bonus
    # High confidence + incorrect = penalty
    # Low confidence always neutral
    confidence_normalized = confidence_rating / 5.0
    
    if correct:
        # Reward high confidence when correct
        confidence_score = 0.5 + 0.5 * confidence_normalized
    else:
        # Penalize high confidence when incorrect
        confidence_score = 0.5 - 0.5 * confidence_normalized
    
    confidence_score = max(0.0, min(1.0, confidence_score))
    
    # Composite recognition score
    if correct:
        # Weighted combination when correct
        recognition = (
            0.6 * correctness +
            0.25 * time_score +
            0.15 * confidence_score
        ) * 100.0
    else:
        # Heavy penalty when incorrect
        recognition = 0.0
    
    
    
    return {
        'correctness': float(correctness),
        'time_score': float(time_score),
        'confidence_score': float(confidence_score),
        'recognition_score': float(recognition)
    }


def score_level_1_tmt(points: List[Dict[str, float]], 
                      submissions: List[int], 
                      true_order: List[int],
                      time_taken_ms: int) -> Dict[str, float]:
    """
    Score Level 1 (Star TMT) using Path Efficiency Index (PEI) and Delaunay Lures.
    """
    # 1. Path Efficiency Index (Tortuosity)
    # Reconstruct the path taken by the user based on points
    # NOTE: We assume straight lines between clicks for PEI in this discrete version
    user_path = []
    for idx in submissions:
        # Find point with this index
        for p in points:
            if p['index'] == idx:
                user_path.append(p)
                break
                
    # Calculate Tortuosity (Path Length Ratio)
    # Imported from geometry_utils? No, need to import or implement.
    # We will invoke compute_path_tortuosity via main.py or move it here. 
    # But scoring.py doesn't import geometry_utils to avoid circular deps.
    # Let's keep it simple here or pass it in. 
    # Ideally, main.py calculates geometric metrics and passes them, OR scoring.py imports geometry_utils.
    # For now, let's implement basic ratio here.
    
    path_len = 0.0
    for i in range(len(user_path)-1):
        dx = user_path[i+1]['x'] - user_path[i]['x']
        dy = user_path[i+1]['y'] - user_path[i]['y']
        path_len += math.sqrt(dx*dx + dy*dy)
        
    # Optimal length (Geodesic between targets in order)
    optimal_len = 0.0
    # Correct order path
    ordered_points = sorted(points, key=lambda x: x['index'])
    # Only up to the number of points user clicked?? Or total?
    # PEI is usually over the completed task.
    for i in range(len(ordered_points)-1):
        dx = ordered_points[i+1]['x'] - ordered_points[i]['x']
        dy = ordered_points[i+1]['y'] - ordered_points[i]['y']
        optimal_len += math.sqrt(dx*dx + dy*dy)
        
    pei = (optimal_len / path_len * 100.0) if path_len > 0 else 0.0
    pei = min(100.0, pei) # Cap at 100
    
    # 2. Delaunay Lure Analysis
    lure_data = analyze_delaunay_lures(points, true_order, submissions)
    
    # 3. Accuracy
    correct_count = 0
    for i, sub_idx in enumerate(submissions):
         if i < len(true_order) and sub_idx == true_order[i]:
             correct_count += 1
    accuracy = correct_count / len(true_order) if true_order else 0.0
    
    # Composite Score
    # Heavy penalty for Lure Susceptibility (Frontal/Parietal sign)
    # PEI < 80 is warning.
    
    score = (accuracy * 50) + (pei * 0.3) + ((1.0 - lure_data['lure_susceptibility']) * 20)
    # Time bonus
    expected_time = len(true_order) * 1500
    time_ratio = min(time_taken_ms / expected_time, 3.0)
    time_score = max(0.0, 1.0 - (time_ratio - 1.0)*0.5)
    score += time_score * 10
    
    return {
        'pei': float(pei),
        'lure_susceptibility': lure_data['lure_susceptibility'],
        'accuracy': float(accuracy),
        'score': float(min(100.0, score))
    }


def score_level_3_attention(kinetic_data: List[Dict[str, float]],
                            submissions: List[Any],
                            start_time_ms: int,
                            mistakes: int) -> Dict[str, float]:
    """
    Score Level 3 (Attention) using Kinetic Hull Breach measurements.
    """
    # Analyze Hull vs Reaction Time
    hull_analysis = analyze_kinetic_hull(kinetic_data, submissions, start_time_ms)
    
    # Hull Breach penalty? 
    # If expansion rate is positive and RT is high -> Tracking failure.
    # If correlation is high (positive) -> RT gets worse as Hull gets bigger (Tunnel vision)
    
    tunnel_vision_risk = hull_analysis.get('hull_rt_correlation', 0.0)
    
    # Base score on mistakes (accuracy)
    # And RT stability
    
    # Simple composite for now
    base_score = max(0, 100 - (mistakes * 10))
    
    # Penalize if tunnel vision detected (correlation > 0.5)
    if tunnel_vision_risk > 0.5:
        base_score -= 20
        
    return {
        'hull_rt_correlation': tunnel_vision_risk,
        'score': float(base_score)
    }


def score_level_6_intersection(detection_time_ms: int,
                               actual_intersection_time_ms: int,
                               threshold_percentage: float,
                               estimated_area: Optional[float] = None,
                               actual_area: Optional[float] = None) -> Dict[str, float]:
    """
    Score Level 6 polygon intersection detection.
    
    Args:
        detection_time_ms: When user pressed detect button
        actual_intersection_time_ms: When intersection actually occurred
        threshold_percentage: Required overlap percentage
        estimated_area: User's area estimate (optional)
        actual_area: Actual intersection area (optional)
        
    Returns:
        {
            'timing_accuracy': 0.0-1.0,
            'area_estimation_error': 0.0-1.0 (if provided),
            'detection_score': 0.0-100.0
        }
    """
    # Timing accuracy: exponential decay based on time difference
    time_diff_ms = abs(detection_time_ms - actual_intersection_time_ms)
    
    # Perfect detection within ±200ms
    # Acceptable within ±1000ms
    # Heavy penalty beyond ±2000ms
    if time_diff_ms <= 200:
        timing_accuracy = 1.0
    elif time_diff_ms <= 1000:
        timing_accuracy = 0.9 - 0.4 * ((time_diff_ms - 200) / 800)
    elif time_diff_ms <= 2000:
        timing_accuracy = 0.5 - 0.3 * ((time_diff_ms - 1000) / 1000)
    else:
        timing_accuracy = max(0.0, 0.2 - 0.2 * ((time_diff_ms - 2000) / 3000))
    
    timing_accuracy = max(0.0, min(1.0, timing_accuracy))
    
    # Area estimation error (if provided)
    area_score = None
    if estimated_area is not None and actual_area is not None and actual_area > 0:
        error_ratio = abs(estimated_area - actual_area) / actual_area
        area_score = max(0.0, 1.0 - error_ratio)
    
    # Composite Score
    # 70% Timing, 30% Area
    if area_score is not None:
        detection_score = (timing_accuracy * 70.0) + (area_score * 30.0)
        return {
            'timing_accuracy': float(timing_accuracy),
            'area_accuracy': float(area_score),
            'detection_score': float(detection_score)
        }
    else:
        detection_score = timing_accuracy * 100.0
        return {
            'timing_accuracy': float(timing_accuracy),
            'detection_score': float(detection_score)
        }

def score_level_4_combined(true_order: List[int], 
                           submissions: List[int],
                           time_taken_ms: int,
                           kinetic_data: List[Dict[str, float]],
                           start_time_ms: int) -> Dict[str, float]:
    """
    Score Level 4 (Combined Attention + Memory).
    """
    # 1. Accuracy (Memory component)
    correct_count = 0
    for i in range(min(len(true_order), len(submissions))):
        if true_order[i] == submissions[i]:
            correct_count += 1
    accuracy = correct_count / len(true_order) if true_order else 0.0
    
    # 2. Attention stability (Hull analysis)
    # Re-use level 3 logic components
    # Map simple submission integers to object with timestamp for analysis?
    # We need timestamps to do hull analysis. The caller passes only indices list?
    # The signature in main.py: score_level_4_combined(true_order, submissions, time, kinetic, start)
    # Submissions passed to valid func usually needs timestamps.
    # Updated main.py calls this with `req.end - req.start` as 3rd arg.
    # Submissions in main.py call is just indices list: `submissions=[s.selected_index...]`
    # We actually need the full submission items to do kinetic analysis properly.
    # FOR NOW: We will assume linear time distribution or skip kinetic if no timestamps.
    # Fallback: Just return accuracy and speed.
    
    hull_metrics = {'hull_rt_correlation': 0.0}
    if kinetic_data:
        # We can't do full correlation without per-click timestamps.
        # But we can check if Hull grew significantly?
        areas = [k['area'] for k in kinetic_data]
        if areas:
            growth = (areas[-1] - areas[0]) / max(0.1, areas[0])
            hull_metrics['hull_growth'] = growth
    
    # Time score
    expected_ms = len(true_order) * 2000 # Slower for combined
    time_score = min(1.0, expected_ms / max(1, time_taken_ms))
    
    score = (accuracy * 60) + (time_score * 30)
    # Penalty for hull distractions
    if hull_metrics.get('hull_growth', 0) > 0.5:
        score -= 10
        
    return {
        'accuracy': float(accuracy),
        'score': float(max(0, min(100, score))),
        'hull_growth': float(hull_metrics.get('hull_growth', 0))
    }

def score_level_7_reconstruction(hausdorff_distance: float,
                                 vertex_order_similarity: float,
                                 shape_similarity: float,
                                 time_taken_ms: int,
                                 expected_vertices: int,
                                 actual_vertices: int,
                                 target_polygon: List[Dict[str, float]],
                                 user_polygon: List[Dict[str, float]],
                                 user_timestamps: List[int]) -> Dict[str, float]:
    """
    Score Level 7 (Reconstruction) using Arkin's Metric and Tremor Analysis.
    """
    
    # 1. Structural Comparison (Arkin's) (if not provided by frontend)
    # Convert dicts to tuples for calc
    t_poly = [(p['x'], p['y']) for p in target_polygon]
    u_poly = [(p['x'], p['y']) for p in user_polygon]
    
    arkin_dissimilarity = calculate_arkin_metric(t_poly, u_poly)
    shape_score = max(0.0, 100.0 * (1.0 - arkin_dissimilarity))
    
    # 2. Motor Control (Tremor/Smoothness)
    # Using simple acceleration variance as "Jerk" proxy
    # We need timestamps for each point to do this properly
    smoothness_score = 100.0
    jerk_metric = 0.0
    if len(user_timestamps) == len(user_polygon):
        jerk_metric = calculate_smoothness_jerk(user_polygon, user_timestamps)
        # Jerk > 100 is "shaky", Jerk < 10 is smooth (heuristic)
        # Normalize: 0-200 range
        smoothness_score = max(0.0, 100.0 - (jerk_metric / 2.0))
        
    # Validation fallback from arguments
    # If shape_similarity was passed (e.g. from frontend logic?), use max
    if shape_similarity > 0:
        shape_score = max(shape_score, shape_similarity * 100.0)
    
    # Composite Score
    # 50% Shape Fidelity (Arkin)
    # 30% Motor Control (Smoothness)
    # 20% Vertex Count Accuracy
    
    vertex_diff = abs(actual_vertices - expected_vertices)
    vertex_score = max(0.0, 100.0 - (vertex_diff * 20))
    
    reconstruction = (
        0.5 * shape_score +
        0.3 * smoothness_score +
        0.2 * vertex_score
    )
    
    return {
        'shape_fidelity_arkin': float(shape_score),
        'motor_smoothness': float(smoothness_score),
        'jerk_metric': float(jerk_metric),
        'vertex_score': float(vertex_score),
        'arkin_dissimilarity': float(arkin_dissimilarity),
        'reconstruction_score': float(reconstruction)
    }
