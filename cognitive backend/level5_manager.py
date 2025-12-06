import os
import json
import random
import glob
from typing import List, Dict, Any, Optional

class Level5Manager:
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.shapes: List[Dict[str, Any]] = []
        self.load_shapes()

    def load_shapes(self):
        """Load all JSON files from the directory."""
        if not os.path.exists(self.data_dir):
            print(f"Warning: Point cloud directory not found: {self.data_dir}")
            return

        json_files = glob.glob(os.path.join(self.data_dir, "*.json"))
        for fpath in json_files:
            try:
                with open(fpath, 'r') as f:
                    data = json.load(f)
                
                # Check format: simple list of lists [[x,y],...] or objects [{x,y},...]
                points = []
                if isinstance(data, list):
                    if len(data) > 0:
                        first = data[0]
                        if isinstance(first, list) and len(first) >= 2:
                            # [[x,y], [x,y]]
                            points = [{'x': float(p[0]), 'y': float(p[1])} for p in data]
                        elif isinstance(first, dict) and 'x' in first and 'y' in first:
                             # [{'x':0.1, 'y':0.2}, ...]
                             points = [{'x': float(p['x']), 'y': float(p['y'])} for p in data]
                        # Handle potential 'points' key wrapper if needed
                        else:
                            # Try to see if data is wrapper
                            pass
                
                if not points and isinstance(data, dict) and "points" in data:
                     # Wrapper format: {"points": [...]}
                     raw = data["points"]
                     if len(raw) > 0:
                         first_pt = raw[0]
                         if isinstance(first_pt, dict) and 'x' in first_pt:
                             points = [{'x': float(p['x']), 'y': float(p['y'])} for p in raw]
                         else:
                             points = [{'x': float(p[0]), 'y': float(p[1])} for p in raw]

                if points:
                    # Normalize points to 0-1 range if not already
                    # Most point clouds might be in image coords (e.g. 0-100 or 0-500)
                    xs = [p['x'] for p in points]
                    ys = [p['y'] for p in points]
                    min_x, max_x = min(xs), max(xs)
                    min_y, max_y = min(ys), max(ys)
                    
                    width = max_x - min_x
                    height = max_y - min_y
                    scale = max(width, height)
                    if scale > 0:
                         for p in points:
                             p['x'] = (p['x'] - min_x) / scale * 0.8 + 0.1 # center with margin
                             p['y'] = (p['y'] - min_y) / scale * 0.8 + 0.1
                    
                    filename = os.path.basename(fpath)
                    name = os.path.splitext(filename)[0] # "Castle" from "Castle.json"
                    
                    self.shapes.append({
                        "name": name,
                        "points": points
                    })
                    print(f"Loaded shape: {name} ({len(points)} points)")
            except Exception as e:
                print(f"Error loading {fpath}: {e}")

    def get_task(self, num_distractors: int = 3, seed: Optional[int] = None) -> Dict[str, Any]:
        """Get a random target shape and a list of option shapes (including distractors)."""
        if not self.shapes:
             # Fallback mock data
             mock_tri = {'name': 'Triangle', 'points': [{'x':0.2,'y':0.8}, {'x':0.8,'y':0.8}, {'x':0.5,'y':0.2}]}
             return {
                 "target_index": 0,
                 "shapes": [mock_tri],
                 "target_name": "Triangle"
             }
             
        if seed is not None:
            random.seed(seed)
            
        target_shape = random.choice(self.shapes)
        
        # Select distractors (full objects)
        other_shapes = [s for s in self.shapes if s["name"] != target_shape["name"]]
        
        if len(other_shapes) < num_distractors:
            distractors = other_shapes # Take all
        else:
            distractors = random.sample(other_shapes, num_distractors)
            
        # Combine
        all_options = distractors + [target_shape]
        random.shuffle(all_options)
        
        # Find new index of target
        target_index = -1
        for i, s in enumerate(all_options):
            if s["name"] == target_shape["name"]:
                target_index = i
                break
        
        return {
            "target_index": target_index,
            "shapes": all_options, # Full objects with 'name' and 'points'
            "target_name": target_shape["name"]
        }
