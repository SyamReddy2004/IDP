#!/bin/bash
echo "Setting up local environment..."

# Start frontend in the background
echo "Starting Frontend Vite server..."
cd frontend
npm install
npm run dev &
FRONTEND_PID=$!

# Setup backend
echo "Starting Backend FastAPI server..."
cd ../backend
python3 -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn sqlalchemy alembic python-multipart pydantic pydantic-settings
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload &
BACKEND_PID=$!

echo "================================================="
echo "Both servers are starting!"
echo "Frontend Dashboard: http://localhost:5173"
echo "Backend API Docs: http://127.0.0.1:8001/docs"
echo "Press Ctrl+C to stop both servers."
echo "================================================="

trap "kill $FRONTEND_PID $BACKEND_PID; exit" INT TERM
wait
