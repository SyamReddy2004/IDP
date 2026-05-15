# AI-Powered Intelligent Document Processing (IDP) System

## Overview
A full-stack application that processes PDF and image documents, extracts text using OCR, detects entities via AI, and provides a modern React dashboard for upload, review, and data management.

## Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion, TanStack Table
- **Backend**: FastAPI, SQLAlchemy, SQLite (Development) / PostgreSQL (Production)
- **AI/OCR**: PaddleOCR, Tesseract, Ollama (ready for background worker integration)

## Features
- **Modern Dashboard**: Responsive, dark-themed UI built with Tailwind CSS.
- **Document Upload**: Drag and drop file upload supporting PDFs and images.
- **Interactive Review Table**: Edit and approve extracted data using a spreadsheet-like interface.
- **Local Development Environment**: Easily spin up the system using Docker or local bash scripts.

## Getting Started

### Option 1: Run Locally (Without Docker)

This option requires `Node.js` (NPM) and `Python 3` installed on your machine.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/SyamReddy2004/IDP.git
   cd IDP
   ```

2. **Run the startup script:**
   This will automatically install frontend/backend dependencies and start both servers.
   ```bash
   ./run_local.sh
   ```

3. **Access the application:**
   - Frontend Dashboard: [http://localhost:5173](http://localhost:5173)
   - Backend API Docs: [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs)

### Option 2: Run with Docker Compose (Production Ready)

If you have Docker Desktop installed, you can spin up the entire application along with PostgreSQL and Redis.

1. **Start the containers:**
   ```bash
   docker-compose up --build -d
   ```

2. **Access the application:**
   - Frontend: [http://localhost](http://localhost)
   - API Docs: [http://localhost/api/v1/openapi.json](http://localhost/api/v1/openapi.json)

## Directory Structure
- `/frontend`: Vite React Application
- `/backend`: FastAPI Python Application
- `/nginx`: Nginx reverse proxy configuration for Docker deployment
- `docker-compose.yml`: Production orchestration file
- `run_local.sh`: Local development automation script
