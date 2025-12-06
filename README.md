# Cognitive Assessment Application

## Overview
A comprehensive digital cognitive assessment tool designed to evaluate various cognitive domains including memory, attention, executive function, and motor control. The application leverages **Computational Geometry** algorithms (convex hulls, kinetic data structures, polygon reconstruction) to generate dynamic, randomized tasks and provide precise, quantitative analysis of user performance.

## Architecture

*   **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, HeroUI, Framer Motion, Recharts.
*   **Backend**: Python FastAPI.
*   **Computational Engine**: NumPy, SciPy, Shapely (for geometric operations).
*   **Data Storage**: LocalStorage (Client-side) & In-Memory/JSON (Backend Analysis).

## Assessment Levels

1.  **Path Integration (Level 1)**: Connect points in numerical order. Measures basic motor planning and processing speed.
2.  **Visuospatial Memory (Level 2)**: Recall and connect points after they disappear. Measures spatial working memory.
3.  **Sustained Attention (Level 3)**: Interaction with moving targets (Kinetic Points). Measures attention stability and tracking.
4.  **Dual Task (Level 4)**: Combined memory and attention task with drifting, hidden targets. Measures cognitive load handling.
5.  **Shape Recognition (Level 5)**: Identify shapes from point clouds using random shape generation. Measures visual recognition.
6.  **Intersection Drawing (Level 6)**: Visualize and draw the intersection of two moving convex polygons. Measures executive function and geometric reasoning.
7.  **Polygon Construction (Level 7)**: Memorize and reconstruct complex polygons. Measures fine motor control and shape memory.
8.  **Maze Navigation (Level 8)**: Navigate a generated maze without touching walls. Measures tremor, motor stability, and planning.

## Prerequisites

*   **Node.js**: v18 or higher.
*   **Python**: v3.9 or higher.

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd cognitive-app
```

### 2. Backend Setup
Navigate to the backend directory and install dependencies:
```bash
cd "cognitive backend"
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Frontend Setup
Navigate to the root directory (or keep a separate terminal open):
```bash
# Return to root if in backend
cd ..
npm install
```

## Running the Application

### Step 1: Start the Backend (API)
The backend must be running for assessment generation and scoring.
```bash
cd "cognitive backend"
# Ensure venv is active
uvicorn main:app --reload --port 8000
```
*The API will be available at `http://localhost:8000`.*

### Step 2: Start the Frontend
```bash
# In the root directory
npm run dev
```
*The application will launch at `http://localhost:3000`.*

## Usage Guide
1.  Open `http://localhost:3000`.
2.  Click **"Begin Assessment"**.
3.  Enter your name to log in (Creates a session on your dashboard).
4.  View your **Dashboard** to see previous results or start a new test.
5.  Click **"Start Assessment Now"** to begin the full suite (Levels 1-8).
6.  Upon completion, view your **Detailed Results** and **Cognitive Profile**.

## Troubleshooting
*   **Backend Connection Error**: Ensure the backend is running on port 8000.
*   **Build Errors**: If `npm run dev` fails, try deleting `.next` folder and running `npm run dev` again.

---
Developed for Computational Geometry Final Project.
