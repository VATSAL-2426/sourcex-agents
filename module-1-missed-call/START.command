#!/bin/bash
# Double-click this file to start SOURCE X Module 1

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo ""
echo "  SOURCE X — Starting Module 1..."
echo ""

# Start backend
node backend/server.js &
BACKEND_PID=$!

# Wait for backend to be ready
sleep 2

# Open browser
open http://localhost:5173

# Start frontend (this keeps the terminal open)
npm run dev --prefix frontend

# Cleanup on exit
kill $BACKEND_PID 2>/dev/null
