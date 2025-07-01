"""API endpoints for AI Model Registry."""

from typing import List, Optional, Dict, Any
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field, validator

from ...infrastructure.database import get_db
from ...services.model_registry.registry import AIModelRegistry, ModelProvider, ModelCapability
from ...api.deps import get_current_user, get_current_admin_user
from ...shared.models.user import User
from ...shared.models.ai_registry import AIModelUsage, AIModelReview
from ...shared.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/v1/ai-registry", tags=["AI Model Registry"])

# Initialize registry
model_registry = AIModelRegistry()


# Pydantic schemas
class ModelFilters(BaseModel):
    """Filters for model search."""
    provider: Optional[ModelProvider] = None
    model_type: Optional[str] = None
    capabilities: Optional[List[ModelCapability]] = None
    tags: Optional[List[str]] = None
    min_context_window: Optional[int] = None
    max_price_per_1k_tokens: Optional[Decimal] = None


class ModelRegistrationRequest(BaseModel):
    """Request for registering a new model."""
    name: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10)
    model_type: str
    framework: str
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ModelVersionRequest(BaseModel):
    """Request for creating a model version."""
    version: str = Field(..., min_length=1, max_length=50)
    artifact_path: str
    description: Optional[str] = None
    metrics: Optional[Dict[str, float]] = None
    parameters: Optional[Dict[str, Any]] = None
    training_data: Optional[Dict[str, Any]] = None


class ModelReviewRequest(BaseModel):
    """Request for submitting a model review."""
    rating: int = Field(..., ge=1, le=5)
    review_text: Optional[str] = Field(None, max_length=2000)
    performance_metrics: Optional[Dict[str, Any]] = None


class ModelUsageRequest(BaseModel):
    """Request for tracking model usage."""
    model_id: str
    usage_type: str
    tokens_used: Optional[Dict[str, int]] = None
    images_generated: Optional[int] = None
    audio_minutes: Optional[float] = None
    cost: Decimal = Field(default=Decimal("0"), ge=0)


