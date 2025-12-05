#!/bin/bash
# Stop all development servers
# Run from anywhere

echo "🛑 Stopping all servers..."

# Kill Next.js (port 3000)
echo "Killing processes on port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
echo "✓ Port 3000 cleared"

# Kill FastAPI (port 8000)
echo "Killing processes on port 8000..."
lsof -ti:8000 | xargs kill -9 2>/dev/null
echo "✓ Port 8000 cleared"

# Kill any node/python processes with our project name
pkill -f "next dev" 2>/dev/null
pkill -f "uvicorn main:app" 2>/dev/null

echo "✅ All servers stopped"
