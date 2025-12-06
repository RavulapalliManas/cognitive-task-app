import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add parent directory to path so we can import main
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)



def test_generate_level_7_maze():
    """Test Maze Generation for Level 7."""
    response = client.post("/generate_level_7", json={"level": 7, "sublevel": 3})
    assert response.status_code == 200
    data = response.json()
    assert "path" in data
    assert "left_wall" in data
    assert "right_wall" in data
    assert len(data['path']) > 0

def test_grade_level_7_maze():
    """Test Maze Grading for Level 7."""
    # Mock data
    path = [{"x": 0.5, "y": 0.1}, {"x": 0.5, "y": 0.9}]
    # Perfect user path
    response = client.post("/grade_level_7", json={
        "user_path": path,
        "maze_path": path,
        "time_taken_ms": 5000
    })
    assert response.status_code == 200
    data = response.json()
    assert data['reconstruction_score'] > 95.0 # Should be near perfect

    # Bad user path
    bad_path = [{"x": 0.1, "y": 0.1}, {"x": 0.1, "y": 0.2}]
    response_bad = client.post("/grade_level_7", json={
        "user_path": bad_path,
        "maze_path": path,
        "time_taken_ms": 5000
    })
    assert response_bad.status_code == 200
    assert response_bad.json()['reconstruction_score'] < 50.0

def test_grade_level_6_detection():
    """Test Level 6 in Detection Mode (Level 5 behavior)."""
    response = client.post("/grade_level_6", json={
        "detection_time_ms": 8200,
        "threshold_percentage": 15.0,
        "actual_intersection_time_ms": 8000,
        "estimated_area": 100.0,
        "actual_area": 100.0,
        # No user_drawn_polygon
    })
    assert response.status_code == 200
    data = response.json()
    # Timing within 200ms -> score 1.0
    assert data['timing_accuracy'] == 1.0 

def test_grade_level_6_drawing():
    """Test Level 6 in Drawing Mode."""
    # Square [0,0] to [1,1]
    poly = [
        {"x":0, "y":0}, {"x":1, "y":0}, 
        {"x":1, "y":1}, {"x":0, "y":1}
    ]
    response = client.post("/grade_level_6", json={
        "detection_time_ms": 5000,
        "threshold_percentage": 15.0,
        "user_drawn_polygon": poly,
        "actual_intersection_polygon": poly
    })
    assert response.status_code == 200
    data = response.json()
    # Perfect Match (with time penalty)
    assert data['area_accuracy'] > 0.99
    assert data['composite_score'] >= 90.0


def test_generate_level_5():
    """Test Level 5 generation with Image URL."""
    response = client.post("/generate_level_5", json={"level": 5, "sublevel": 1})
    assert response.status_code == 200
    data = response.json()
    assert "target_name" in data
    assert "target_image_url" in data
    assert data["target_image_url"].startswith("/static/")
    assert len(data["shapes"]) >= 3 # Target + 2 distractors

def test_grade_level_5():
    """Test Level 5 grading."""
    # Mock grading
    response = client.post("/grade_level_5", json={
        "target_index": 0,
        "selected_index": 0,
        "reaction_time_ms": 2000,
        "confidence_rating": 5
    })
    assert response.status_code == 200
    data = response.json()
    assert data["correctness"] == 1.0
    assert data["recognition_score"] > 80.0
