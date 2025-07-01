#!/usr/bin/env python3
"""
Quick start script for Executive AI Assistant - No virtual environment version
This runs the server using system Python
"""

import subprocess
import sys
import os
from pathlib import Path

def main():
    print("Executive AI Assistant - Starting Services (No venv)")
    print("=" * 50)
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("Error: Python 3.8 or higher is required")
        sys.exit(1)
    
    print(f"Using Python {sys.version}")
    
    # Create data directory
    os.makedirs("data", exist_ok=True)
    
    # Check if required packages are installed
    print("\nChecking dependencies...")
    try:
        import fastapi
        import uvicorn
        print("✅ Core dependencies found")
    except ImportError:
        print("\n⚠️  Dependencies not installed. Installing now...")
        print("This may take a few minutes on first run...")
        
        # Install dependencies
        subprocess.run([
            sys.executable, "-m", "pip", "install", 
            "--user",  # Install to user directory to avoid permission issues
            "-r", "requirements.txt"
        ], check=True)
    
    # Initialize database
    print("\nInitializing database...")
    try:
        subprocess.run([sys.executable, "-m", "src.backend.database.init_db"], check=True)
    except subprocess.CalledProcessError:
        print("⚠️  Database initialization skipped (will be created on first run)")
    
    # Start server
    print("\nStarting API server...")
    print("Access the application at: http://localhost:8000")
    print("API documentation at: http://localhost:8000/docs")
    print("\nPress Ctrl+C to stop the server")
    
    try:
        subprocess.run([
            sys.executable, "-m", "uvicorn",
            "src.backend.main:app",
            "--reload",
            "--host", "0.0.0.0",
            "--port", "8000"
        ])
    except KeyboardInterrupt:
        print("\nServer stopped.")
    except Exception as e:
        print(f"\nError: {str(e)}")
        print("\nTrying alternative startup method...")
        
        # Try direct module execution
        os.chdir(Path(__file__).parent)
        subprocess.run([
            sys.executable, 
            "-c",
            "from src.backend.main import app; import uvicorn; uvicorn.run(app, host='0.0.0.0', port=8000, reload=True)"
        ])

if __name__ == "__main__":
    main()