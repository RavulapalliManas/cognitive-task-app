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
    generate_maze_corridor,
    compute_funnel_path,
    generate_convex_polygon # Added
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

# ... (Previous code remains, skipping to Level 6) ...

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
    detection_time_ms: float
    actual_intersection_time_ms: Optional[float] = 0
    threshold_percentage: float
    estimated_area: Optional[float] = None
    actual_area: Optional[float] = None
    user_drawn_polygon: Optional[List[Dict[str, float]]] = None
    actual_intersection_polygon: Optional[List[Dict[str, float]]] = None

class Level6GradeResponse(BaseModel):
    timing_accuracy: float
    detection_score: float
    area_accuracy: Optional[float] = None
    composite_score: float
    feedback: Optional[str] = None

@app.post('/generate_level_6', response_model=Level6GenerateResponse)
def generate_level_6(req: Level6GenerateRequest):
    """Generate polygon intersection task for Level 6 with CONVEX polygons."""
    seed = req.seed if req.seed is not None else random.randint(0, 2**30)
    
    # Difficulty parameters
    difficulty_map = {
        1: {'vertices': 5, 'speed': 0.0005, 'threshold': 20.0, 'duration': 10000}, # Simple pentagons
        2: {'vertices': 6, 'speed': 0.0008, 'threshold': 18.0, 'duration': 9000},
        3: {'vertices': 7, 'speed': 0.001, 'threshold': 15.0, 'duration': 8000},
        4: {'vertices': 8, 'speed': 0.0013, 'threshold': 12.0, 'duration': 7000},
        5: {'vertices': 9, 'speed': 0.0015, 'threshold': 10.0, 'duration': 6000}
    }
    
    params = difficulty_map.get(req.sublevel, difficulty_map[3])
    
    # Generate two CONVEX polygons
    poly_a_points = generate_convex_polygon(params['vertices'], seed=seed)
    
    # Generate second polygon with different seed
    poly_b_points = generate_convex_polygon(params['vertices'], seed=seed + 1000)
    
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

    # Mode 1: Detection (Fallback)
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
        composite_score=scores.get('detection_score', 0.0) * 100,
        feedback="Detection recorded."
    )


# =====================================================
# LEVEL 7: POLYGON RECONSTRUCTION (New Task)
# =====================================================

class Level7GenerateRequest(BaseModel):
    level: int = Field(7, ge=7, le=7)
    sublevel: int = Field(..., ge=1, le=5)
    seed: Optional[int] = None

class Level7GenerateResponse(BaseModel):
    target_polygon: List[Dict[str, float]]
    display_time_ms: int
    vertex_count: int

class Level7GradeRequest(BaseModel):
    user_polygon: List[Dict[str, float]]
    target_polygon: List[Dict[str, float]]
    reconstruction_time_ms: int
    timestamps: Optional[List[int]] = None

class Level7GradeResponse(BaseModel):
    hausdorff_score: float
    arkin_score: float
    vertex_order_score: float
    composite_score: float
    feedback: str

@app.post('/generate_level_7', response_model=Level7GenerateResponse)
def generate_level_7(req: Level7GenerateRequest):
    """Generate Polygon Reconstruction task (8, 12, 15 vertices)."""
    seed = req.seed if req.seed is not None else random.randint(0, 2**30)
    
    # Vertices map per user request
    v_map = {1: 8, 2: 12, 3: 15}
    n_verts = v_map.get(req.sublevel, 10)
    
    # Display time decreases as difficulty increases? Or increases?
    # Usually: More vertices = More time needed to memorize?
    # Or: Less time to make it harder? 
    # Let's give generous time for higher vertex counts.
    display_time = 3000 + (req.sublevel * 1000) # 4s, 5s, 6s
    
    # Reuse generic polygon generator logic but strictly specific vertices
    # We call generate_polygon internal logic directly or reuse the endpoint logic structure
    base_req = GenerateRequest(level=7, sublevel=req.sublevel, vertex_count=n_verts, seed=seed)
    # Using local generation to avoid overhead
    # We want a nice, non-crossing polygon.
    # New Convex generator? No, reconstruction is usually any polygon.
    # Let's use the peeling algorithm from generic generator.
    
    pts, boundary = generate_simple_polygon_by_peeling(n_points=n_verts+5, desired_vertices=n_verts, seed=seed)
    
    # Convert to list of dicts
    polygon = []
    for idx in boundary:
        polygon.append({'x': float(pts[idx,0]), 'y': float(pts[idx,1])})
        
    return Level7GenerateResponse(
        target_polygon=polygon,
        display_time_ms=display_time,
        vertex_count=n_verts
    )

