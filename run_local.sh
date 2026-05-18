#!/bin/bash
echo "Setting up local environment..."

# ── Kill any leftover processes on our ports ──────────────────
echo "Cleaning up old processes on ports 5173 and 8001..."
lsof -ti :5173 | xargs kill -9 2>/dev/null
lsof -ti :5174 | xargs kill -9 2>/dev/null
lsof -ti :5175 | xargs kill -9 2>/dev/null
lsof -ti :8001 | xargs kill -9 2>/dev/null
sleep 1

# ── Start Frontend ────────────────────────────────────────────
echo "Starting Frontend Vite server..."
cd frontend
npm run dev &
FRONTEND_PID=$!

# ── Start Backend ─────────────────────────────────────────────
echo "Starting Backend FastAPI server..."
cd ../backend
source .venv/bin/activate
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload &
BACKEND_PID=$!

echo "================================================="
echo "Both servers are starting!"
echo "Frontend Dashboard: http://localhost:5173"
echo "Backend API Docs:   http://127.0.0.1:8001/docs"
echo "Press Ctrl+C to stop both servers."
echo "================================================="

trap "kill $FRONTEND_PID $BACKEND_PID 2>/dev/null; exit" INT TERM
wait
