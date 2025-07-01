#!/usr/bin/env python3
"""Initialize the database with tables and initial data"""

import asyncio
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from src.infrastructure.database import Base
from src.shared.models.user import User, Role
from src.shared.models.marketplace import MarketplaceItem, Category
from src.shared.models.wallet import Wallet
from src.shared.models.ai import AISession
from src.shared.models.agents import AgentModel
from src.shared.models.ai_registry import RegisteredModel
from src.shared.models.upload import Upload
from src.shared.models.review import Review
from src.shared.utils.logger import get_logger
from config.development import settings
import bcrypt
import uuid
from datetime import datetime

logger = get_logger(__name__)

async def init_db():
    """Initialize database with tables and seed data"""
    try:
        # Create engine
        engine = create_async_engine(
            settings.DATABASE_URL,
            echo=settings.DATABASE_ECHO,
            future=True
        )
        
        # Create all tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables created successfully")
        
        # Create session
        async_session = sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )
        
        # Add initial data
        async with async_session() as session:
            # Create roles
            admin_role = Role(
                id=str(uuid.uuid4()),
                name="admin",
                description="Administrator role with full access",
                permissions=["*"]
            )
            user_role = Role(
                id=str(uuid.uuid4()),
                name="user",
                description="Regular user role",
                permissions=["read:own", "write:own"]
            )
            session.add_all([admin_role, user_role])
            
            # Create admin user
            admin_user = User(
                id=str(uuid.uuid4()),
                email="admin@logos.ai",
                username="admin",
                hashed_password=bcrypt.hashpw("admin123".encode(), bcrypt.gensalt()).decode(),
                is_active=True,
                is_verified=True,
                is_admin=True,
                created_at=datetime.utcnow()
            )
            admin_user.roles.append(admin_role)
            session.add(admin_user)
            
            # Create admin wallet
            admin_wallet = Wallet(
                id=str(uuid.uuid4()),
                user_id=admin_user.id,
                balance=1000.0,
                currency="USD"
            )
            session.add(admin_wallet)
            
            # Create marketplace categories
            categories = [
                Category(
                    id=str(uuid.uuid4()),
                    name="AI Agents",
                    slug="ai-agents",
                    description="Specialized AI agents for various tasks"
                ),
                Category(
                    id=str(uuid.uuid4()),
                    name="Templates",
                    slug="templates",
                    description="Ready-to-use templates and prompts"
                ),
                Category(
                    id=str(uuid.uuid4()),
                    name="Datasets",
                    slug="datasets",
                    description="Training data and datasets"
                ),
                Category(
                    id=str(uuid.uuid4()),
                    name="Models",
                    slug="models",
                    description="Pre-trained AI models"
                )
            ]
            session.add_all(categories)
            
            # Create sample marketplace items
            sample_items = [
                MarketplaceItem(
                    id=str(uuid.uuid4()),
                    owner_id=admin_user.id,
                    title="Advanced Code Assistant",
                    description="AI agent specialized in code generation and debugging",
                    price=29.99,
                    category_id=categories[0].id,
                    status="active",
                    metadata={
                        "capabilities": ["code_generation", "debugging", "refactoring"],
                        "languages": ["python", "javascript", "java", "go"]
                    }
                ),
                MarketplaceItem(
                    id=str(uuid.uuid4()),
                    owner_id=admin_user.id,
                    title="Marketing Content Generator",
                    description="Generate marketing copy, social media posts, and ad content",
                    price=19.99,
                    category_id=categories[1].id,
                    status="active",
                    metadata={
                        "content_types": ["social_media", "blog_posts", "ads", "email"],
                        "tones": ["professional", "casual", "persuasive"]
                    }
                ),
                MarketplaceItem(
                    id=str(uuid.uuid4()),
                    owner_id=admin_user.id,
                    title="Customer Support Dataset",
                    description="10,000+ annotated customer support conversations",
                    price=99.99,
                    category_id=categories[2].id,
                    status="active",
                    metadata={
                        "size": "10000",
                        "format": "json",
                        "languages": ["en", "es", "fr"]
                    }
                )
            ]
            session.add_all(sample_items)
            
            # Create sample AI agents
            sample_agents = [
                AgentModel(
                    id=str(uuid.uuid4()),
                    name="Code Assistant",
                    type="specialized",
                    description="Expert in software development",
                    capabilities=["code_generation", "debugging", "refactoring"],
                    config={
                        "model": "claude-3-opus",
                        "temperature": 0.3,
                        "max_tokens": 4000
                    },
                    is_active=True
                ),
                AgentModel(
                    id=str(uuid.uuid4()),
                    name="Data Analyst",
                    type="specialized",
                    description="Expert in data analysis and visualization",
                    capabilities=["data_analysis", "visualization", "statistics"],
                    config={
                        "model": "claude-3-opus",
                        "temperature": 0.5,
                        "max_tokens": 3000
                    },
                    is_active=True
                )
            ]
            session.add_all(sample_agents)
            
            # Commit all changes
            await session.commit()
            logger.info("Initial data created successfully")
            
            # Verify data
            user_count = len(await session.execute(select(User)).scalars().all())
            item_count = len(await session.execute(select(MarketplaceItem)).scalars().all())
            agent_count = len(await session.execute(select(AgentModel)).scalars().all())
            
            logger.info(f"Database initialized with:")
            logger.info(f"  - {user_count} users")
            logger.info(f"  - {item_count} marketplace items")
            logger.info(f"  - {agent_count} AI agents")
            logger.info(f"  - {len(categories)} categories")
            
        await engine.dispose()
        
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        raise

if __name__ == "__main__":
    # Add missing import
    from sqlalchemy import select
    
    asyncio.run(init_db())
    print("\n✅ Database initialized successfully!")
    print("\nAdmin credentials:")
    print("  Email: admin@logos.ai")
    print("  Password: admin123")
    print("\nYou can now start the application with:")
    print("  python -m uvicorn src.api.main:app --reload")