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
    translate_polygon
)
from pointcloud_manager import initialize_point_cloud_manager, get_point_cloud_manager
from scoring import (
    score_level_5_recognition,
    score_level_6_intersection,
    score_level_7_reconstruction,
    compute_composite_score
)

app = FastAPI(title="CogniTest Backend")

# Initialize point-cloud manager at startup
POINTCLOUD_DIR = os.path.join(
    os.path.dirname(__file__),
    "Point approximator",
    "Processed_Images"
)

@app.on_event("startup")
def startup_event():
    """Initialize point-cloud manager on server startup."""
    try:
        initialize_point_cloud_manager(POINTCLOUD_DIR)
        print("Point-cloud manager initialized successfully")
    except Exception as e:
        print(f"Warning: Failed to initialize point-cloud manager: {e}")

# -----------------------------
# Pydantic models (schemas)
# -----------------------------
class GenerateRequest(BaseModel):
    level: int = Field(..., ge=1, le=7)
    sublevel: int = Field(..., ge=1, le=3)
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
    true_order: List[int]
    submissions: List[SubmissionItem]
    start_time_ms: int
    end_time_ms: int
    mistakes: Optional[int] = 0
    metadata: Optional[Dict[str, Any]] = None

class GradeResponse(BaseModel):
    accuracy_score: float
    time_score: float
    attention_score: Optional[float] = None
    composite_score: float
    details: Dict[str, Any]

# -----------------------------
# Utility / Geometry functions
# -----------------------------

def sample_points_in_box(n: int, bbox: Tuple[float,float,float,float]=(0,0,1,1), seed: Optional[int]=None, min_distance: float=0.08):
    """Sample points with minimum distance constraint to prevent overlapping"""
    if seed is not None:
        np.random.seed(seed)
    (x0,y0,x1,y1) = bbox
    
    points = []
    max_attempts = n * 100  # Prevent infinite loop
    attempts = 0
    
    while len(points) < n and attempts < max_attempts:
        x = np.random.uniform(x0, x1)
        y = np.random.uniform(y0, y1)
        new_point = np.array([x, y])
        
        # Check distance to all existing points
        if len(points) == 0:
            points.append(new_point)
        else:
            distances = np.sqrt(np.sum((np.array(points) - new_point)**2, axis=1))
            if np.all(distances >= min_distance):
                points.append(new_point)
        
        attempts += 1
    
    # If we couldn't generate enough points with min_distance, relax it
    if len(points) < n:
        remaining = n - len(points)
        # Try one more time with smaller distance
        attempts = 0
        while len(points) < n and attempts < 50:
             x = np.random.uniform(x0, x1)
             y = np.random.uniform(y0, y1)
             new_p = np.array([x,y])
             # minimal check
             dists = np.sqrt(np.sum((np.array(points) - new_p)**2, axis=1))
             if np.all(dists >= min_distance * 0.1): # significantly relaxed
                 points.append(new_p)
             attempts += 1
             
        # Hard fallback: Grid or random without check ensuring unique coords
        if len(points) < n:
             remaining = n - len(points)
             # Add tiny jitters to ensure uniqueness
             for _ in range(remaining):
                 rx = np.random.uniform(x0, x1)
                 ry = np.random.uniform(y0, y1)
                 # Ensure slight offset if it matches any existing
                 while any(np.linalg.norm(p - np.array([rx,ry])) < 1e-5 for p in points):
                      rx = np.random.uniform(x0, x1)
                 points.append(np.array([rx, ry]))
    
    return np.array(points)


def convex_hull_indices(points: np.ndarray):
    poly = Polygon(points).convex_hull
    hull_coords = list(poly.exterior.coords)[:-1]
    # find indices of hull coords approximately
    idxs = []
    for hc in hull_coords:
        # find nearest point index
        d = np.sum((points - np.array(hc))**2, axis=1)
        idxs.append(int(np.argmin(d)))
    return idxs


def delaunay_triangles(points: np.ndarray):
    tri = Delaunay(points)
    return tri.simplices  # indices of triangles


