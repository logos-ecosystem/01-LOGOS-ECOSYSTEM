"""AI Model Registry for managing model versions and metadata."""

import json
import hashlib
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import asyncio
from enum import Enum
from decimal import Decimal
from sqlalchemy import select, and_, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from ...infrastructure.database import Base
from ...shared.models.ai import AIModel, ModelVersion, ModelMetrics
from ...infrastructure.database import get_db
from ...shared.utils.logger import get_logger
from ...infrastructure.cache import cache_manager
from ...services.monitoring import MetricsCollector

logger = get_logger(__name__)


class ModelProvider(str, Enum):
    """Supported AI model providers."""
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    GOOGLE = "google"
    META = "meta"
    MISTRAL = "mistral"
    CUSTOM = "custom"


class ModelCapability(str, Enum):
    """Model capabilities."""
    TEXT_GENERATION = "text_generation"
    CODE_GENERATION = "code_generation"
    IMAGE_GENERATION = "image_generation"
    IMAGE_ANALYSIS = "image_analysis"
    AUDIO_TRANSCRIPTION = "audio_transcription"
    TRANSLATION = "translation"
    EMBEDDINGS = "embeddings"
    FUNCTION_CALLING = "function_calling"


# Marketplace models configuration
MARKETPLACE_MODELS = {
    "claude-opus-4": {
        "name": "Claude Opus 4",
        "provider": ModelProvider.ANTHROPIC,
        "model_type": "language_model",
        "description": "Most capable Claude model with 200k context window",
        "capabilities": [
            ModelCapability.TEXT_GENERATION,
            ModelCapability.CODE_GENERATION,
            ModelCapability.FUNCTION_CALLING,
            ModelCapability.IMAGE_ANALYSIS
        ],
        "context_window": 200000,
        "max_output_tokens": 4096,
        "pricing": {
            "input_per_1k_tokens": Decimal("0.015"),
            "output_per_1k_tokens": Decimal("0.075"),
            "currency": "USD"
        },
        "performance_metrics": {
            "average_latency_ms": 2500,
            "throughput_tokens_per_second": 50,
            "accuracy_score": 0.95
        },
        "tags": ["premium", "multimodal", "coding", "analysis"],
        "is_active": True,
        "requires_approval": False
    },
    "gpt-4-turbo": {
        "name": "GPT-4 Turbo",
        "provider": ModelProvider.OPENAI,
        "model_type": "language_model",
        "description": "Latest GPT-4 with 128k context and vision capabilities",
        "capabilities": [
            ModelCapability.TEXT_GENERATION,
            ModelCapability.CODE_GENERATION,
            ModelCapability.FUNCTION_CALLING,
            ModelCapability.IMAGE_ANALYSIS
        ],
        "context_window": 128000,
        "max_output_tokens": 4096,
        "pricing": {
            "input_per_1k_tokens": Decimal("0.01"),
            "output_per_1k_tokens": Decimal("0.03"),
            "currency": "USD"
        },
        "performance_metrics": {
            "average_latency_ms": 3000,
            "throughput_tokens_per_second": 40,
            "accuracy_score": 0.93
        },
        "tags": ["popular", "multimodal", "coding", "general"],
        "is_active": True,
        "requires_approval": False
    },
    "gpt-4": {
        "name": "GPT-4",
        "provider": ModelProvider.OPENAI,
        "model_type": "language_model",
        "description": "Advanced reasoning and generation capabilities",
        "capabilities": [
            ModelCapability.TEXT_GENERATION,
            ModelCapability.CODE_GENERATION,
            ModelCapability.FUNCTION_CALLING
        ],
        "context_window": 8192,
        "max_output_tokens": 4096,
        "pricing": {
            "input_per_1k_tokens": Decimal("0.03"),
            "output_per_1k_tokens": Decimal("0.06"),
            "currency": "USD"
        },
        "performance_metrics": {
            "average_latency_ms": 3500,
            "throughput_tokens_per_second": 30,
            "accuracy_score": 0.92
        },
        "tags": ["stable", "reasoning", "coding"],
        "is_active": True,
        "requires_approval": False
    },
    "claude-3-sonnet": {
        "name": "Claude 3 Sonnet",
        "provider": ModelProvider.ANTHROPIC,
        "model_type": "language_model",
        "description": "Balanced performance and cost Claude model",
        "capabilities": [
            ModelCapability.TEXT_GENERATION,
            ModelCapability.CODE_GENERATION,
            ModelCapability.IMAGE_ANALYSIS
        ],
        "context_window": 200000,
        "max_output_tokens": 4096,
        "pricing": {
            "input_per_1k_tokens": Decimal("0.003"),
            "output_per_1k_tokens": Decimal("0.015"),
            "currency": "USD"
        },
        "performance_metrics": {
            "average_latency_ms": 2000,
            "throughput_tokens_per_second": 60,
            "accuracy_score": 0.91
        },
        "tags": ["balanced", "efficient", "multimodal"],
        "is_active": True,
        "requires_approval": False
    },
    "gemini-pro": {
        "name": "Gemini Pro",
        "provider": ModelProvider.GOOGLE,
        "model_type": "language_model",
        "description": "Google's multimodal AI model",
        "capabilities": [
            ModelCapability.TEXT_GENERATION,
            ModelCapability.CODE_GENERATION,
            ModelCapability.IMAGE_ANALYSIS
        ],
        "context_window": 32768,
        "max_output_tokens": 2048,
        "pricing": {
            "input_per_1k_tokens": Decimal("0.00025"),
            "output_per_1k_tokens": Decimal("0.0005"),
            "currency": "USD"
        },
        "performance_metrics": {
            "average_latency_ms": 2200,
            "throughput_tokens_per_second": 55,
            "accuracy_score": 0.89
        },
        "tags": ["affordable", "multimodal", "google"],
        "is_active": True,
        "requires_approval": False
    },
    "llama-3-70b": {
        "name": "Llama 3 70B",
        "provider": ModelProvider.META,
        "model_type": "language_model",
        "description": "Open-source large language model by Meta",
        "capabilities": [
            ModelCapability.TEXT_GENERATION,
            ModelCapability.CODE_GENERATION
        ],
        "context_window": 8192,
        "max_output_tokens": 2048,
        "pricing": {
            "input_per_1k_tokens": Decimal("0.0008"),
            "output_per_1k_tokens": Decimal("0.0016"),
            "currency": "USD"
        },
        "performance_metrics": {
            "average_latency_ms": 1800,
            "throughput_tokens_per_second": 70,
            "accuracy_score": 0.88
        },
        "tags": ["open-source", "efficient", "community"],
        "is_active": True,
        "requires_approval": False
    },
    "mistral-large": {
        "name": "Mistral Large",
        "provider": ModelProvider.MISTRAL,
        "model_type": "language_model",
        "description": "Mistral's flagship model with strong reasoning",
        "capabilities": [
            ModelCapability.TEXT_GENERATION,
            ModelCapability.CODE_GENERATION,
            ModelCapability.FUNCTION_CALLING
        ],
        "context_window": 32768,
        "max_output_tokens": 4096,
        "pricing": {
            "input_per_1k_tokens": Decimal("0.004"),
            "output_per_1k_tokens": Decimal("0.012"),
            "currency": "USD"
        },
        "performance_metrics": {
            "average_latency_ms": 1500,
            "throughput_tokens_per_second": 80,
            "accuracy_score": 0.90
        },
        "tags": ["european", "fast", "coding"],
        "is_active": True,
        "requires_approval": False
    },
    "dall-e-3": {
        "name": "DALL-E 3",
        "provider": ModelProvider.OPENAI,
        "model_type": "image_generation",
        "description": "Advanced image generation from text prompts",
        "capabilities": [
            ModelCapability.IMAGE_GENERATION
        ],
        "context_window": 4000,  # prompt length
        "max_output_tokens": 0,  # not applicable
        "pricing": {
            "per_image_1024x1024": Decimal("0.04"),
            "per_image_1024x1792": Decimal("0.08"),
            "per_image_1792x1024": Decimal("0.08"),
            "currency": "USD"
        },
        "performance_metrics": {
            "average_latency_ms": 15000,
            "images_per_minute": 4,
            "quality_score": 0.94
        },
        "tags": ["image", "creative", "art"],
        "is_active": True,
        "requires_approval": False
    },
    "whisper-large": {
        "name": "Whisper Large V3",
        "provider": ModelProvider.OPENAI,
        "model_type": "audio_transcription",
        "description": "State-of-the-art speech recognition",
        "capabilities": [
            ModelCapability.AUDIO_TRANSCRIPTION,
            ModelCapability.TRANSLATION
        ],
        "context_window": 0,  # audio length in seconds
        "max_output_tokens": 0,  # not applicable
        "pricing": {
            "per_minute": Decimal("0.006"),
            "currency": "USD"
        },
        "performance_metrics": {
            "average_latency_ms": 5000,
            "accuracy_score": 0.96,
            "languages_supported": 99
        },
        "tags": ["audio", "transcription", "multilingual"],
        "is_active": True,
        "requires_approval": False
    }
}


