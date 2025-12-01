"""
Point-Cloud Manager for Level 5 Shape Recognition
Loads and manages pre-generated point-cloud approximations.

Dependencies:
- json
- random
- pathlib
"""
import json
import random
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
import math


class PointCloudManager:
    """Manages loading and serving of point-cloud shape data."""
    
    def __init__(self, data_dir: str):
        """
        Initialize point-cloud manager.
        
        Args:
            data_dir: Path to directory containing JSON point-cloud files
        """
        self.data_dir = Path(data_dir)
        self.shapes = {}  # {name: {points: [...], label: str}}
        self.shape_names = []
        self._load_shapes()
    
    def _load_shapes(self):
        """Load all JSON point-cloud files into memory."""
        if not self.data_dir.exists():
            print(f"Warning: Point-cloud directory not found: {self.data_dir}")
            return
        
        # Load all JSON files
        for json_file in self.data_dir.glob("*.json"):
            try:
                with open(json_file, 'r') as f:
                    data = json.load(f)
                    
                    # Extract shape name and points
                    shape_name = data.get('label', json_file.stem)
                    points = data.get('points', [])
                    
                    # Normalize coordinates to 0-1 range if needed
                    normalized_points = self._normalize_points(points)
                    
                    self.shapes[shape_name] = {
                        'label': shape_name,
                        'points': normalized_points,
                        'original_count': len(normalized_points)
                    }
                    
                    self.shape_names.append(shape_name)
                    print(f"Loaded shape: {shape_name} ({len(normalized_points)} points)")
            
            except Exception as e:
                print(f"Error loading {json_file}: {e}")
        
        print(f"Total shapes loaded: {len(self.shapes)}")
    
    def _normalize_points(self, points: List[Dict[str, float]]) -> List[Dict[str, float]]:
        """
        Normalize points to 0-1 range if not already normalized.
        
        Args:
            points: List of {x, y} dictionaries
            
        Returns:
            Normalized points
        """
        if not points:
            return []
        
        xs = [p['x'] for p in points]
        ys = [p['y'] for p in points]
        
        x_min, x_max = min(xs), max(xs)
        y_min, y_max = min(ys), max(ys)
        
        # Check if already normalized (0-1 range)
        if x_min >= 0 and x_max <= 1 and y_min >= 0 and y_max <= 1:
            return points
        
        # Normalize to 0-1 range
        x_range = x_max - x_min
        y_range = y_max - y_min
        
        if x_range < 1e-9 or y_range < 1e-9:
            return points
        
        normalized = []
        for p in points:
            norm_x = (p['x'] - x_min) / x_range
            norm_y = (p['y'] - y_min) / y_range
            normalized.append({'x': float(norm_x), 'y': float(norm_y)})
        
        return normalized
    
    def get_shape(self, shape_name: str) -> Optional[Dict[str, Any]]:
        """
        Get shape data by name.
        
        Args:
            shape_name: Name of the shape
            
        Returns:
            Shape data or None if not found
        """
        return self.shapes.get(shape_name)
    
    def get_random_shape(self, exclude_names: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Get a random shape, optionally excluding specific names.
        
        Args:
            exclude_names: List of shape names to exclude
            
        Returns:
            Random shape data
        """
        available = [name for name in self.shape_names if name not in (exclude_names or [])]
        
        if not available:
            # Fallback to any shape
            available = self.shape_names
        
        if not available:
            raise ValueError("No shapes available")
        
        shape_name = random.choice(available)
        return {
            'name': shape_name,
            **self.shapes[shape_name]
        }
    
    def sample_points(self, points: List[Dict[str, float]], density: float) -> List[Dict[str, float]]:
        """
        Subsample points based on density ratio.
        
        Args:
            points: Original point list
            density: Fraction of points to keep (0-1)
            
        Returns:
            Subsampled points
        """
        density = max(0.1, min(1.0, density))  # Clamp to valid range
        
        if density >= 1.0:
            return points
        
        n_target = max(3, int(len(points) * density))
        
        # Use uniform sampling to preserve shape
        indices = sorted(random.sample(range(len(points)), n_target))
        
        return [points[i] for i in indices]
    
    def generate_recognition_task(self, 
                                  target_name: Optional[str] = None,
                                  num_distractors: int = 3,
                                  point_density: float = 1.0,
                                  seed: Optional[int] = None) -> Dict[str, Any]:
        """
        Generate a shape recognition task.
        
        Args:
            target_name: Specific target shape (None = random)
            num_distractors: Number of distractor shapes
            point_density: Fraction of points to show (difficulty)
            seed: Random seed for reproducibility
            
        Returns:
            {
                'shapes': [
                    {
                        'name': str,
                        'label': str,
                        'points': [...],
                        'is_target': bool
                    },
                    ...
                ],
                'target_index': int,
                'target_name': str,
                'point_density': float
            }
        """
        if seed is not None:
            random.seed(seed)
        
        if len(self.shapes) < num_distractors + 1:
            raise ValueError(f"Not enough shapes: need {num_distractors + 1}, have {len(self.shapes)}")
        
        # Select target
        if target_name and target_name in self.shapes:
            target = self.get_shape(target_name)
            target_shape_name = target_name
        else:
            target_data = self.get_random_shape()
            target_shape_name = target_data['name']
            target = self.shapes[target_shape_name]
        
        # Select distractors
        exclude = [target_shape_name]
        distractors = []
        
        for _ in range(num_distractors):
            distractor = self.get_random_shape(exclude_names=exclude)
            distractors.append(distractor['name'])
            exclude.append(distractor['name'])
        
        # Build shape list with target and distractors
        all_shapes = []
        
        # Add target
        target_points = self.sample_points(target['points'], point_density)
        all_shapes.append({
            'name': target_shape_name,
            'label': target['label'],
            'points': target_points,
            'is_target': True
        })
        
        # Add distractors
        for distractor_name in distractors:
            distractor_data = self.shapes[distractor_name]
            distractor_points = self.sample_points(distractor_data['points'], point_density)
            all_shapes.append({
                'name': distractor_name,
                'label': distractor_data['label'],
                'points': distractor_points,
                'is_target': False
            })
        
        # Shuffle shapes
        random.shuffle(all_shapes)
        
        # Find target index after shuffle
        target_index = next(i for i, s in enumerate(all_shapes) if s['is_target'])
        
        return {
            'shapes': all_shapes,
            'target_index': target_index,
            'target_name': target_shape_name,
            'point_density': point_density
        }
    
    def get_difficulty_params(self, level: int, sublevel: int) -> Dict[str, Any]:
        """
        Get difficulty parameters for Level 5 based on sublevel.
        
        Args:
            level: Level number (should be 5)
            sublevel: Sublevel (1-5)
            
        Returns:
            {
                'point_density': float,
                'num_distractors': int,
                'time_limit_seconds': int
            }
        """
        difficulty_map = {
            1: {'point_density': 1.0, 'num_distractors': 2, 'time_limit_seconds': 60},
            2: {'point_density': 0.8, 'num_distractors': 3, 'time_limit_seconds': 50},
            3: {'point_density': 0.6, 'num_distractors': 3, 'time_limit_seconds': 40},
            4: {'point_density': 0.4, 'num_distractors': 4, 'time_limit_seconds': 35},
            5: {'point_density': 0.3, 'num_distractors': 4, 'time_limit_seconds': 30}
        }
        
        return difficulty_map.get(sublevel, difficulty_map[3])


# Global instance (initialized in main.py)
point_cloud_manager: Optional[PointCloudManager] = None


def initialize_point_cloud_manager(data_dir: str):
    """Initialize the global point-cloud manager."""
    global point_cloud_manager
    point_cloud_manager = PointCloudManager(data_dir)
    return point_cloud_manager


def get_point_cloud_manager() -> PointCloudManager:
    """Get the global point-cloud manager instance."""
    if point_cloud_manager is None:
        raise RuntimeError("PointCloudManager not initialized. Call initialize_point_cloud_manager() first.")
    return point_cloud_manager
