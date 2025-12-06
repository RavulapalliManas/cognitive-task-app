import pytest
import sys
import os
import math

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scoring import (
    calculate_hausdorff_distance,
    calculate_smoothness_jerk,
    score_level_6_intersection,
    calculate_arkin_metric
)

def test_hausdorff_distance():
    # Identical sets -> 0 distance
    path_a = [(0.0, 0.0), (1.0, 1.0)]
    assert calculate_hausdorff_distance(path_a, path_a) == 0.0

    # Slight shift
    path_b = [(0.1, 0.0), (1.1, 1.0)]
    dist = calculate_hausdorff_distance(path_a, path_b)
    assert dist > 0.0
    assert dist < 0.2

    # Empty sets
    assert calculate_hausdorff_distance([], []) > 0.0

def test_smoothness_jerk():
    # Smooth line
    # Constant velocity: x increases by 1 every 100ms
    points = [
        {"x":0, "y":0}, 
        {"x":1, "y":0}, 
        {"x":2, "y":0}
    ]
    timestamps = [0, 100, 200]
    
    # Velocity 1: (1-0)/0.1 = 10
    # Velocity 2: (2-1)/0.1 = 10
    # Accel: abs(10-10) = 0
    score = calculate_smoothness_jerk(points, timestamps)
    assert score == 0.0

    # Jerky movement
    points_jerky = [
        {"x":0, "y":0}, 
        {"x":1, "y":0}, 
        {"x":1, "y":0} # Stop
    ]
    # Vel 1: 10
    # Vel 2: 0
    # Accel: 10
    score_jerky = calculate_smoothness_jerk(points_jerky, timestamps)
    assert score_jerky > 0.0

def test_level_6_scoring():
    # Perfect timing
    scores = score_level_6_intersection(
        detection_time_ms=5000,
        actual_intersection_time_ms=5000,
        threshold_percentage=15.0
    )
    assert scores['timing_accuracy'] == 1.0

    # Bad timing (3 sec off)
    scores_bad = score_level_6_intersection(
        detection_time_ms=8000,
        actual_intersection_time_ms=5000,
        threshold_percentage=15.0
    )
    assert scores_bad['timing_accuracy'] < 0.5
