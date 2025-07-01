#!/bin/bash

# Executive AI Assistant Startup Script

echo "Executive AI Assistant - Starting Services"
echo "========================================"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Create data directory if it doesn't exist
mkdir -p data

# Initialize database
echo "Initializing database..."
python -m src.backend.database.init_db

# Start the server
echo "Starting API server..."
echo "Access the application at: http://localhost:8000"
echo "API documentation at: http://localhost:8000/docs"
echo ""
uvicorn src.backend.main:app --reload --host 0.0.0.0 --port 8000