@router.get("/models")
async def list_marketplace_models(
    filters: ModelFilters = Depends(),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """List available AI models in the marketplace with filtering."""
    try:
        models, total_count = await model_registry.get_marketplace_models(
            db=db,
            provider=filters.provider,
            model_type=filters.model_type,
            capabilities=filters.capabilities,
            tags=filters.tags,
            min_context_window=filters.min_context_window,
            max_price_per_1k_tokens=filters.max_price_per_1k_tokens,
            offset=offset,
            limit=limit
        )
        
        return {
            "models": models,
            "total_count": total_count,
            "offset": offset,
            "limit": limit
        }
        
    except Exception as e:
        logger.error(f"Failed to list marketplace models: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve models"
        )


@router.get("/models/{model_id}")
async def get_model_details(
    model_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get detailed information about a specific model."""
    try:
        model = await model_registry.get_model(db=db, model_id=model_id)
        
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model {model_id} not found"
            )
        
        # Get pricing details
        pricing = await model_registry.get_model_pricing(db=db, model_id=model_id)
        
        # Get latest reviews
        reviews, review_count = await model_registry.get_model_reviews(
            db=db,
            model_id=model_id,
            limit=5
        )
        
        return {
            "model": model,
            "pricing": pricing,
            "recent_reviews": reviews,
            "total_reviews": review_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get model details: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve model details"
        )


@router.post("/models", dependencies=[Depends(get_current_admin_user)])
async def register_model(
    request: ModelRegistrationRequest,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Register a new AI model (admin only)."""
    try:
        model = await model_registry.register_model(
            db=db,
            name=request.name,
            description=request.description,
            model_type=request.model_type,
            framework=request.framework,
            owner_id=current_user.id,
            tags=request.tags,
            metadata=request.metadata
        )
        
        return {
            "message": "Model registered successfully",
            "model": model
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to register model: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register model"
        )


@router.post("/models/{model_id}/versions")
async def create_model_version(
    model_id: int,
    request: ModelVersionRequest,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new version for a model (admin/model owner only)."""
    try:
        # Check if user owns the model or is admin
        model = await model_registry.get_model(db=db, model_id=model_id)
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model {model_id} not found"
            )
        
        if model.owner_id != current_user.id and not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to create versions for this model"
            )
        
        version = await model_registry.create_version(
            db=db,
            model_id=model_id,
            version=request.version,
            artifact_path=request.artifact_path,
            description=request.description,
            metrics=request.metrics,
            parameters=request.parameters,
            training_data=request.training_data
        )
        
        return {
            "message": "Version created successfully",
            "version": version
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create model version: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create model version"
        )


@router.get("/models/{model_id}/versions")
async def list_model_versions(
    model_id: int,
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """List all versions of a model."""
    try:
        versions = await model_registry.list_versions(
            db=db,
            model_id=model_id,
            offset=offset,
            limit=limit
        )
        
        return {
            "versions": versions,
            "offset": offset,
            "limit": limit
        }
        
    except Exception as e:
        logger.error(f"Failed to list model versions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve model versions"
        )


@router.post("/models/{model_id}/usage")
async def track_model_usage(
    model_id: str,
    request: ModelUsageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Track usage of a model."""
    try:
        await model_registry.track_model_usage(
            db=db,
            user_id=current_user.id,
            model_id=model_id,
            usage_type=request.usage_type,
            tokens_used=request.tokens_used,
            images_generated=request.images_generated,
            audio_minutes=request.audio_minutes,
            cost=request.cost
        )
        
        return {"message": "Usage tracked successfully"}
        
    except Exception as e:
        logger.error(f"Failed to track model usage: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to track usage"
        )


@router.post("/models/{model_id}/reviews")
async def submit_model_review(
    model_id: str,
    request: ModelReviewRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submit a review for a model."""
    try:
        await model_registry.submit_model_review(
            db=db,
            user_id=current_user.id,
            model_id=model_id,
            rating=request.rating,
            review_text=request.review_text,
            performance_metrics=request.performance_metrics
        )
        
        return {"message": "Review submitted successfully"}
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to submit model review: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit review"
        )


@router.get("/models/{model_id}/reviews")
async def get_model_reviews(
    model_id: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get reviews for a model."""
    try:
        reviews, total_count = await model_registry.get_model_reviews(
            db=db,
            model_id=model_id,
            offset=offset,
            limit=limit
        )
        
        return {
            "reviews": reviews,
            "total_count": total_count,
            "offset": offset,
            "limit": limit
        }
        
    except Exception as e:
        logger.error(f"Failed to get model reviews: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve reviews"
        )


@router.get("/models/{model_id}/pricing")
async def get_model_pricing(
    model_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get detailed pricing information for a model."""
    try:
        pricing = await model_registry.get_model_pricing(
            db=db,
            model_id=model_id
        )
        
        return pricing
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to get model pricing: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve pricing"
        )


@router.post("/models/compare")
async def compare_models(
    model_ids: List[str] = Body(..., min_items=2, max_items=5),
    db: AsyncSession = Depends(get_db)
):
    """Compare multiple AI models."""
    try:
        comparison_data = []
        
        for model_id in model_ids:
            model = await model_registry.get_model(db=db, model_id=model_id)
            if model:
                pricing = await model_registry.get_model_pricing(db=db, model_id=model_id)
                comparison_data.append({
                    "model": model,
                    "pricing": pricing
                })
        
        if len(comparison_data) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least 2 valid models required for comparison"
            )
        
        return {
            "comparison": comparison_data,
            "model_count": len(comparison_data)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to compare models: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to compare models"
        )


@router.put("/models/{model_id}/deprecate", dependencies=[Depends(get_current_admin_user)])
async def deprecate_model_version(
    model_id: int,
    version_id: int,
    deprecation_date: str,
    migration_guide: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Mark a model version as deprecated (admin only)."""
    try:
        from datetime import datetime
        
        deprecation_dt = datetime.fromisoformat(deprecation_date)
        
        await model_registry.deprecate_model_version(
            db=db,
            version_id=version_id,
            deprecation_date=deprecation_dt,
            migration_guide=migration_guide
        )
        
        return {"message": "Version marked as deprecated"}
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to deprecate model version: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to deprecate version"
        )