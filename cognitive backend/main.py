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

app = FastAPI(title="CogniTest Backend")

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

def sample_points_in_box(n: int, bbox: Tuple[float,float,float,float]=(0,0,1,1), seed: Optional[int]=None):
    if seed is not None:
        np.random.seed(seed)
    (x0,y0,x1,y1) = bbox
    xs = np.random.uniform(x0, x1, size=n)
    ys = np.random.uniform(y0, y1, size=n)
    return np.column_stack([xs, ys])


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
    while True:
        neighs = adj[cur]
        nxt = neighs[0] if neighs[0] != prev else (neighs[1] if len(neighs)>1 else None)
        if nxt is None or nxt == start:
            break
        ordered.append(nxt)
        prev, cur = cur, nxt
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

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# If run directly: uvicorn cognitest_backend:app --reload

