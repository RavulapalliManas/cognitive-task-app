#!/bin/bash
# Debug Script - Check system health
# Run from project root

echo "🔍 COGNITIVE APP DIAGNOSTIC"
echo "=============================="
echo ""

# 1. Check ports
echo "1️⃣  Checking ports..."
PORT_3000=$(lsof -ti:3000 2>/dev/null | wc -l | tr -d ' ')
PORT_8000=$(lsof -ti:8000 2>/dev/null | wc -l | tr -d ' ')

if [ "$PORT_3000" -gt 0 ]; then
    echo "⚠️  Port 3000 (Frontend) is IN USE by process(es):"
    lsof -ti:3000 | xargs ps -p
else
    echo "✅ Port 3000 (Frontend) is FREE"
fi

if [ "$PORT_8000" -gt 0 ]; then
    echo "⚠️  Port 8000 (Backend) is IN USE by process(es):"
    lsof -ti:8000 | xargs ps -p
else
    echo "✅ Port 8000 (Backend) is FREE"
fi
echo ""

# 2. Check dependencies
echo "2️⃣  Checking dependencies..."
if [ -d "node_modules" ]; then
    NODE_SIZE=$(du -sh node_modules 2>/dev/null | cut -f1)
    echo "✅ node_modules: $NODE_SIZE"
else
    echo "❌ node_modules NOT FOUND - run 'npm install'"
fi

if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "✅ Python: $PYTHON_VERSION"
else
    echo "❌ Python3 NOT FOUND"
fi

if command -v uvicorn &> /dev/null; then
    echo "✅ uvicorn installed"
else
    echo "⚠️  uvicorn NOT FOUND - run 'pip install uvicorn fastapi'"
fi
echo ""

# 3. Check Next.js cache
echo "3️⃣  Checking build caches..."
if [ -d ".next" ]; then
    NEXT_SIZE=$(du -sh .next 2>/dev/null | cut -f1)
    echo "📦 .next cache: $NEXT_SIZE"
    echo "   (Run 'rm -rf .next' if issues occur)"
else
    echo "✅ No .next cache (clean)"
fi
echo ""

# 4. Check backend data
echo "4️⃣  Checking backend data..."
if [ -d "cognitive backend/Point approximator/Processed_Images" ]; then
    DATA_SIZE=$(du -sh "cognitive backend/Point approximator/Processed_Images" 2>/dev/null | cut -f1)
    FILE_COUNT=$(ls -1 "cognitive backend/Point approximator/Processed_Images"/*.json 2>/dev/null | wc -l | tr -d ' ')
    echo "✅ Point-cloud data: $DATA_SIZE ($FILE_COUNT JSON files)"
else
    echo "⚠️  Point-cloud data directory not found"
fi
echo ""

# 5. Memory check
echo "5️⃣  Memory usage..."
if command -v vm_stat &> /dev/null; then
    FREE_MEM=$(vm_stat | grep "Pages free" | awk '{print int($3) * 4096 / 1024 / 1024)}')
    echo "💾 Free memory: ~${FREE_MEM}MB"
fi
echo ""

# 6. Running Node processes
echo "6️⃣  Node/Python processes..."
NODE_COUNT=$(ps aux | grep -E "(node|next)" | grep -v grep | wc -l | tr -d ' ')
PYTHON_COUNT=$(ps aux | grep -E "(python|uvicorn)" | grep -v grep | wc -l | tr -d ' ')
echo "🟢 Node processes: $NODE_COUNT"
echo "🐍 Python processes: $PYTHON_COUNT"
echo ""

echo "=============================="
echo "✅ Diagnostic complete"
echo ""
echo "Next steps:"
echo "  - Install dependencies: npm install"
echo "  - Start backend: ./start-backend.sh"
echo "  - Start frontend: ./start-frontend.sh"
echo "  - Stop all: ./stop-all.sh"
