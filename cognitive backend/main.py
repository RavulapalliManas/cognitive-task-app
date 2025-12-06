"""
CogniTest Backend
FastAPI application that generates non-crossing polygons for cognitive assessments,
creates partial-label (memory) and attention-modulated tasks, and grades submissions.

Dependencies:
- fastapi
- uvicorn
- numpy
- scipy
- shapely
- pydantic

Install: pip install fastapi uvicorn numpy scipy shapely

This file contains:
1. Pydantic models for requests/responses
2. Polygon generation using Delaunay triangulation + hull-triangle peeling
3. Partial-label generation
4. Attention task metadata generator
5. Scoring functions for accuracy, speed, and attention metrics
6. FastAPI endpoints: /generate_polygon, /generate_partial, /generate_attention, /grade
7. Level 5-7 endpoints for shape recognition, intersection, and reconstruction

Note: This code is written to be clear and readable; some parameters (vertex counts,
random seeds, thresholds) should be tuned empirically.
"""
from typing import List, Optional, Tuple, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import numpy as np
from scipy.spatial import Delaunay
from shapely.geometry import Polygon, Point, LineString
import math
import random
import os

# Import new modules
from geometry_utils import (
    compute_polygon_intersection,
    compute_hausdorff_distance,
    compute_shape_similarity,
    compute_vertex_order_similarity,
    translate_polygon,
    compute_arkin_similarity,
    translate_polygon,
    compute_arkin_similarity,
    compute_tremor_score,
    compute_alpha_metrics,
    generate_maze_corridor,  # Added
    compute_funnel_path      # Added
)
from scoring import (
    score_level_5_recognition,
    score_level_6_intersection,
    score_level_7_reconstruction,
    compute_composite_score,
    analyze_delaunay_lures,
    analyze_kinetic_hull
)


app = FastAPI(title="CogniTest Backend")

# Mount static images
static_dir = os.path.join(os.path.dirname(__file__), "Point approximator", "Images")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Initialize point-cloud manager at startup
POINTCLOUD_DIR = os.path.join(
    os.path.dirname(__file__),
    "Point approximator",
    "Processed_Images"
)

# Startup event removed (Point cloud manager initialized in UseCase)

# -----------------------------
# Pydantic models (schemas)
# -----------------------------
class GenerateRequest(BaseModel):
    level: int = Field(..., ge=1, le=8)
    sublevel: int = Field(..., ge=1, le=5)
    vertex_count: Optional[int] = None
    seed: Optional[int] = None

class PointLabel(BaseModel):
    x: float
    y: float
    label: Optional[str] = None
    index: int

class GenerateResponse(BaseModel):
    points: List[PointLabel]
    true_order: List[int]
    drift_parameters: Optional[Dict[str, Any]] = None
    highlight_schedule: Optional[List[Dict[str, Any]]] = None
    hidden_indices: Optional[List[int]] = None

class PartialGenerateRequest(GenerateRequest):
    label_coverage: float = Field(0.75, ge=0.0, le=1.0)  # fraction of labels shown

class AttentionGenerateRequest(GenerateRequest):
    drift_amplitude: float = 0.01
    drift_frequency: float = 0.5
    highlight_probability: float = 0.1

class SubmissionItem(BaseModel):
    selected_index: int
    timestamp_ms: int

class GradeRequest(BaseModel):
    task_id: Optional[str] = None
    level: int = Field(..., ge=1, le=8) # Added level
    sublevel: int = 1
    true_order: List[int]
    submissions: List[SubmissionItem]
    start_time_ms: int
    end_time_ms: int
    mistakes: Optional[int] = 0
    metadata: Optional[Dict[str, Any]] = None
    points: Optional[List[PointLabel]] = None  # Added for Delaunay Lure Analysis

class GradeResponse(BaseModel):
    accuracy_score: float
    time_score: float
    attention_score: Optional[float] = None
    composite_score: float
    details: Dict[str, Any]

# -----------------------------
# Utility / Geometry functions
# -----------------------------

# Legacy aliases for compatibility if needed, but we will call radial directly
def sample_points_in_box(n: int, bbox: Tuple[float,float,float,float]=(0,0,1,1), seed: Optional[int]=None, min_distance: float=0.08):
    # Robust sampler with minimum distance constraint (Rejection Sampling)
    if seed is not None:
        np.random.seed(seed)
    
    points = []
    x_min, y_min, x_max, y_max = bbox
    # Safety: Try to generate points up to max_attempts per point
    # Scale min_distance slightly if density is high? No, keep it fixed.
    
    for _ in range(n):
        accepted = False
        for attempt in range(100):
            x = np.random.uniform(x_min, x_max)
            y = np.random.uniform(y_min, y_max)
            # Check distance
            if not points:
                points.append([x, y])
                accepted = True
                break
                
            dists = np.sqrt(np.sum((points - np.array([x, y]))**2, axis=1))
            if np.all(dists >= min_distance):
                points.append([x, y])
                accepted = True
                break
        
        if not accepted:
           # Fallback: Just take the last random point if too crowded
           points.append([x, y])
           
    return np.array(points)