def triangle_adjacent_to_hull(tri_indices: np.ndarray, points: np.ndarray, hull_idx_set: set):
    # Return booleans marking triangles that touch the convex hull
    touches = []
    for tri in tri_indices:
        if any(v in hull_idx_set for v in tri):
            touches.append(True)
        else:
            touches.append(False)
    return np.array(touches)


def boundary_from_triangle_mesh(points: np.ndarray, triangles: np.ndarray) -> Optional[List[int]]:
    # Build edges frequency map; boundary edges occur once
    edges = {}
    for tri in triangles:
        for i in range(3):
            a = int(tri[i])
            b = int(tri[(i+1)%3])
            key = tuple(sorted((a,b)))
            edges[key] = edges.get(key, 0) + 1
    boundary_edges = [e for e,c in edges.items() if c == 1]
    if not boundary_edges:
        return None
    # chain boundary edges into ordered vertices
    adj = {}
    for a,b in boundary_edges:
        adj.setdefault(a, []).append(b)
        adj.setdefault(b, []).append(a)
    # find a start vertex (degree 1) or arbitrary
    start = boundary_edges[0][0]
    ordered = [start]
    prev = None
    cur = start
    safety_counter = 0
    max_iter = len(points) * 2  # Boundary can't be longer than 2x total points roughly

    while safety_counter < max_iter:
        neighs = adj.get(cur)
        if not neighs: 
            break
        
        nxt = neighs[0] if neighs[0] != prev else (neighs[1] if len(neighs)>1 else None)
        if nxt is None or nxt == start:
            break
        ordered.append(nxt)
        prev, cur = cur, nxt
        safety_counter += 1
    
    if safety_counter >= max_iter:
        # Failed to find closed loop or infinite loop detected
        return None
        
    return ordered

# -----------------------------
# Polygon generation algorithm
# -----------------------------

