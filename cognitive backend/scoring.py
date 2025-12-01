"""
Enhanced Scoring System for Cognitive Assessment
Provides domain-specific scoring and composite metrics.

Dependencies:
- numpy
- typing
"""
import numpy as np
from typing import Dict, List, Any, Optional
import math


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
    
    # Detection score
    if area_score is not None:
        detection = (0.7 * timing_accuracy + 0.3 * area_score) * 100.0
    else:
        detection = timing_accuracy * 100.0
    
    result = {
        'timing_accuracy': float(timing_accuracy),
        'detection_score': float(detection)
    }
    
    if area_score is not None:
        result['area_estimation_error'] = float(1.0 - area_score)
        result['area_accuracy'] = float(area_score)
    
    return result


def score_level_7_reconstruction(hausdorff_distance: float,
                                 vertex_order_similarity: float,
                                 shape_similarity: float,
                                 time_taken_ms: int,
                                 expected_vertices: int,
                                 actual_vertices: int) -> Dict[str, float]:
    """
    Score Level 7 memory reconstruction task.
    
    Args:
        hausdorff_distance: Computed Hausdorff distance
        vertex_order_similarity: Vertex sequence match (0-1)
        shape_similarity: Overall shape match (0-1)
        time_taken_ms: Reconstruction time
        expected_vertices: Target polygon vertex count
        actual_vertices: User's polygon vertex count
        
    Returns:
        {
            'shape_score': 0.0-1.0,
            'order_score': 0.0-1.0,
            'vertex_count_score': 0.0-1.0,
            'time_score': 0.0-1.0,
            'reconstruction_score': 0.0-100.0
        }
    """
    # Shape score (inverse of normalized Hausdorff)
    # Typical normalized Hausdorff: 0 to ~1.5
    shape_score = max(0.0, 1.0 - (hausdorff_distance / 1.5))
    
    # Alternative: use provided shape_similarity directly
    if shape_similarity is not None:
        shape_score = max(shape_score, shape_similarity)
    
    # Order score (already normalized 0-1)
    order_score = vertex_order_similarity
    
    # Vertex count accuracy
    vertex_diff = abs(actual_vertices - expected_vertices)
    vertex_count_score = max(0.0, 1.0 - (vertex_diff / max(expected_vertices, 3)))
    
    # Time score (faster = better, but not main factor)
    # Expected: 5-10 seconds per vertex
    expected_time = expected_vertices * 7000  # 7 seconds per vertex
    time_ratio = min(time_taken_ms / expected_time, 3.0)
    time_score = max(0.0, 1.0 - (time_ratio - 1.0) * 0.5)
    time_score = max(0.0, min(1.0, time_score))
    
    # Composite reconstruction score
    reconstruction = (
        0.5 * shape_score +
        0.25 * order_score +
        0.15 * vertex_count_score +
        0.1 * time_score
    ) * 100.0
    
    return {
        'shape_score': float(shape_score),
        'order_score': float(order_score),
        'vertex_count_score': float(vertex_count_score),
        'time_score': float(time_score),
        'reconstruction_score': float(reconstruction)
    }