def generate_simple_polygon_radial(n_points: int=10, seed: Optional[int]=None, bbox=(0,0,1,1)) -> Tuple[np.ndarray, List[int]]:
    """Fallback: Star-shaped polygon."""
    if seed is not None:
        np.random.seed(seed)
    points = sample_points_in_box(n_points, bbox, seed)
    centroid = np.mean(points, axis=0)
    angles = np.arctan2(points[:, 1] - centroid[1], points[:, 0] - centroid[0])
    sorted_indices = np.argsort(angles)
    return points, list(sorted_indices)

def generate_concave_hull_peeling(n_points: int=12, desired_vertices: int=10, seed: Optional[int]=None, bbox=(0,0,1,1)) -> Tuple[np.ndarray, List[int]]:
    """
    Generate a simple (non-crossing) polygon by peeling boundary triangles from a Delaunay mesh.
    
    Algorithm:
    1. Generate n_points random points.
    2. Compute Delaunay Triangulation (Convex Hull).
    3. Identify boundary edges of the mesh.
    4. Iteratively remove a triangle if it has exactly ONE edge on the boundary.
       (Removing such a triangle exposes 2 inner edges, creating a "dent" but preserving topology).
    5. Stop when boundary has 'desired_vertices' count or no removable triangles exist.
    """
    if seed is not None:
        np.random.seed(seed)
    
    # 1. Generate points (oversample slightly to allow peeling)
    # We need enough internal points to peel into
    pts = sample_points_in_box(n_points, bbox=bbox, seed=seed)
    
    # 2. Delaunay
    try:
        tri = Delaunay(pts)
    except Exception:
        # Fallback for collinear or insufficient points
        return generate_simple_polygon_radial(n_points=desired_vertices, seed=seed, bbox=bbox)
        
    simplices = tri.simplices.copy() # (M, 3) array of triangle indices
    active_mask = np.ones(len(simplices), dtype=bool)
    
    def get_boundary_edges(current_simplices):
        # Count edge occurrences. Boundary edges appear exactly once.
        # Edges are tuples of sorted indices (a,b)
        edges = {}
        for s in current_simplices:
            # s is [a, b, c]
            for i in range(3):
                e = tuple(sorted((s[i], s[(i+1)%3])))
                edges[e] = edges.get(e, 0) + 1
        return {e for e, count in edges.items() if count == 1}

    # 3. Peeling Loop
    current_boundary_len = 0
    max_iter = len(simplices) * 2
    
    for _ in range(max_iter):
        active_tris = simplices[active_mask]
        if len(active_tris) == 0:
            break
            
        boundary_edges = get_boundary_edges(active_tris)
        current_boundary_len = len(boundary_edges)
        
        # Stop condition: reached desired complexity (approx)
        if current_boundary_len >= desired_vertices:
            break
            
        # Find removable triangles
        # A triangle is removable if it has exactly 1 edge in the boundary set
        candidates = []
        for idx in np.where(active_mask)[0]:
            tri = simplices[idx]
            b_count = 0
            for i in range(3):
                e = tuple(sorted((tri[i], tri[(i+1)%3])))
                if e in boundary_edges:
                    b_count += 1
            if b_count == 1:
                candidates.append(idx)
        
        if not candidates:
            break
            
        # Pick random candidate to remove
        # We prefer candidates that DON'T disconnect the mesh (though 1-edge constraint usually ensures this)
        # For simplicity, just pick one.
        to_remove = candidates[np.random.randint(len(candidates))]
        active_mask[to_remove] = False
        
    # 4. Extract Final Boundary Logic
    final_tris = simplices[active_mask]
    if len(final_tris) == 0:
        # Fallback
        return generate_simple_polygon_radial(n_points=desired_vertices, seed=seed, bbox=bbox)
        
    final_boundary_edges = get_boundary_edges(final_tris)
    if not final_boundary_edges:
         return generate_simple_polygon_radial(n_points=desired_vertices, seed=seed, bbox=bbox)

    # Chain edges
    adj = {}
    for u, v in final_boundary_edges:
        adj.setdefault(u, []).append(v)
        adj.setdefault(v, []).append(u)
        
    # Traverse
    start_node = next(iter(adj))
    path = [start_node]
    prev = None
    curr = start_node
    
    # Safety loop
    for _ in range(len(pts) * 2):
        neighbors = adj[curr]
        # Find next neighbor that isn't prev
        next_node = None
        for n in neighbors:
            if n != prev:
                next_node = n
                break
        
        if next_node is None or next_node == start_node:
            break
            
        path.append(next_node)
        prev = curr
        curr = next_node
        
    return pts, path

