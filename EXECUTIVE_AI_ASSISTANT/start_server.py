#!/usr/bin/env python3
"""
Quick start script for Executive AI Assistant
This provides a simple way to start the server without bash
"""

import subprocess
import sys
import os
from pathlib import Path

def main():
    print("Executive AI Assistant - Starting Services")
    print("=" * 40)
    
    # Check Python version
    if sys.version_info < (3, 11):
        print("Error: Python 3.11 or higher is required")
        sys.exit(1)
    
    # Create data directory
    os.makedirs("data", exist_ok=True)
    
    # Check if virtual environment exists
    if not Path("venv").exists():
        print("Creating virtual environment...")
        subprocess.run([sys.executable, "-m", "venv", "venv"], check=True)
    
    # Determine pip path
    if sys.platform == "win32":
        pip_path = Path("venv/Scripts/pip")
        python_path = Path("venv/Scripts/python")
    else:
        pip_path = Path("venv/bin/pip")
        python_path = Path("venv/bin/python")
    
    # Install dependencies
    print("\nInstalling dependencies...")
    subprocess.run([str(pip_path), "install", "-r", "requirements.txt"], check=True)
    
    # Initialize database
    print("\nInitializing database...")
    subprocess.run([str(python_path), "-m", "src.backend.database.init_db"], check=True)
    
    # Start server
    print("\nStarting API server...")
    print("Access the application at: http://localhost:8000")
    print("API documentation at: http://localhost:8000/docs")
    print("\nPress Ctrl+C to stop the server")
    
    try:
        subprocess.run([
            str(python_path), "-m", "uvicorn",
            "src.backend.main:app",
            "--reload",
            "--host", "0.0.0.0",
            "--port", "8000"
        ])
    except KeyboardInterrupt:
        print("\nServer stopped.")

if __name__ == "__main__":
    main()