class AIModelRegistry:
    """Central registry for AI model management - both marketplace and custom models."""
    
    def __init__(self):
        self.metrics_collector = MetricsCollector()
        # Use local storage path for development
        self.model_storage_path = Path("./data/models")
        self.model_storage_path.mkdir(parents=True, exist_ok=True)
        self.marketplace_models = MARKETPLACE_MODELS
        self._initialized = False
    
    async def initialize_marketplace_models(self, db: AsyncSession):
        """Initialize marketplace models in the database."""
        if self._initialized:
            return
        
        try:
            for model_id, config in self.marketplace_models.items():
                # Check if model exists
                existing = await db.execute(
                    select(AIModel).where(
                        and_(
                            AIModel.model_id == model_id,
                            AIModel.is_marketplace_model == True
                        )
                    )
                )
                
                if not existing.scalar_one_or_none():
                    # Create marketplace model
                    model = AIModel(
                        model_id=model_id,
                        name=config["name"],
                        description=config["description"],
                        model_type=config["model_type"],
                        provider=config["provider"],
                        capabilities=config["capabilities"],
                        context_window=config["context_window"],
                        max_output_tokens=config["max_output_tokens"],
                        pricing=config["pricing"],
                        performance_metrics=config["performance_metrics"],
                        tags=config["tags"],
                        is_active=config["is_active"],
                        is_marketplace_model=True,
                        requires_approval=config["requires_approval"],
                        created_at=datetime.utcnow()
                    )
                    db.add(model)
            
            await db.commit()
            self._initialized = True
            logger.info("Marketplace models initialized")
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to initialize marketplace models: {str(e)}")
            raise
    
    async def get_marketplace_models(
        self,
        db: AsyncSession,
        provider: Optional[ModelProvider] = None,
        model_type: Optional[str] = None,
        capabilities: Optional[List[ModelCapability]] = None,
        tags: Optional[List[str]] = None,
        min_context_window: Optional[int] = None,
        max_price_per_1k_tokens: Optional[Decimal] = None,
        offset: int = 0,
        limit: int = 20
    ) -> Tuple[List[AIModel], int]:
        """Get marketplace models with filtering."""
        try:
            # Ensure marketplace models are initialized
            await self.initialize_marketplace_models(db)
            
            query = select(AIModel).where(
                and_(
                    AIModel.is_marketplace_model == True,
                    AIModel.is_active == True
                )
            )
            
            # Apply filters
            if provider:
                query = query.where(AIModel.provider == provider)
            
            if model_type:
                query = query.where(AIModel.model_type == model_type)
            
            if capabilities:
                for capability in capabilities:
                    query = query.where(AIModel.capabilities.contains([capability]))
            
            if tags:
                for tag in tags:
                    query = query.where(AIModel.tags.contains([tag]))
            
            if min_context_window:
                query = query.where(AIModel.context_window >= min_context_window)
            
            if max_price_per_1k_tokens:
                query = query.where(
                    or_(
                        AIModel.pricing["input_per_1k_tokens"].astext.cast(Decimal) <= max_price_per_1k_tokens,
                        AIModel.pricing["output_per_1k_tokens"].astext.cast(Decimal) <= max_price_per_1k_tokens
                    )
                )
            
            # Get total count
            count_query = select(func.count()).select_from(query.subquery())
            total_count = await db.scalar(count_query)
            
            # Apply pagination
            query = query.offset(offset).limit(limit)
            result = await db.execute(query)
            models = result.scalars().all()
            
            return models, total_count
            
        except Exception as e:
            logger.error(f"Failed to get marketplace models: {str(e)}")
            raise
    
    async def get_model_pricing(
        self,
        db: AsyncSession,
        model_id: str
    ) -> Dict[str, Any]:
        """Get detailed pricing information for a model."""
        try:
            model = await db.execute(
                select(AIModel).where(AIModel.model_id == model_id)
            )
            model = model.scalar_one_or_none()
            
            if not model:
                raise ValueError(f"Model {model_id} not found")
            
            pricing = model.pricing.copy()
            
            # Calculate estimated costs for common usage
            if model.model_type == "language_model":
                input_price = Decimal(str(pricing.get("input_per_1k_tokens", 0)))
                output_price = Decimal(str(pricing.get("output_per_1k_tokens", 0)))
                
                pricing["estimated_costs"] = {
                    "chat_conversation": {
                        "tokens": {"input": 1000, "output": 500},
                        "cost": input_price + (output_price * Decimal("0.5"))
                    },
                    "document_analysis": {
                        "tokens": {"input": 5000, "output": 1000},
                        "cost": (input_price * 5) + output_price
                    },
                    "code_generation": {
                        "tokens": {"input": 500, "output": 2000},
                        "cost": (input_price * Decimal("0.5")) + (output_price * 2)
                    }
                }
            
            return pricing
            
        except Exception as e:
            logger.error(f"Failed to get model pricing: {str(e)}")
            raise
    
    async def track_model_usage(
        self,
        db: AsyncSession,
        user_id: int,
        model_id: str,
        usage_type: str,
        tokens_used: Optional[Dict[str, int]] = None,
        images_generated: Optional[int] = None,
        audio_minutes: Optional[float] = None,
        cost: Decimal = Decimal("0")
    ):
        """Track usage of a model."""
        try:
            from ...shared.models.ai_registry import AIModelUsage
            
            usage = AIModelUsage(
                user_id=user_id,
                model_id=model_id,
                usage_type=usage_type,
                tokens_used=tokens_used,
                images_generated=images_generated,
                audio_minutes=audio_minutes,
                cost=cost,
                timestamp=datetime.utcnow()
            )
            
            db.add(usage)
            await db.commit()
            
            # Update metrics
            await self.metrics_collector.record_event(
                "model_usage",
                {
                    "model_id": model_id,
                    "usage_type": usage_type,
                    "cost": float(cost)
                }
            )
            
            # Update model statistics
            await self._update_model_statistics(db, model_id)
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to track model usage: {str(e)}")
            raise
    
    async def submit_model_review(
        self,
        db: AsyncSession,
        user_id: int,
        model_id: str,
        rating: int,
        review_text: Optional[str] = None,
        performance_metrics: Optional[Dict[str, Any]] = None
    ):
        """Submit a review for a model."""
        try:
            from ...shared.models.ai_registry import AIModelReview
            
            # Check if user has used the model
            usage = await db.execute(
                select(AIModelUsage).where(
                    and_(
                        AIModelUsage.user_id == user_id,
                        AIModelUsage.model_id == model_id
                    )
                ).limit(1)
            )
            
            if not usage.scalar_one_or_none():
                raise ValueError("You must use a model before reviewing it")
            
            # Check for existing review
            existing = await db.execute(
                select(AIModelReview).where(
                    and_(
                        AIModelReview.user_id == user_id,
                        AIModelReview.model_id == model_id
                    )
                )
            )
            
            review = existing.scalar_one_or_none()
            
            if review:
                # Update existing review
                review.rating = rating
                review.review_text = review_text
                review.performance_metrics = performance_metrics
                review.updated_at = datetime.utcnow()
            else:
                # Create new review
                review = AIModelReview(
                    user_id=user_id,
                    model_id=model_id,
                    rating=rating,
                    review_text=review_text,
                    performance_metrics=performance_metrics,
                    created_at=datetime.utcnow()
                )
                db.add(review)
            
            await db.commit()
            
            # Update model rating
            await self._update_model_rating(db, model_id)
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to submit model review: {str(e)}")
            raise
    
    async def get_model_reviews(
        self,
        db: AsyncSession,
        model_id: str,
        offset: int = 0,
        limit: int = 20
    ) -> Tuple[List[Any], int]:
        """Get reviews for a model."""
        try:
            from ...shared.models.ai_registry import AIModelReview
            
            query = select(AIModelReview).where(
                AIModelReview.model_id == model_id
            ).order_by(AIModelReview.created_at.desc())
            
            # Get total count
            count_query = select(func.count()).where(
                AIModelReview.model_id == model_id
            )
            total_count = await db.scalar(count_query)
            
            # Apply pagination
            query = query.offset(offset).limit(limit)
            result = await db.execute(query)
            reviews = result.scalars().all()
            
            return reviews, total_count
            
        except Exception as e:
            logger.error(f"Failed to get model reviews: {str(e)}")
            raise
    
    async def deprecate_model_version(
        self,
        db: AsyncSession,
        version_id: int,
        deprecation_date: datetime,
        migration_guide: Optional[str] = None
    ):
        """Mark a model version as deprecated."""
        try:
            version = await db.get(ModelVersion, version_id)
            if not version:
                raise ValueError(f"Version {version_id} not found")
            
            version.is_deprecated = True
            version.deprecation_date = deprecation_date
            version.migration_guide = migration_guide
            version.updated_at = datetime.utcnow()
            
            await db.commit()
            
            # Notify users using this version
            await self._notify_deprecation(db, version_id, deprecation_date)
            
            logger.info(f"Deprecated version {version_id}")
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to deprecate version: {str(e)}")
            raise
    
    async def _update_model_statistics(self, db: AsyncSession, model_id: str):
        """Update model usage statistics."""
        try:
            from ...shared.models.ai_registry import AIModelUsage
            
            # Calculate statistics
            stats = await db.execute(
                select(
                    func.count(AIModelUsage.id).label("total_uses"),
                    func.sum(AIModelUsage.cost).label("total_revenue"),
                    func.count(func.distinct(AIModelUsage.user_id)).label("unique_users")
                ).where(AIModelUsage.model_id == model_id)
            )
            
            stats = stats.one()
            
            # Update model
            model = await db.execute(
                select(AIModel).where(AIModel.model_id == model_id)
            )
            model = model.scalar_one_or_none()
            
            if model:
                model.usage_statistics = {
                    "total_uses": stats.total_uses or 0,
                    "total_revenue": float(stats.total_revenue or 0),
                    "unique_users": stats.unique_users or 0,
                    "last_updated": datetime.utcnow().isoformat()
                }
                await db.commit()
                
        except Exception as e:
            logger.error(f"Failed to update model statistics: {str(e)}")
    
    async def _update_model_rating(self, db: AsyncSession, model_id: str):
        """Update model average rating."""
        try:
            from ...shared.models.ai_registry import AIModelReview
            
            # Calculate average rating
            rating_stats = await db.execute(
                select(
                    func.avg(AIModelReview.rating).label("avg_rating"),
                    func.count(AIModelReview.id).label("review_count")
                ).where(AIModelReview.model_id == model_id)
            )
            
            stats = rating_stats.one()
            
            # Update model
            model = await db.execute(
                select(AIModel).where(AIModel.model_id == model_id)
            )
            model = model.scalar_one_or_none()
            
            if model:
                model.average_rating = float(stats.avg_rating or 0)
                model.review_count = stats.review_count or 0
                await db.commit()
                
        except Exception as e:
            logger.error(f"Failed to update model rating: {str(e)}")
    
    async def _notify_deprecation(
        self,
        db: AsyncSession,
        version_id: int,
        deprecation_date: datetime
    ):
        """Notify users about version deprecation."""
        # Implementation would send notifications to affected users
        pass
    
    async def register_model(
        self,
        db: AsyncSession,
        name: str,
        description: str,
        model_type: str,
        framework: str,
        owner_id: int,
        tags: List[str] = None,
        metadata: Dict[str, Any] = None
    ) -> AIModel:
        """Register a new AI model."""
        try:
            # Check if model already exists
            existing = await db.execute(
                select(AIModel).where(
                    and_(AIModel.name == name, AIModel.owner_id == owner_id)
                )
            )
            if existing.scalar_one_or_none():
                raise ValueError(f"Model '{name}' already exists for this owner")
            
            # Create model record
            model = AIModel(
                name=name,
                description=description,
                model_type=model_type,
                framework=framework,
                owner_id=owner_id,
                tags=tags or [],
                metadata=metadata or {},
                created_at=datetime.utcnow()
            )
            
            db.add(model)
            await db.commit()
            await db.refresh(model)
            
            # Log metrics
            await self.metrics_collector.record_event(
                "model_registered",
                {"model_id": model.id, "framework": framework}
            )
            
            logger.info(f"Registered model: {name} (ID: {model.id})")
            return model
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to register model: {str(e)}")
            raise
    
    async def create_version(
        self,
        db: AsyncSession,
        model_id: int,
        version: str,
        artifact_path: str,
        description: str = None,
        metrics: Dict[str, float] = None,
        parameters: Dict[str, Any] = None,
        training_data: Dict[str, Any] = None
    ) -> ModelVersion:
        """Create a new version for a model."""
        try:
            # Verify model exists
            model = await db.get(AIModel, model_id)
            if not model:
                raise ValueError(f"Model {model_id} not found")
            
            # Check version doesn't exist
            existing = await db.execute(
                select(ModelVersion).where(
                    and_(
                        ModelVersion.model_id == model_id,
                        ModelVersion.version == version
                    )
                )
            )
            if existing.scalar_one_or_none():
                raise ValueError(f"Version {version} already exists for model {model_id}")
            
            # Calculate artifact checksum
            checksum = await self._calculate_checksum(artifact_path)
            
            # Create version record
            model_version = ModelVersion(
                model_id=model_id,
                version=version,
                description=description,
                artifact_path=artifact_path,
                checksum=checksum,
                parameters=parameters or {},
                training_data=training_data or {},
                created_at=datetime.utcnow()
            )
            
            db.add(model_version)
            
            # Store metrics if provided
            if metrics:
                for metric_name, value in metrics.items():
                    metric = ModelMetrics(
                        version_id=model_version.id,
                        metric_name=metric_name,
                        value=value,
                        timestamp=datetime.utcnow()
                    )
                    db.add(metric)
            
            await db.commit()
            await db.refresh(model_version)
            
            # Update model's latest version
            model.latest_version_id = model_version.id
            model.updated_at = datetime.utcnow()
            await db.commit()
            
            # Clear cache
            await cache.delete(f"model:{model_id}:versions")
            
            logger.info(f"Created version {version} for model {model_id}")
            return model_version
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to create model version: {str(e)}")
            raise
    
    async def get_model(
        self,
        db: AsyncSession,
        model_id: int = None,
        name: str = None,
        owner_id: int = None
    ) -> Optional[AIModel]:
        """Get model by ID or name."""
        try:
            query = select(AIModel)
            
            if model_id:
                query = query.where(AIModel.id == model_id)
            elif name and owner_id:
                query = query.where(
                    and_(AIModel.name == name, AIModel.owner_id == owner_id)
                )
            else:
                raise ValueError("Either model_id or (name, owner_id) required")
            
            result = await db.execute(query)
            return result.scalar_one_or_none()
            
        except Exception as e:
            logger.error(f"Failed to get model: {str(e)}")
            raise
    
    async def list_models(
        self,
        db: AsyncSession,
        owner_id: Optional[int] = None,
        model_type: Optional[str] = None,
        framework: Optional[str] = None,
        tags: Optional[List[str]] = None,
        offset: int = 0,
        limit: int = 20
    ) -> List[AIModel]:
        """List models with filtering."""
        try:
            query = select(AIModel)
            
            if owner_id:
                query = query.where(AIModel.owner_id == owner_id)
            if model_type:
                query = query.where(AIModel.model_type == model_type)
            if framework:
                query = query.where(AIModel.framework == framework)
            if tags:
                query = query.where(AIModel.tags.contains(tags))
            
            query = query.offset(offset).limit(limit)
            result = await db.execute(query)
            return result.scalars().all()
            
        except Exception as e:
            logger.error(f"Failed to list models: {str(e)}")
            raise
    
    async def get_version(
        self,
        db: AsyncSession,
        version_id: int = None,
        model_id: int = None,
        version: str = None
    ) -> Optional[ModelVersion]:
        """Get specific model version."""
        try:
            # Try cache first
            cache_key = f"version:{version_id or f'{model_id}:{version}'}"
            cached = await cache.get(cache_key)
            if cached:
                return ModelVersion(**json.loads(cached))
            
            query = select(ModelVersion)
            
            if version_id:
                query = query.where(ModelVersion.id == version_id)
            elif model_id and version:
                query = query.where(
                    and_(
                        ModelVersion.model_id == model_id,
                        ModelVersion.version == version
                    )
                )
            else:
                raise ValueError("Either version_id or (model_id, version) required")
            
            result = await db.execute(query)
            version_obj = result.scalar_one_or_none()
            
            if version_obj:
                # Cache for 1 hour
                await cache.set(
                    cache_key,
                    json.dumps(version_obj.model_dump()),
                    expire=3600
                )
            
            return version_obj
            
        except Exception as e:
            logger.error(f"Failed to get version: {str(e)}")
            raise
    
    async def list_versions(
        self,
        db: AsyncSession,
        model_id: int,
        offset: int = 0,
        limit: int = 20
    ) -> List[ModelVersion]:
        """List all versions of a model."""
        try:
            # Check cache
            cache_key = f"model:{model_id}:versions"
            cached = await cache.get(cache_key)
            if cached:
                versions = json.loads(cached)
                return [ModelVersion(**v) for v in versions[offset:offset+limit]]
            
            query = select(ModelVersion).where(
                ModelVersion.model_id == model_id
            ).order_by(ModelVersion.created_at.desc())
            
            result = await db.execute(query)
            versions = result.scalars().all()
            
            # Cache all versions
            await cache.set(
                cache_key,
                json.dumps([v.model_dump() for v in versions]),
                expire=3600
            )
            
            return versions[offset:offset+limit]
            
        except Exception as e:
            logger.error(f"Failed to list versions: {str(e)}")
            raise
    
    async def update_version_metrics(
        self,
        db: AsyncSession,
        version_id: int,
        metrics: Dict[str, float]
    ):
        """Update or add metrics for a model version."""
        try:
            for metric_name, value in metrics.items():
                # Check if metric exists
                existing = await db.execute(
                    select(ModelMetrics).where(
                        and_(
                            ModelMetrics.version_id == version_id,
                            ModelMetrics.metric_name == metric_name
                        )
                    )
                )
                metric = existing.scalar_one_or_none()
                
                if metric:
                    # Update existing
                    metric.value = value
                    metric.timestamp = datetime.utcnow()
                else:
                    # Create new
                    metric = ModelMetrics(
                        version_id=version_id,
                        metric_name=metric_name,
                        value=value,
                        timestamp=datetime.utcnow()
                    )
                    db.add(metric)
            
            await db.commit()
            
            # Clear cache
            await cache.delete(f"version:{version_id}:metrics")
            
            logger.info(f"Updated metrics for version {version_id}")
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to update metrics: {str(e)}")
            raise
    
    async def get_version_metrics(
        self,
        db: AsyncSession,
        version_id: int,
        metric_names: Optional[List[str]] = None
    ) -> Dict[str, float]:
        """Get metrics for a model version."""
        try:
            # Check cache
            cache_key = f"version:{version_id}:metrics"
            cached = await cache.get(cache_key)
            if cached:
                metrics = json.loads(cached)
                if metric_names:
                    return {k: v for k, v in metrics.items() if k in metric_names}
                return metrics
            
            query = select(ModelMetrics).where(
                ModelMetrics.version_id == version_id
            )
            
            if metric_names:
                query = query.where(ModelMetrics.metric_name.in_(metric_names))
            
            result = await db.execute(query)
            metrics_list = result.scalars().all()
            
            metrics = {m.metric_name: m.value for m in metrics_list}
            
            # Cache for 5 minutes
            await cache.set(cache_key, json.dumps(metrics), expire=300)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Failed to get metrics: {str(e)}")
            raise
    
    async def compare_versions(
        self,
        db: AsyncSession,
        version_ids: List[int]
    ) -> Dict[str, Any]:
        """Compare multiple model versions."""
        try:
            versions = []
            metrics_comparison = {}
            
            for version_id in version_ids:
                # Get version
                version = await self.get_version(db, version_id=version_id)
                if not version:
                    continue
                
                versions.append(version)
                
                # Get metrics
                metrics = await self.get_version_metrics(db, version_id)
                for metric_name, value in metrics.items():
                    if metric_name not in metrics_comparison:
                        metrics_comparison[metric_name] = {}
                    metrics_comparison[metric_name][version.version] = value
            
            return {
                "versions": versions,
                "metrics_comparison": metrics_comparison,
                "comparison_date": datetime.utcnow()
            }
            
        except Exception as e:
            logger.error(f"Failed to compare versions: {str(e)}")
            raise
    
    async def delete_version(
        self,
        db: AsyncSession,
        version_id: int
    ):
        """Delete a model version."""
        try:
            version = await db.get(ModelVersion, version_id)
            if not version:
                raise ValueError(f"Version {version_id} not found")
            
            # Check if it's the latest version
            model = await db.get(AIModel, version.model_id)
            if model.latest_version_id == version_id:
                # Find previous version
                prev_version = await db.execute(
                    select(ModelVersion).where(
                        and_(
                            ModelVersion.model_id == model.id,
                            ModelVersion.id != version_id
                        )
                    ).order_by(ModelVersion.created_at.desc()).limit(1)
                )
                prev = prev_version.scalar_one_or_none()
                model.latest_version_id = prev.id if prev else None
            
            # Delete metrics
            await db.execute(
                select(ModelMetrics).where(
                    ModelMetrics.version_id == version_id
                ).delete()
            )
            
            # Delete version
            await db.delete(version)
            await db.commit()
            
            # Clear cache
            await cache.delete(f"version:{version_id}")
            await cache.delete(f"model:{version.model_id}:versions")
            
            logger.info(f"Deleted version {version_id}")
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to delete version: {str(e)}")
            raise
    
    async def _calculate_checksum(self, file_path: str) -> str:
        """Calculate SHA256 checksum of a file."""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()