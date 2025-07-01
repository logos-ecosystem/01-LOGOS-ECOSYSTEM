#!/usr/bin/env python3
"""Simple database initialization for SQLite"""

import asyncio
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

import os
os.environ['DATABASE_URL'] = 'sqlite+aiosqlite:///./logos_dev.db'

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import bcrypt

async def init_db():
    """Initialize database with basic tables"""
    try:
        # Create engine
        engine = create_async_engine(
            'sqlite+aiosqlite:///./logos_dev.db',
            echo=True
        )
        
        # Create basic tables using raw SQL for SQLite
        async with engine.begin() as conn:
            # Users table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    username TEXT UNIQUE NOT NULL,
                    hashed_password TEXT NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    is_verified BOOLEAN DEFAULT 0,
                    is_admin BOOLEAN DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            
            # Categories table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS categories (
                    id TEXT PRIMARY KEY,
                    name TEXT UNIQUE NOT NULL,
                    slug TEXT UNIQUE NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            
            # Marketplace items table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS marketplace_items (
                    id TEXT PRIMARY KEY,
                    owner_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    category TEXT NOT NULL,
                    category_id TEXT,
                    price REAL NOT NULL,
                    status TEXT DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (owner_id) REFERENCES users(id),
                    FOREIGN KEY (category_id) REFERENCES categories(id)
                )
            """))
            
            # Wallets table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS wallets (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    balance REAL DEFAULT 0.0,
                    currency TEXT DEFAULT 'USD',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """))
            
            # AI sessions table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS ai_sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    title TEXT,
                    model TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """))
            
            # Agents table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS agents (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    description TEXT,
                    capabilities TEXT,
                    config TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            
            print("✅ Tables created successfully!")
            
            # Insert initial data
            import uuid
            
            # Admin user
            admin_id = str(uuid.uuid4())
            admin_password = bcrypt.hashpw("admin123".encode(), bcrypt.gensalt()).decode()
            
            await conn.execute(text("""
                INSERT INTO users (id, email, username, hashed_password, is_active, is_verified, is_admin)
                VALUES (:id, :email, :username, :password, 1, 1, 1)
            """), {
                "id": admin_id,
                "email": "admin@logos.ai",
                "username": "admin",
                "password": admin_password
            })
            
            # Admin wallet
            await conn.execute(text("""
                INSERT INTO wallets (id, user_id, balance)
                VALUES (:id, :user_id, 1000.0)
            """), {
                "id": str(uuid.uuid4()),
                "user_id": admin_id
            })
            
            # Categories
            categories = [
                {"id": str(uuid.uuid4()), "name": "AI Agents", "slug": "ai-agents", 
                 "description": "Specialized AI agents for various tasks"},
                {"id": str(uuid.uuid4()), "name": "Templates", "slug": "templates",
                 "description": "Ready-to-use templates and prompts"},
                {"id": str(uuid.uuid4()), "name": "Datasets", "slug": "datasets",
                 "description": "Training data and datasets"},
                {"id": str(uuid.uuid4()), "name": "Models", "slug": "models",
                 "description": "Pre-trained AI models"}
            ]
            
            for cat in categories:
                await conn.execute(text("""
                    INSERT INTO categories (id, name, slug, description)
                    VALUES (:id, :name, :slug, :description)
                """), cat)
            
            # Sample marketplace items
            await conn.execute(text("""
                INSERT INTO marketplace_items (id, owner_id, title, description, category, category_id, price, status)
                VALUES (:id, :owner_id, :title, :description, :category, :category_id, :price, :status)
            """), {
                "id": str(uuid.uuid4()),
                "owner_id": admin_id,
                "title": "Advanced Code Assistant",
                "description": "AI agent specialized in code generation and debugging",
                "category": "ai-agents",
                "category_id": categories[0]["id"],
                "price": 29.99,
                "status": "active"
            })
            
            # Sample agents
            agents = [
                {
                    "id": str(uuid.uuid4()),
                    "name": "Code Assistant",
                    "type": "specialized",
                    "description": "Expert in software development",
                    "capabilities": '["code_generation", "debugging", "refactoring"]',
                    "config": '{"model": "claude-3-opus", "temperature": 0.3}',
                    "is_active": 1
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "Data Analyst",
                    "type": "specialized",
                    "description": "Expert in data analysis and visualization",
                    "capabilities": '["data_analysis", "visualization", "statistics"]',
                    "config": '{"model": "claude-3-opus", "temperature": 0.5}',
                    "is_active": 1
                }
            ]
            
            for agent in agents:
                await conn.execute(text("""
                    INSERT INTO agents (id, name, type, description, capabilities, config, is_active)
                    VALUES (:id, :name, :type, :description, :capabilities, :config, :is_active)
                """), agent)
            
            print("✅ Initial data inserted successfully!")
            
        await engine.dispose()
        
    except Exception as e:
        print(f"❌ Database initialization failed: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(init_db())
    print("\n✅ Database initialized successfully!")
    print("\nAdmin credentials:")
    print("  Email: admin@logos.ai")
    print("  Password: admin123")
    print("\nYou can now start the application!")