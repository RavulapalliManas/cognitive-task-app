#!/bin/bash
# Start Frontend (Next.js)
# Run from project root

echo "⚛️  Starting Next.js Frontend..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start development server
npm run dev

# The app will be available at http://localhost:3000