# Maintain compatibility
def generate_simple_polygon_by_peeling(n_points: int=12, desired_vertices: int=10, seed: Optional[int]=None, bbox=(0,0,1,1)) -> Tuple[np.ndarray, List[int]]:
    # Use our new robust implementation
    return generate_concave_hull_peeling(n_points, desired_vertices, seed, bbox)

# Label utilities

def make_labels(n: int, scheme: str = 'numeric') -> List[str]:
    labels = []
    if scheme == 'numeric':
        labels = [str(i+1) for i in range(n)]
    elif scheme == 'alpha':
        labels = [chr(ord('A')+i) for i in range(n)]
    elif scheme == 'alternating':
        # produce alternating numeric and alphabetic labels
        nums = [str(i+1) for i in range(math.ceil(n/2))]
        alps = [chr(ord('A')+i) for i in range(n//2)]
        labels = []
        for i in range(n):
            if i % 2 == 0:
                labels.append(nums[i//2])
            else:
                labels.append(alps[i//2])
    else:
        labels = [str(i+1) for i in range(n)]
    return labels

# -----------------------------
# Endpoint implementations
# -----------------------------
@app.post('/generate_polygon', response_model=GenerateResponse)
def generate_polygon(req: GenerateRequest):
    """Generate a non-crossing polygon and return ordered boundary and labels."""
    print(f"DEBUG: Generating polygon Level {req.level}, Sublevel {req.sublevel}")
    seed = req.seed if req.seed is not None else random.randint(0, 2**30)
    # Map difficulty to vertex counts if not provided
    vc_map = {
        (1,1): 6, (1,2): 8, (1,3): 10,
        (2,1): 8, (2,2): 10, (2,3): 12,
        (3,1): 10, (3,2): 12, (3,3): 14,
        (4,1): 10, (4,2): 12, (4,3): 14,
        (5,1): 12, (5,2): 14, (5,3): 16,
        (6,1): 14, (6,2): 16, (6,3): 18,
        (7,1): 16, (7,2): 18, (7,3): 20,
    }
    desired = vc_map.get((req.level, req.sublevel), 10)
    
    # Logic to prevent massive point clouds if vertex_count is missing or weird
    safe_vertex_count = req.vertex_count if req.vertex_count and req.vertex_count < 50 else None
    
    # Peeling needs extra points, but let's cap it
    base = safe_vertex_count or desired
    # Ensure npoints isn't crazy
    npoints = base + 8
    
    print(f"DEBUG: generate_polygon -- Desired: {base}, Generating {npoints} candidates")
    
    pts, boundary = generate_simple_polygon_by_peeling(npoints, desired, seed=seed)
    if boundary is None or len(boundary) < 3:
        raise HTTPException(status_code=500, detail="Failed to generate polygon")
    # order points as per boundary
    ordered_indices = boundary
    labelscheme = 'numeric' if req.sublevel == 1 else ('alpha' if req.sublevel==2 else 'alternating')
    labels = make_labels(len(ordered_indices), labelscheme)
    point_labels = []
    for i, idx in enumerate(ordered_indices):
        x,y = float(pts[idx,0]), float(pts[idx,1])
        point_labels.append(PointLabel(x=x,y=y,label=labels[i],index=int(idx)))
    return GenerateResponse(points=point_labels, true_order=[int(i) for i in ordered_indices])

@app.post('/generate_partial', response_model=GenerateResponse)
def generate_partial(req: PartialGenerateRequest):
    # create base polygon
    base_req = GenerateRequest(level=req.level, sublevel=req.sublevel, vertex_count=req.vertex_count, seed=req.seed)
    base = generate_polygon(base_req)
    # mask labels according to coverage
    n = len(base.points)
    mask_count = int(math.floor(n * req.label_coverage))
    # indices to SHOW (mask_count is confusing name in original code, it was used as show_count)
    # Actually req.label_coverage is "fraction of labels shown". So 0.75 means 75% shown.
    show_count = int(math.floor(n * req.label_coverage))
    show_indices = set(random.sample(range(n), show_count))
    
    hidden_indices = [i for i in range(n) if i not in show_indices]
    
    # Return FULL points (with labels) so frontend can show preview
    points_with_labels = []
    for i,p in enumerate(base.points):
        # p.label is already set by generate_polygon
        points_with_labels.append(p)
        
    return GenerateResponse(points=points_with_labels, true_order=base.true_order, hidden_indices=hidden_indices)

@app.post('/generate_attention', response_model=GenerateResponse)
def generate_attention(req: AttentionGenerateRequest):
    base_req = GenerateRequest(level=req.level, sublevel=req.sublevel, vertex_count=req.vertex_count, seed=req.seed)
    base = generate_polygon(base_req)
    # build drift and highlight schedule
    # Select specific indices to drift based on sublevel
    # Sublevel 1: 1 point, Sublevel 2: 2 points, Sublevel 3: 3 points
    num_drifting = req.sublevel
    n_points = len(base.points)
    drifting_indices = random.sample(range(n_points), min(num_drifting, n_points))

    print(f"DEBUG: Attention Level {req.level} Sub {req.sublevel} -> Drifting {num_drifting} points: {drifting_indices}")

    drift = {
        'amplitude': req.drift_amplitude,
        'frequency': req.drift_frequency,
        'driftingIndices': drifting_indices
    }
    # highlight schedule: list of events per point
    highlight = []
    for i,_ in enumerate(base.points):
        if random.random() < req.highlight_probability:
            highlight.append({
                'index': i,
                'start_ms': random.randint(200, 2000),
                'duration_ms': random.randint(200, 800),
                'type': random.choice(['pulse_in', 'pulse_out'])
            })
    return GenerateResponse(points=base.points, true_order=base.true_order, drift_parameters=drift, highlight_schedule=highlight)

# -----------------------------
# Scoring functions
# -----------------------------

def score_accuracy(true_order: List[int], submissions: List[int]) -> float:
    # Simple accuracy: longest prefix match normalized
    n = len(true_order)
    correct = 0
    for t,s in zip(true_order, submissions):
        if t == s:
            correct += 1
        else:
            break
    return correct / n


def score_time(start_ms: int, end_ms: int, expected_ms: Optional[int]=None) -> float:
    duration = max(1, end_ms - start_ms)
    if expected_ms is None:
        # set expected per-node baseline 1500ms * n
        expected_ms = duration
    # faster than expected maps to higher score; use logistic
    ratio = duration / expected_ms
    # clamp
    ratio = min(max(ratio, 0.25), 4.0)
    score = 1.0 / ratio
    return float(score)


def score_attention(mistakes: int, misclicks: int, total_clicks: int) -> float:
    # attention score penalizes misclicks and mistakes; normalized to [0,1]
    if total_clicks <= 0:
        return 1.0
    penalty = (mistakes * 2.0 + misclicks * 1.0) / max(1, total_clicks)
    raw = max(0.0, 1.0 - penalty)
    return float(raw)

@app.post('/grade', response_model=GradeResponse)
def grade(req: GradeRequest):
    true_order = req.true_order
    submissions = [s.selected_index for s in req.submissions]
    timestamps = [s.timestamp_ms for s in req.submissions]
    if len(submissions) == 0:
        raise HTTPException(status_code=400, detail='No submissions')
    # Enhanced Grading per Level
    details = {
        'n_targets': len(true_order),
        'n_submissions': len(submissions),
        'mistakes_reported': req.mistakes,
        'misclicks': 0,
    }
    
    # Base scores
    composite_norm = 0.0
    
    if req.level == 1:
        # Level 1: Star TMT (PEI + Lures)
        from scoring import score_level_1_tmt
        pts_dict = [{'x': p.x, 'y': p.y, 'index': p.index} for p in (req.points or [])]
        l1_scores = score_level_1_tmt(pts_dict, submissions, true_order, req.end_time_ms - req.start_time_ms)
        composite_norm = l1_scores['score']
        details.update(l1_scores)
        
    elif req.level == 2:
        # Level 2: Memory (Spatial Precision)
        from scoring import score_level_2_memory
        pts_dict = [{'x': p.x, 'y': p.y, 'index': p.index} for p in (req.points or [])]
        l2_scores = score_level_2_memory(true_order, submissions, pts_dict)
        composite_norm = l2_scores['score']
        details.update(l2_scores)
        
    elif req.level == 3:
        # Level 3: Attention (Hull)
        from scoring import score_level_3_attention
        kinetic_data = req.metadata.get('kinetic_data', []) if req.metadata else []
        l3_scores = score_level_3_attention(kinetic_data, req.submissions, req.start_time_ms, req.mistakes or 0)
        composite_norm = l3_scores['score']
        details.update(l3_scores)
        
    elif req.level == 4:
        # Level 4: Combined (Dual Task)
        from scoring import score_level_4_combined
        kinetic_data = req.metadata.get('kinetic_data', []) if req.metadata else []
        l4_scores = score_level_4_combined(true_order, submissions, req.end_time_ms - req.start_time_ms, kinetic_data, req.start_time_ms)
        composite_norm = l4_scores['score']
        details.update(l4_scores)
        
    else:
        # Generic scoring (Fallback or other levels handled elsewhere)
        acc = score_accuracy(true_order, submissions)
        expected_ms = 1500 * len(true_order)
        time_sc = score_time(req.start_time_ms, req.end_time_ms, expected_ms=expected_ms)
        att = score_attention(req.mistakes or 0, misclicks, total_clicks)
        
        w_acc, w_time, w_att = 0.5, 0.3, 0.2
        composite = (max(1e-6, acc) ** w_acc) * (max(1e-6, time_sc) ** w_time) * (max(1e-6, att) ** w_att)
        composite_norm = float(composite ** (1.0/(w_acc+w_time+w_att)) * 100.0)
        
        if req.points and len(req.points) > 3:
             pts_dict = [{'x': p.x, 'y': p.y, 'index': p.index} for p in req.points]
             lure_analysis = analyze_delaunay_lures(pts_dict, true_order, submissions)
             details.update(lure_analysis)

    return GradeResponse(accuracy_score=acc if req.level not in [1,2,3,4] else 0.0, 
                         time_score=time_sc if req.level not in [1,2,3,4] else 0.0,
                         attention_score=att if req.level not in [1,2,3,4] else 0.0,
                         composite_score=composite_norm, 
                         details=details)


# =====================================================
# LEVEL 5: SHAPE RECOGNITION ENDPOINTS
# =====================================================

class Level5Shape(BaseModel):
    name: str
    label: str
    points: List[Dict[str, float]]
    is_target: bool

class Level5GenerateRequest(BaseModel):
    level: int = Field(5, ge=5, le=5)
    sublevel: int = Field(..., ge=1, le=5)
    seed: Optional[int] = None

class Level5GenerateResponse(BaseModel):
    shapes: List[Level5Shape]
    target_index: int
    target_name: str
    target_image_url: str
    point_density: float
    time_limit_seconds: int

class Level5GradeRequest(BaseModel):
    target_index: int
    selected_index: int
    reaction_time_ms: int
    confidence_rating: int = Field(..., ge=1, le=5)
    time_limit_ms: int = 60000

class Level5GradeResponse(BaseModel):
    correctness: float
    time_score: float
    confidence_score: float
    recognition_score: float
    correct: bool

from level5_manager import Level5Manager

# Global instance
_level5_manager = None
def get_level5_manager():
    global _level5_manager
    if _level5_manager is None:
        _level5_manager = Level5Manager(POINTCLOUD_DIR)
    return _level5_manager

@app.post('/generate_level_5', response_model=Level5GenerateResponse)
def generate_level_5(req: Level5GenerateRequest):
    """Generate shape recognition task for Level 5 using real JSON point clouds."""
    try:
        manager = get_level5_manager()
        
        # Generate task
        # Easy: 2 distractors, Hard: 3 distractors
        num_distractors = 2 if req.sublevel == 1 else 3
        
        task = manager.get_task(num_distractors=num_distractors, seed=req.seed)
        
        target_idx = task['target_index']
        shapes_data = task['shapes']
        
        # Convert to response model
        shapes = []
        for i, s in enumerate(shapes_data):
            shapes.append(Level5Shape(
                name=s['name'],
                label=s['name'], # Use name as label
                points=s['points'],
                is_target=(i == target_idx)
            ))
        
        return Level5GenerateResponse(
            shapes=shapes,
            target_index=target_idx,
            target_name=task['target_name'],
            target_image_url=f"/static/{task['target_name']}.png",
            point_density=0.5, # Placeholder or calc
            time_limit_seconds=30
        )
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate Level 5: {str(e)}")


@app.post('/grade_level_5', response_model=Level5GradeResponse)
def grade_level_5(req: Level5GradeRequest):
    """Grade Level 5 shape recognition submission."""
    # correct = req.selected_index == req.target_index
    # Note: Frontend sends selected_index which corresponds to the shapes list index
    correct = (req.selected_index == req.target_index)
    
    scores = score_level_5_recognition(
        correct=correct,
        reaction_time_ms=req.reaction_time_ms,
        confidence_rating=req.confidence_rating,
        time_limit_ms=req.time_limit_ms
    )
    
    return Level5GradeResponse(
        correctness=scores['correctness'],
        time_score=scores['time_score'],
        confidence_score=scores['confidence_score'],
        recognition_score=scores['recognition_score'],
        correct=correct
    )


# =====================================================
# LEVEL 6: POLYGON INTERSECTION ENDPOINTS
# =====================================================

class PolygonData(BaseModel):
    points: List[Dict[str, float]]
    velocity: Dict[str, float]  # {dx, dy} per frame

class Level6GenerateRequest(BaseModel):
    level: int = Field(6, ge=6, le=6)
    sublevel: int = Field(..., ge=1, le=5)
    seed: Optional[int] = None

class Level6GenerateResponse(BaseModel):
    polygon_a: PolygonData
    polygon_b: PolygonData
    threshold_percentage: float
    animation_duration_ms: int
    speed_multiplier: float

class IntersectionComputeRequest(BaseModel):
    polygon_a: List[Dict[str, float]]
    polygon_b: List[Dict[str, float]]

class IntersectionComputeResponse(BaseModel):
    intersection_area: float
    polygon_a_area: float
    polygon_b_area: float
    intersection_percentage: float
    intersection_polygon: Optional[List[Dict[str, float]]] = None

class Level6GradeRequest(BaseModel):
    detection_time_ms: int
    actual_intersection_time_ms: int
    threshold_percentage: float
    estimated_area: Optional[float] = None
    actual_area: Optional[float] = None

class Level6GradeResponse(BaseModel):
    timing_accuracy: float
    detection_score: float
    area_accuracy: Optional[float] = None
    composite_score: float
    feedback: Optional[str] = None

@app.post('/generate_level_6', response_model=Level6GenerateResponse)
def generate_level_6(req: Level6GenerateRequest):
    """Generate polygon intersection task for Level 6."""
    seed = req.seed if req.seed is not None else random.randint(0, 2**30)
    
    # Difficulty parameters
    difficulty_map = {
        1: {'vertices': 6, 'speed': 0.0005, 'threshold': 20.0, 'duration': 10000},
        2: {'vertices': 8, 'speed': 0.0008, 'threshold': 18.0, 'duration': 9000},
        3: {'vertices': 8, 'speed': 0.001, 'threshold': 15.0, 'duration': 8000},
        4: {'vertices': 10, 'speed': 0.0013, 'threshold': 12.0, 'duration': 7000},
        5: {'vertices': 10, 'speed': 0.0015, 'threshold': 10.0, 'duration': 6000}
    }
    
    params = difficulty_map.get(req.sublevel, difficulty_map[3])
    
    # Generate two polygons using existing polygon generator
    base_req = GenerateRequest(level=req.level, sublevel=req.sublevel, 
                               vertex_count=params['vertices'], seed=seed)
    poly_a_data = generate_polygon(base_req)
    
    # Generate second polygon with different seed
    base_req2 = GenerateRequest(level=req.level, sublevel=req.sublevel,
                                vertex_count=params['vertices'], seed=seed + 1000)
    poly_b_data = generate_polygon(base_req2)
    
    # Convert to coordinate format
    poly_a_points = [{'x': p.x, 'y': p.y} for p in poly_a_data.points]
    poly_b_points = [{'x': p.x, 'y': p.y} for p in poly_b_data.points]
    
    # Offset polygon B to start separated
    poly_b_points = translate_polygon(poly_b_points, 0.5, 0.3)
    
    # Define movement vectors (polygons will move toward each other)
    velocity_a = {'dx': params['speed'], 'dy': params['speed'] * 0.5}
    velocity_b = {'dx': -params['speed'], 'dy': -params['speed'] * 0.5}
    
    return Level6GenerateResponse(
        polygon_a=PolygonData(points=poly_a_points, velocity=velocity_a),
        polygon_b=PolygonData(points=poly_b_points, velocity=velocity_b),
        threshold_percentage=params['threshold'],
        animation_duration_ms=params['duration'],
        speed_multiplier=params['speed']
    )


@app.post('/compute_intersection', response_model=IntersectionComputeResponse)
def compute_intersection(req: IntersectionComputeRequest):
    """Compute intersection between two polygons."""
    result = compute_polygon_intersection(req.polygon_a, req.polygon_b)
    
    return IntersectionComputeResponse(
        intersection_area=result['intersection_area'],
        polygon_a_area=result['polygon_a_area'],
        polygon_b_area=result['polygon_b_area'],
        intersection_percentage=result['intersection_percentage'],
        intersection_polygon=result.get('intersection_polygon')
    )


class Level6GradeRequest(BaseModel):
    # Common
    detection_time_ms: float
    threshold_percentage: float
    
    # Detection Mode (Level 5)
    actual_intersection_time_ms: Optional[float] = None
    estimated_area: Optional[float] = None
    actual_area: Optional[float] = None
    
    # Drawing Mode (Level 6)
    user_drawn_polygon: Optional[List[Dict[str, float]]] = None
    actual_intersection_polygon: Optional[List[Dict[str, float]]] = None

@app.post('/grade_level_6', response_model=Level6GradeResponse)
def grade_level_6(req: Level6GradeRequest):
    """Grade Level 6 (Intersection) - Supports Detection or Drawing."""
    
    # Mode 2: Drawing (Level 6)
    if req.user_drawn_polygon and req.actual_intersection_polygon:
        iou_score = compute_shape_similarity(req.user_drawn_polygon, req.actual_intersection_polygon)
        time_score = max(0.0, 1.0 - (req.detection_time_ms / 15000.0))
        final_score = (iou_score * 70.0) + (time_score * 30.0)
        
        return Level6GradeResponse(
            timing_accuracy=time_score,
            detection_score=1.0, # Assumed valid
            area_accuracy=iou_score,
            composite_score=final_score,
            feedback=f"Intersection Match: {int(iou_score*100)}%"
        )

    # Mode 1: Detection (Level 5)
    # Default to original logic if not drawing
    scores = score_level_6_intersection(
        detection_time_ms=req.detection_time_ms,
        actual_intersection_time_ms=req.actual_intersection_time_ms or 0,
        threshold_percentage=req.threshold_percentage,
        estimated_area=req.estimated_area or 0,
        actual_area=req.actual_area or 0
    )
    
    return Level6GradeResponse(
        timing_accuracy=scores['timing_accuracy'],
        detection_score=scores['detection_score'],
        area_accuracy=scores.get('area_accuracy', 0.0),
        composite_score=scores.get('detection_score', 0.0) * 100, # Approximate scaling
        feedback="Detection recorded."
    )


# =====================================================
# LEVEL 7: MEMORY RECONSTRUCTION ENDPOINTS
# =====================================================

class Level7GenerateRequest(BaseModel):
    level: int = Field(7, ge=7, le=7)
    sublevel: int = Field(..., ge=1, le=5)
    seed: Optional[int] = None

class Level7GenerateResponse(BaseModel):
    path: List[Dict[str, float]]
    left_wall: List[Dict[str, float]]
    right_wall: List[Dict[str, float]]
    display_time_ms: int

class Level7GradeRequest(BaseModel):
    user_path: List[Dict[str, float]]
    maze_path: List[Dict[str, float]] # Centerline
    time_taken_ms: int
    user_timestamps: Optional[List[int]] = None

class Level7GradeResponse(BaseModel):
    hausdorff_distance: float
    shape_similarity: float
    vertex_order_similarity: float
    shape_score: float
    order_score: float
    vertex_count_score: float
    time_score: float
    reconstruction_score: float
    arkin_similarity: float
    tremor_score: float
    critical_alpha: float
    alpha_area: float

@app.post('/generate_level_7', response_model=Level7GenerateResponse)
def generate_level_7(req: Level7GenerateRequest):
    """Generate Maze Tracing task for Level 7."""
    params = {
        1: {'segments': 8, 'width': 0.15},
        2: {'segments': 10, 'width': 0.12},
        3: {'segments': 12, 'width': 0.10},
        4: {'segments': 15, 'width': 0.08},
        5: {'segments': 18, 'width': 0.06}
    }.get(req.sublevel, {'segments': 10, 'width': 0.10})
    
    maze = generate_maze_corridor(segments=params['segments'], width=params['width'])
    
    return Level7GenerateResponse(
        path=maze['path'],
        left_wall=maze['left_wall'],
        right_wall=maze['right_wall'],
        display_time_ms=0 # Not memory based anymore, direct tracing
    )


@app.post('/grade_level_7', response_model=Level7GradeResponse)
def grade_level_7(req: Level7GradeRequest):
    """Grade Level 7 Maze Tracing submission."""
    # Score based on how close user_path is to maze_path (Hausdorff)
    # And smoothness (Tremor)
    
    # Logic: 
    # 1. Path Adherence (Hausdorff)
    user_pts = req.user_path
    maze_pts = req.maze_path
    
    # 2. Convert to list of dicts for utils (already are)
    hausdorff = compute_hausdorff_distance(user_pts, maze_pts)
    
    # 3. Path Completion (Did they reach the end?)
    # Check start and end proximity
    start_ok = compute_hausdorff_distance([user_pts[0]], [maze_pts[0]]) < 0.1
    end_ok = compute_hausdorff_distance([user_pts[-1]], [maze_pts[-1]]) < 0.1
    completion_score = 100.0 if (start_ok and end_ok) else 0.0
    
    # 4. Smoothness/Tremor
    tremor = compute_tremor_score(user_pts)
    tremor_score = max(0.0, 100.0 * (1.0 - tremor * 5.0)) # Scaling factor
    
    # 5. Composite Score
    # Hausdorff normalized: < 0.05 is good.
    adherence_score = max(0.0, 100.0 * (1.0 - hausdorff * 10.0))
    
    final_score = 0.5 * adherence_score + 0.3 * tremor_score + 0.2 * completion_score
    
    return Level7GradeResponse(
        hausdorff_distance=hausdorff,
        shape_similarity=adherence_score / 100.0,
        vertex_order_similarity=1.0, # Not applicable
        shape_score=adherence_score,
        order_score=100.0,
        vertex_count_score=completion_score,
        time_score=0.0, # Could be improved based on speed
        reconstruction_score=final_score,
        arkin_similarity=0.0,
        tremor_score=tremor_score,
        critical_alpha=0.0,
        alpha_area=0.0
    )


# -----------------------------------------------------------------------------
# Level 8: Navigation (Maze / Funnel)
# -----------------------------------------------------------------------------

class Level8GenerateRequest(BaseModel):
    difficulty: int = 1 # 1=Easy (Wide, short), 5=Hard (Narrow, long)

class Level8GenerateResponse(BaseModel):
    left_wall: List[PointLabel]
    right_wall: List[PointLabel]
    start_point: PointLabel
    end_point: PointLabel
    optimal_path: List[PointLabel] # For reference/display if needed

class Level8GradeRequest(BaseModel):
    user_path: List[PointLabel] # Sampled points from drag
    optimal_path: List[PointLabel]
    time_taken_ms: float
    wall_collisions: int

class Level8GradeResponse(BaseModel):
    path_efficiency: float # user_length / optimal_length
    deviation_score: float # Average distance from optimal path
    time_score: float
    collision_score: float
    composite_score: float

@app.post('/generate_level_8', response_model=Level8GenerateResponse)
def generate_level_8(req: Level8GenerateRequest):
    # Map difficulty to maze params
    segments = 10 + (req.difficulty * 4)
    width = max(0.05, 0.2 - (req.difficulty * 0.03))
    
    maze = generate_maze_corridor(segments=segments, width=width)
    
    start = maze['path'][0]
    end = maze['path'][-1]
    
    # Compute optimal path (funnel/centerline)
    opt_path_pts = compute_funnel_path(
        start, end, maze['left_wall'], maze['right_wall']
    )
    
    # Convert to PointLabel models
    def to_pl(pts, base_idx=0):
        return [PointLabel(x=p['x'], y=p['y'], index=i+base_idx) for i, p in enumerate(pts)]
        
    return Level8GenerateResponse(
        left_wall=to_pl(maze['left_wall']),
        right_wall=to_pl(maze['right_wall'], 1000),
        start_point=PointLabel(x=start['x'], y=start['y'], index=0),
        end_point=PointLabel(x=end['x'], y=end['y'], index=999),
        optimal_path=to_pl(opt_path_pts, 2000)
    )

@app.post('/grade_level_8', response_model=Level8GradeResponse)
def grade_level_8(req: Level8GradeRequest):
    # Length efficiency
    def path_len(pts):
        l = 0
        for i in range(len(pts)-1):
            dx = pts[i+1].x - pts[i].x
            dy = pts[i+1].y - pts[i].y
            l += math.sqrt(dx*dx + dy*dy)
        return l
        
    user_len = path_len(req.user_path)
    opt_len = path_len(req.optimal_path)
    
    efficiency = opt_len / user_len if user_len > 0 else 0.0
    efficiency = min(1.0, efficiency)
    
    # Deviation (Hausdorff or simple average)
    # Let's use Discrete Frechet would be better, but simplified:
    # Average min distance from user point to any point on optimal path
    # (Simplified Hausdorff One-Way)
    distances = []
    # Sample linear optimal path
    opt_line = [(p.x, p.y) for p in req.optimal_path]
    
    from scipy.spatial import KDTree
    if len(opt_line) > 0 and len(req.user_path) > 0:
        tree = KDTree(opt_line)
        user_pts = [(p.x, p.y) for p in req.user_path]
        dists, _ = tree.query(user_pts)
        avg_dev = np.mean(dists)
    else:
        avg_dev = 1.0 # Max deviation
        
    # Scores
    dev_score = max(0.0, 1.0 - (avg_dev * 5.0)) # Scaling factor
    
    coll_score = max(0.0, 1.0 - (req.wall_collisions * 0.1))
    
    time_limit = 20000 # 20s
    time_score = max(0.0, 1.0 - (req.time_taken_ms / time_limit))
    
    composite = (efficiency * 0.3) + (dev_score * 0.3) + (coll_score * 0.2) + (time_score * 0.2)
    
    return Level8GradeResponse(
        path_efficiency=efficiency,
        deviation_score=dev_score,
        time_score=time_score,
        collision_score=coll_score,
        composite_score=composite
    )


# =====================================================
# COMPOSITE SCORING ENDPOINT
# =====================================================

class CompositeScoreRequest(BaseModel):
    all_level_results: List[Dict[str, Any]]

class CognitiveProfile(BaseModel):
    memory: float
    attention: float
    visuospatial: float
    recognition: float

class CompositeScoreResponse(BaseModel):
    composite_score: float
    cognitive_profile: CognitiveProfile
    domain_breakdown: Dict[str, Any]

@app.post('/compute_composite_score', response_model=CompositeScoreResponse)
def compute_composite_score_endpoint(req: CompositeScoreRequest):
    """Compute overall composite score and cognitive profile."""
    result = compute_composite_score(req.all_level_results)
    
    return CompositeScoreResponse(
        composite_score=result['composite_score'],
        cognitive_profile=CognitiveProfile(**result['cognitive_profile']),
        domain_breakdown=result['domain_breakdown']
    )


from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# If run directly: uvicorn cognitest_backend:app --reload