@app.post('/grade_level_7', response_model=Level7GradeResponse)
def grade_level_7(req: Level7GradeRequest):
    """Grade Level 7 (Reconstruction)."""
    if not req.user_polygon:
        return Level7GradeResponse(
            hausdorff_score=0, arkin_score=0, vertex_order_score=0, composite_score=0, feedback="No polygon drawn"
        )
        
    scores = score_level_7_reconstruction(
        req.target_polygon,
        req.user_polygon,
        req.reconstruction_time_ms
    )
    
    return Level7GradeResponse(
        hausdorff_score=scores['hausdorff_similarity'],
        arkin_score=scores['arkin_similarity'],
        vertex_order_score=scores['vertex_correctness'],
        composite_score=scores['score'],
        feedback=f"Accuracy: {int(scores['shape_similarity']*100)}%"
    )


# =====================================================
# LEVEL 8: MAZE TRACING (Shifted from L7)
# =====================================================

class Level8GenerateRequest(BaseModel):
    level: int = Field(8, ge=8, le=8)
    sublevel: int = Field(..., ge=1, le=5)
    seed: Optional[int] = None

class Level8GenerateResponse(BaseModel):
    path: List[Dict[str, float]]
    left_wall: List[Dict[str, float]]
    right_wall: List[Dict[str, float]]
    time_limit_seconds: int

class Level8GradeRequest(BaseModel):
    user_path: List[Dict[str, float]]
    completion_time_ms: int
    collisions: int

class Level8GradeResponse(BaseModel):
    completion_score: float
    precision_score: float
    time_score: float
    composite_score: float
    tremor_score: float = 0.0

@app.post('/generate_level_8', response_model=Level8GenerateResponse)
def generate_level_8(req: Level8GenerateRequest):
    """Generate Maze Tracing task."""
    width_map = {1: 0.15, 2: 0.12, 3: 0.08} # Narrower = Harder
    width = width_map.get(req.sublevel, 0.15)
    
    maze = generate_maze_corridor(segments=10 + (req.sublevel*2), width=width)
    
    return Level8GenerateResponse(
        path=maze['path'],
        left_wall=maze['left_wall'],
        right_wall=maze['right_wall'],
        time_limit_seconds=15 + (req.sublevel * 5)
    )

@app.post('/grade_level_8', response_model=Level8GradeResponse)
def grade_level_8(req: Level8GradeRequest):
    """Grade Level 8 (Maze/Navigation)."""
    # Previously grade_level_7 logic
    
    # 1. Tremor (Douglas-Peucker)
    tremor = compute_tremor_score(req.user_path)
    
    # 2. Precision ( collisions penalty? )
    # Assuming user_path is checked against walls in frontend for collisions, 
    # but we can check bounds here too? 
    # For now, rely on frontend reported collisions plus simple tortuosity?
    
    precision = max(0.0, 100.0 - (req.collisions * 10))
    
    time_limit = 30000
    time_score = max(0.0, 1.0 - (req.completion_time_ms / time_limit)) * 100
    
    # Composite
    comp = (precision * 0.6) + (time_score * 0.2) + ((1.0 - tremor) * 100 * 0.2)
    
    return Level8GradeResponse(
        completion_score=100.0, # Completed if submitted
        precision_score=precision,
        time_score=time_score,
        composite_score=comp,
        tremor_score=tremor
    )
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

