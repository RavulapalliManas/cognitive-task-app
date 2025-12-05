#!/bin/bash
# Start Backend (FastAPI/Uvicorn)
# Run from project root

echo "🐍 Starting Python Backend..."
cd "cognitive backend" || exit 1

# Check if uvicorn is installed
if ! command -v uvicorn &> /dev/null; then
    echo "⚠️  uvicorn not found. Installing backend dependencies..."
    pip install fastapi uvicorn numpy scipy shapely pydantic
fi

# Start with auto-reload for development
uvicorn main:app --reload --port 8000 --log-level info

# For production, use:
# uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
