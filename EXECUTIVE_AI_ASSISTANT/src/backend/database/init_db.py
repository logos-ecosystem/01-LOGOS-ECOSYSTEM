import asyncio
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from src.backend.database.base import init_database
from src.backend.core.config import settings


async def main():
    """Initialize the database"""
    print(f"Initializing database at: {settings.DATABASE_URL}")
    
    try:
        await init_database()
        print("Database initialized successfully!")
    except Exception as e:
        print(f"Error initializing database: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())