def generate_simple_polygon_by_peeling(n_points: int=12, desired_vertices: int=10, seed: Optional[int]=None, bbox=(0,0,1,1)) -> Tuple[np.ndarray, List[int]]:
    """
    Sample n_points, compute Delaunay triangulation, iteratively remove triangles adjacent to convex hull
    until remaining boundary has approximately desired_vertices vertices. Returns final point array and ordered
    boundary vertex indices (in CCW order). If algorithm fails, tries random reseeding a few times.
    """
    attempts = 0
    max_attempts = 6
    while attempts < max_attempts:
        pts = sample_points_in_box(n_points, bbox=bbox, seed=(seed + attempts) if seed is not None else None)
        try:
            tris = delaunay_triangles(pts)
        except Exception:
            attempts += 1
            continue
        removed = np.zeros(len(tris), dtype=bool)
        hull_idx = set(convex_hull_indices(pts))
        # iterative peel
        for iteration in range(50):
            active_tris = tris[~removed]
            boundary = boundary_from_triangle_mesh(pts, active_tris)
            if boundary is None:
                break
            if abs(len(boundary) - desired_vertices) <= 1:
                return pts, boundary
            # find triangles touching hull of active mesh
            # recompute hull on current active boundary vertices
            active_vertices = set(vertex for tri in active_tris for vertex in tri.flatten())
            current_hull_idx = set()
            try:
                current_hull = Polygon(pts[list(active_vertices)]).convex_hull
                hull_coords = list(current_hull.exterior.coords)[:-1]
                for hc in hull_coords:
                    d = np.sum((pts - np.array(hc))**2, axis=1)
                    current_hull_idx.add(int(np.argmin(d)))
            except Exception:
                current_hull_idx = set(list(active_vertices)[:max(3, len(active_vertices)//4)])
            touches = triangle_adjacent_to_hull(active_tris, pts, current_hull_idx)
            # remove some or all touching triangles
            to_remove = np.where(~removed)[0][touches]
            if len(to_remove) == 0:
                break
            # remove a fraction to control aggressiveness
            k = max(1, int(math.ceil(len(to_remove) * 0.6)))
            chosen = np.random.choice(to_remove, size=k, replace=False)
            removed[chosen] = True
        attempts += 1
    # fallback: return convex hull order
    full_hull = convex_hull_indices(pts)
    return pts, full_hull

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
    npoints = max(desired + 6, req.vertex_count or (desired + 8))
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
    show_indices = set(random.sample(range(n), mask_count))
    new_points = []
    for i,p in enumerate(base.points):
        lab = p.label if i in show_indices else None
        new_points.append(PointLabel(x=p.x,y=p.y,label=lab,index=p.index))
    return GenerateResponse(points=new_points, true_order=base.true_order)

@app.post('/generate_attention', response_model=GenerateResponse)
def generate_attention(req: AttentionGenerateRequest):
    base_req = GenerateRequest(level=req.level, sublevel=req.sublevel, vertex_count=req.vertex_count, seed=req.seed)
    base = generate_polygon(base_req)
    # build drift and highlight schedule
    drift = {
        'amplitude': req.drift_amplitude,
        'frequency': req.drift_frequency
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
    # Accuracy: compare sequence, allow for reorders but penalize
    acc = score_accuracy(true_order, submissions)
    # Time score: relative to expected per-node: 1500ms per node baseline
    expected_ms = 1500 * len(true_order)
    time_sc = score_time(req.start_time_ms, req.end_time_ms, expected_ms=expected_ms)
    # Attention score
    misclicks = req.metadata.get('misclicks', 0) if req.metadata else 0
    total_clicks = req.metadata.get('total_clicks', len(submissions)) if req.metadata else len(submissions)
    att = score_attention(req.mistakes or 0, misclicks, total_clicks)
    # Composite: weighted geometric mean to avoid domination
    w_acc, w_time, w_att = 0.5, 0.3, 0.2
    composite = (max(1e-6, acc) ** w_acc) * (max(1e-6, time_sc) ** w_time) * (max(1e-6, att) ** w_att)
    # Normalize composite into 0..100
    composite_norm = float(composite ** (1.0/(w_acc+w_time+w_att)) * 100.0)
    details = {
        'n_targets': len(true_order),
        'n_submissions': len(submissions),
        'mistakes_reported': req.mistakes,
        'misclicks': misclicks
    }
    return GradeResponse(accuracy_score=acc, time_score=time_sc, attention_score=att, composite_score=composite_norm, details=details)


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

@app.post('/generate_level_5', response_model=Level5GenerateResponse)
def generate_level_5(req: Level5GenerateRequest):
    """Generate shape recognition task for Level 5."""
    try:
        # Lazy-load point cloud manager only when Level 5 is actually used
        manager = get_point_cloud_manager()
        if manager is None:
            # First time loading - initialize it
            initialize_point_cloud_manager(POINTCLOUD_DIR)
            manager = get_point_cloud_manager()
            if manager is None:
                raise HTTPException(status_code=500, detail="Failed to initialize point-cloud manager")
        
        # Get difficulty parameters
        params = manager.get_difficulty_params(req.level, req.sublevel)
        
        # Generate recognition task
        task = manager.generate_recognition_task(
            num_distractors=params['num_distractors'],
            point_density=params['point_density'],
            seed=req.seed
        )
        
        # Convert to response format
        shapes = [
            Level5Shape(
                name=s['name'],
                label=s['label'],
                points=s['points'],
                is_target=s['is_target']
            )
            for s in task['shapes']
        ]
        
        return Level5GenerateResponse(
            shapes=shapes,
            target_index=task['target_index'],
            target_name=task['target_name'],
            point_density=task['point_density'],
            time_limit_seconds=params['time_limit_seconds']
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate Level 5: {str(e)}")


@app.post('/grade_level_5', response_model=Level5GradeResponse)
def grade_level_5(req: Level5GradeRequest):
    """Grade Level 5 shape recognition submission."""
    correct = req.selected_index == req.target_index
    
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


@app.post('/grade_level_6', response_model=Level6GradeResponse)
def grade_level_6(req: Level6GradeRequest):
    """Grade Level 6 intersection detection submission."""
    scores = score_level_6_intersection(
        detection_time_ms=req.detection_time_ms,
        actual_intersection_time_ms=req.actual_intersection_time_ms,
        threshold_percentage=req.threshold_percentage,
        estimated_area=req.estimated_area,
        actual_area=req.actual_area
    )
    
    response = Level6GradeResponse(
        timing_accuracy=scores['timing_accuracy'],
        detection_score=scores['detection_score']
    )
    
    if 'area_accuracy' in scores:
        response.area_accuracy = scores['area_accuracy']
    
    return response


# =====================================================
# LEVEL 7: MEMORY RECONSTRUCTION ENDPOINTS
# =====================================================

class Level7GenerateRequest(BaseModel):
    level: int = Field(7, ge=7, le=7)
    sublevel: int = Field(..., ge=1, le=5)
    seed: Optional[int] = None

class Level7GenerateResponse(BaseModel):
    target_polygon: List[Dict[str, float]]
    display_time_ms: int
    expected_vertices: int

class Level7GradeRequest(BaseModel):
    target_polygon: List[Dict[str, float]]
    user_polygon: List[Dict[str, float]]
    time_taken_ms: int

class Level7GradeResponse(BaseModel):
    hausdorff_distance: float
    shape_similarity: float
    vertex_order_similarity: float
    shape_score: float
    order_score: float
    vertex_count_score: float
    time_score: float
    reconstruction_score: float

@app.post('/generate_level_7', response_model=Level7GenerateResponse)
def generate_level_7(req: Level7GenerateRequest):
    """Generate memory reconstruction task for Level 7."""
    # Difficulty parameters
    difficulty_map = {
        1: {'vertices': 6, 'display_time': 5000},
        2: {'vertices': 7, 'display_time': 4000},
        3: {'vertices': 8, 'display_time': 3500},
        4: {'vertices': 10, 'display_time': 3000},
        5: {'vertices': 12, 'display_time': 3000}
    }
    
    params = difficulty_map.get(req.sublevel, difficulty_map[3])
    
    # Generate polygon
    base_req = GenerateRequest(level=req.level, sublevel=req.sublevel,
                               vertex_count=params['vertices'], seed=req.seed)
    poly_data = generate_polygon(base_req)
    
    # Convert to coordinate format
    target_points = [{'x': p.x, 'y': p.y} for p in poly_data.points]
    
    return Level7GenerateResponse(
        target_polygon=target_points,
        display_time_ms=params['display_time'],
        expected_vertices=len(target_points)
    )


@app.post('/grade_level_7', response_model=Level7GradeResponse)
def grade_level_7(req: Level7GradeRequest):
    """Grade Level 7 memory reconstruction submission."""
    # Compute Hausdorff distance
    hausdorff = compute_hausdorff_distance(req.user_polygon, req.target_polygon)
    
    # Compute shape similarity
    shape_sim = compute_shape_similarity(req.user_polygon, req.target_polygon)
    
    # Compute vertex order similarity (if same length)
    if len(req.user_polygon) == len(req.target_polygon):
        # Create index sequences (0, 1, 2, ...)
        user_order = list(range(len(req.user_polygon)))
        target_order = list(range(len(req.target_polygon)))
        vertex_order_sim = compute_vertex_order_similarity(user_order, target_order)
    else:
        vertex_order_sim = 0.0
    
    # Compute scores
    scores = score_level_7_reconstruction(
        hausdorff_distance=hausdorff,
        vertex_order_similarity=vertex_order_sim,
        shape_similarity=shape_sim,
        time_taken_ms=req.time_taken_ms,
        expected_vertices=len(req.target_polygon),
        actual_vertices=len(req.user_polygon)
    )
    
    return Level7GradeResponse(
        hausdorff_distance=hausdorff,
        shape_similarity=shape_sim,
        vertex_order_similarity=vertex_order_sim,
        shape_score=scores['shape_score'],
        order_score=scores['order_score'],
        vertex_count_score=scores['vertex_count_score'],
        time_score=scores['time_score'],
        reconstruction_score=scores['reconstruction_score']
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

