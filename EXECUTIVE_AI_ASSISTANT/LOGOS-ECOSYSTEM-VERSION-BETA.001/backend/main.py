"""Main entry point for the LOGOS Ecosystem API."""
import sys
import os

# Add src to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Import the FastAPI app
from src.api import create_app

# Create the app instance
app = create_app()

# For debugging: print available routes
if __name__ == "__main__":
    print("Available routes:")
    for route in app.routes:
        if hasattr(route, 'path'):
            print(f"  {route.path}")