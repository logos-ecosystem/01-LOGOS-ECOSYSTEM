from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, case
from sqlalchemy.orm import joinedload, selectinload
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime

from ...infrastructure.database import get_db
from ...infrastructure.cache import cache_manager
from ...shared.models.user import User
from ...shared.models.marketplace import MarketplaceItem, Transaction
from ...shared.models.review import Review
from ...shared.models.wallet import Wallet, WalletTransaction
from ...shared.utils.logger import get_logger
from ..schemas.marketplace import (
    MarketplaceItemCreate, MarketplaceItemUpdate, MarketplaceItemResponse,
    MarketplaceItemListResponse, TransactionCreate, TransactionResponse,
    ReviewCreate, ReviewResponse, MarketplaceSearchParams
)
from .auth import get_current_user
from ...services.marketplace.enhanced_marketplace_service import EnhancedMarketplaceService

router = APIRouter()
logger = get_logger(__name__)
enhanced_marketplace = EnhancedMarketplaceService()


@router.get("/", response_model=MarketplaceItemListResponse)
async def list_marketplace_items(
    search_params: MarketplaceSearchParams = Depends(),
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> MarketplaceItemListResponse:
    """List marketplace items with advanced filtering and search."""
    # Build base query
    query = select(MarketplaceItem).where(
        and_(
            MarketplaceItem.is_active == True,
            MarketplaceItem.status == "active"
        )
    )
    
    # Apply filters
    if search_params.query:
        search_term = f"%{search_params.query}%"
        query = query.where(
            or_(
                MarketplaceItem.title.ilike(search_term),
                MarketplaceItem.description.ilike(search_term)
            )
        )
    
    if search_params.category:
        query = query.where(MarketplaceItem.category == search_params.category)
    
    if search_params.item_type:
        query = query.where(MarketplaceItem.item_type == search_params.item_type)
    
    if search_params.min_price is not None:
        query = query.where(MarketplaceItem.price >= search_params.min_price)
    
    if search_params.max_price is not None:
        query = query.where(MarketplaceItem.price <= search_params.max_price)
    
    if search_params.tags:
        for tag in search_params.tags:
            query = query.where(MarketplaceItem.tags.contains([tag]))
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply sorting
    if search_params.sort_by == "price":
        order_col = MarketplaceItem.price
    elif search_params.sort_by == "rating":
        order_col = MarketplaceItem.rating
    elif search_params.sort_by == "purchase_count":
        order_col = MarketplaceItem.purchase_count
    else:
        order_col = MarketplaceItem.created_at
    
    if search_params.sort_order == "asc":
        query = query.order_by(order_col.asc())
    else:
        query = query.order_by(order_col.desc())
    
    # Apply pagination
    offset = (search_params.page - 1) * search_params.page_size
    query = query.offset(offset).limit(search_params.page_size)
    
    # Include owner info
    query = query.options(joinedload(MarketplaceItem.owner))
    
    # Execute query
    result = await db.execute(query)
    items = result.scalars().unique().all()
    
    # Build response with owner info
    item_responses = []
    for item in items:
        item_dict = item.to_dict()
        item_dict["owner_username"] = item.owner.username
        item_dict["owner_avatar_url"] = item.owner.avatar_url
        item_responses.append(MarketplaceItemResponse(**item_dict))
    
    # Cache popular items
    if search_params.page == 1 and not search_params.query:
        cache_key = f"marketplace:popular:{search_params.category or 'all'}"
        await cache_manager.set(cache_key, [item.model_dump() for item in item_responses[:10]], ttl=300)
    
    # Get AI-powered recommendations if user is authenticated
    recommendations = []
    if current_user and search_params.page == 1:
        try:
            context = {
                "search_query": search_params.query,
                "category": search_params.category,
                "price_range": [search_params.min_price, search_params.max_price]
            }
            recommendations = await enhanced_marketplace.get_personalized_recommendations(
                user_id=current_user.id,
                context=context,
                limit=5
            )
        except Exception as e:
            logger.error(f"Failed to get recommendations: {e}")
    
    return MarketplaceItemListResponse(
        items=item_responses,
        total=total,
        page=search_params.page,
        page_size=search_params.page_size,
        total_pages=(total + search_params.page_size - 1) // search_params.page_size,
        recommendations=recommendations
    )


@router.post("/items", response_model=MarketplaceItemResponse)
async def create_marketplace_item(
    item_data: MarketplaceItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> MarketplaceItem:
    """Create a new marketplace item."""
    # Validate user can create items
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required to create marketplace items"
        )
    
    # Create item
    item = MarketplaceItem(
        owner_id=current_user.id,
        **item_data.model_dump()
    )
    
    db.add(item)
    await db.commit()
    await db.refresh(item)
    
    # Add owner info to response
    item_dict = item.to_dict()
    item_dict["owner_username"] = current_user.username
    item_dict["owner_avatar_url"] = current_user.avatar_url
    
    logger.info(f"Created marketplace item {item.id} by user {current_user.username}")
    
    # Invalidate cache
    await cache_manager.invalidate_pattern("marketplace:popular:*")
    
    return MarketplaceItemResponse(**item_dict)


@router.get("/items/{item_id}", response_model=MarketplaceItemResponse)
async def get_marketplace_item(
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
) -> MarketplaceItem:
    """Get marketplace item details with owner info."""
    # Check cache first
    cache_key = f"marketplace:item:{item_id}"
    cached_item = await cache_manager.get(cache_key)
    if cached_item:
        return MarketplaceItemResponse(**cached_item)
    
    # Query with owner info
    result = await db.execute(
        select(MarketplaceItem)
        .where(
            and_(
                MarketplaceItem.id == item_id,
                MarketplaceItem.is_active == True
            )
        )
        .options(joinedload(MarketplaceItem.owner))
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Marketplace item not found"
        )
    
    # Increment view count
    item.view_count += 1
    await db.commit()
    
    # Build response
    item_dict = item.to_dict()
    item_dict["owner_username"] = item.owner.username
    item_dict["owner_avatar_url"] = item.owner.avatar_url
    
    # Cache the item
    await cache_manager.set(cache_key, item_dict, ttl=600)
    
    return MarketplaceItemResponse(**item_dict)# Additional marketplace endpoints

@router.put("/items/{item_id}", response_model=MarketplaceItemResponse)
async def update_marketplace_item(
    item_id: uuid.UUID,
    item_update: MarketplaceItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> MarketplaceItem:
    """Update a marketplace item."""
    # Get item
    result = await db.execute(
        select(MarketplaceItem).where(
            and_(
                MarketplaceItem.id == item_id,
                MarketplaceItem.owner_id == current_user.id
            )
        )
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Marketplace item not found or you don't have permission"
        )
    
    # Update fields
    update_data = item_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    
    item.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(item)
    
    # Invalidate cache
    await cache_manager.delete(f"marketplace:item:{item_id}")
    await cache_manager.invalidate_pattern("marketplace:popular:*")
    
    # Build response
    item_dict = item.to_dict()
    item_dict["owner_username"] = current_user.username
    item_dict["owner_avatar_url"] = current_user.avatar_url
    
    return MarketplaceItemResponse(**item_dict)


@router.delete("/items/{item_id}")
async def delete_marketplace_item(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, str]:
    """Delete a marketplace item."""
    # Get item
    result = await db.execute(
        select(MarketplaceItem).where(
            and_(
                MarketplaceItem.id == item_id,
                MarketplaceItem.owner_id == current_user.id
            )
        )
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Marketplace item not found or you don't have permission"
        )
    
    # Soft delete
    item.is_active = False
    item.status = "removed"
    
    await db.commit()
    
    # Invalidate cache
    await cache_manager.delete(f"marketplace:item:{item_id}")
    await cache_manager.invalidate_pattern("marketplace:popular:*")
    
    logger.info(f"Deleted marketplace item {item_id}")
    
    return {"message": "Item deleted successfully"}


@router.post("/items/{item_id}/purchase", response_model=TransactionResponse)
async def purchase_item(
    item_id: uuid.UUID,
    transaction_data: TransactionCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Transaction:
    """Purchase a marketplace item."""
    # Get item with owner
    result = await db.execute(
        select(MarketplaceItem)
        .where(
            and_(
                MarketplaceItem.id == item_id,
                MarketplaceItem.is_active == True,
                MarketplaceItem.status == "active"
            )
        )
        .options(joinedload(MarketplaceItem.owner))
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found or not available"
        )
    
    if item.owner_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot purchase your own item"
        )
    
    # Check buyer wallet balance
    buyer_wallet_result = await db.execute(
        select(Wallet).where(Wallet.user_id == current_user.id)
    )
    buyer_wallet = buyer_wallet_result.scalar_one_or_none()
    
    if not buyer_wallet:
        # Create wallet if doesn't exist
        buyer_wallet = Wallet(user_id=current_user.id)
        db.add(buyer_wallet)
        await db.commit()
        await db.refresh(buyer_wallet)
    
    if buyer_wallet.balance_usd < item.price:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient balance"
        )
    
    # Get seller wallet
    seller_wallet_result = await db.execute(
        select(Wallet).where(Wallet.user_id == item.owner_id)
    )
    seller_wallet = seller_wallet_result.scalar_one_or_none()
    
    if not seller_wallet:
        seller_wallet = Wallet(user_id=item.owner_id)
        db.add(seller_wallet)
    
    # Create transaction
    transaction = Transaction(
        item_id=item_id,
        buyer_id=current_user.id,
        seller_id=item.owner_id,
        amount=item.price,
        currency=item.currency,
        payment_method=transaction_data.payment_method,
        status="pending",
        metadata=transaction_data.metadata or {}
    )
    db.add(transaction)
    
    try:
        # Process payment
        buyer_wallet.balance_usd -= item.price
        seller_wallet.balance_usd += item.price * 0.9  # 10% platform fee
        
        # Create wallet transactions
        buyer_transaction = WalletTransaction(
            wallet_id=buyer_wallet.id,
            type="purchase",
            amount=-item.price,
            currency="USD",
            reference_type="marketplace",
            reference_id=transaction.id,
            description=f"Purchase: {item.title}",
            status="completed"
        )
        
        seller_transaction = WalletTransaction(
            wallet_id=seller_wallet.id,
            type="earning",
            amount=item.price * 0.9,
            currency="USD",
            reference_type="marketplace",
            reference_id=transaction.id,
            description=f"Sale: {item.title}",
            status="completed"
        )
        
        db.add(buyer_transaction)
        db.add(seller_transaction)
        
        # Update transaction status
        transaction.status = "completed"
        transaction.transaction_hash = str(uuid.uuid4())
        
        # Update item stats
        item.purchase_count += 1
        
        # Update user stats
        buyer_wallet.total_spent += item.price
        seller_wallet.total_earned += item.price * 0.9
        
        await db.commit()
        await db.refresh(transaction)
        
        # Send notifications (background task)
        background_tasks.add_task(
            send_purchase_notifications,
            buyer_id=current_user.id,
            seller_id=item.owner_id,
            item_title=item.title,
            amount=item.price
        )
        
        logger.info(
            f"Transaction completed: {transaction.id}, "
            f"buyer: {current_user.username}, "
            f"item: {item.title}, "
            f"amount: {item.price}"
        )
        
        return transaction
        
    except Exception as e:
        # Rollback on error
        transaction.status = "failed"
        await db.commit()
        
        logger.error(f"Transaction failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Transaction failed"
        )


@router.get("/items/{item_id}/reviews", response_model=List[ReviewResponse])
async def get_item_reviews(
    item_id: uuid.UUID,
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
) -> List[Review]:
    """Get reviews for a marketplace item."""
    result = await db.execute(
        select(Review)
        .where(Review.item_id == item_id)
        .options(joinedload(Review.user))
        .order_by(Review.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    reviews = result.scalars().unique().all()
    
    # Build response with user info
    review_responses = []
    for review in reviews:
        review_dict = review.to_dict()
        review_dict["username"] = review.user.username
        review_dict["avatar_url"] = review.user.avatar_url
        review_responses.append(ReviewResponse(**review_dict))
    
    return review_responses


@router.post("/items/{item_id}/reviews", response_model=ReviewResponse)
async def create_review(
    item_id: uuid.UUID,
    review_data: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Review:
    """Create a review for a purchased item."""
    # Check if user purchased the item
    transaction_result = await db.execute(
        select(Transaction).where(
            and_(
                Transaction.item_id == item_id,
                Transaction.buyer_id == current_user.id,
                Transaction.status == "completed"
            )
        )
    )
    transaction = transaction_result.scalar_one_or_none()
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only review items you have purchased"
        )
    
    # Check if already reviewed
    existing_review = await db.execute(
        select(Review).where(
            and_(
                Review.item_id == item_id,
                Review.user_id == current_user.id
            )
        )
    )
    if existing_review.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this item"
        )
    
    # Create review
    review = Review(
        item_id=item_id,
        user_id=current_user.id,
        transaction_id=transaction.id,
        rating=review_data.rating,
        comment=review_data.comment,
        is_verified_purchase=True
    )
    db.add(review)
    
    # Update item rating
    rating_result = await db.execute(
        select(
            func.avg(Review.rating).label("avg_rating"),
            func.count(Review.id).label("count")
        ).where(Review.item_id == item_id)
    )
    rating_stats = rating_result.one()
    
    item_result = await db.execute(
        select(MarketplaceItem).where(MarketplaceItem.id == item_id)
    )
    item = item_result.scalar_one()
    
    item.rating = float(rating_stats.avg_rating or 0)
    item.review_count = rating_stats.count
    
    await db.commit()
    await db.refresh(review)
    
    # Build response
    review_dict = review.to_dict()
    review_dict["username"] = current_user.username
    review_dict["avatar_url"] = current_user.avatar_url
    
    # Invalidate cache
    await cache_manager.delete(f"marketplace:item:{item_id}")
    
    return ReviewResponse(**review_dict)


@router.get("/my-items", response_model=List[MarketplaceItemResponse])
async def get_user_items(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[MarketplaceItem]:
    """Get current user's marketplace items."""
    result = await db.execute(
        select(MarketplaceItem)
        .where(
            and_(
                MarketplaceItem.owner_id == current_user.id,
                MarketplaceItem.is_active == True
            )
        )
        .order_by(MarketplaceItem.created_at.desc())
    )
    items = result.scalars().all()
    
    # Build response
    item_responses = []
    for item in items:
        item_dict = item.to_dict()
        item_dict["owner_username"] = current_user.username
        item_dict["owner_avatar_url"] = current_user.avatar_url
        item_responses.append(MarketplaceItemResponse(**item_dict))
    
    return item_responses


@router.get("/my-purchases", response_model=List[TransactionResponse])
async def get_user_purchases(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[Transaction]:
    """Get current user's purchase history."""
    result = await db.execute(
        select(Transaction)
        .where(
            and_(
                Transaction.buyer_id == current_user.id,
                Transaction.status == "completed"
            )
        )
        .order_by(Transaction.created_at.desc())
    )
    transactions = result.scalars().all()
    
    return transactions


async def send_purchase_notifications(
    buyer_id: uuid.UUID,
    seller_id: uuid.UUID,
    item_title: str,
    amount: float
):
    """Send notifications for purchase (placeholder for actual implementation)."""
    logger.info(
        f"Sending notifications - buyer: {buyer_id}, "
        f"seller: {seller_id}, item: {item_title}, amount: ${amount}"
    )
    # TODO: Implement actual notification sending (email, push, etc.)


# AI-Powered Marketplace Endpoints

@router.post("/items/{item_id}/analyze-quality")
async def analyze_item_quality(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """AI-powered quality analysis for marketplace items."""
    # Get item
    result = await db.execute(
        select(MarketplaceItem)
        .where(
            and_(
                MarketplaceItem.id == item_id,
                MarketplaceItem.owner_id == current_user.id
            )
        )
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found or you don't have permission"
        )
    
    # Perform quality analysis
    item_data = {
        "title": item.title,
        "description": item.description,
        "category": item.category,
        "tags": item.tags,
        "price": float(item.price)
    }
    
    quality_report = await enhanced_marketplace.analyze_item_quality(
        item_data=item_data,
        images=item.images if hasattr(item, 'images') else None
    )
    
    return quality_report


@router.post("/items/{item_id}/optimize-price")
async def optimize_item_pricing(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """AI-powered dynamic pricing optimization."""
    # Get item
    result = await db.execute(
        select(MarketplaceItem)
        .where(
            and_(
                MarketplaceItem.id == item_id,
                MarketplaceItem.owner_id == current_user.id
            )
        )
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found or you don't have permission"
        )
    
    # Optimize pricing
    item_data = {
        "title": item.title,
        "description": item.description,
        "category": item.category,
        "tags": item.tags,
        "current_views": item.view_count,
        "current_purchases": item.purchase_count
    }
    
    pricing_recommendation = await enhanced_marketplace.optimize_pricing(
        item_id=item_id,
        seller_id=current_user.id,
        current_price=float(item.price),
        item_data=item_data
    )
    
    return pricing_recommendation


@router.post("/items/{item_id}/generate-description")
async def generate_smart_description(
    item_id: uuid.UUID,
    target_audience: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Generate AI-optimized item descriptions."""
    # Get item
    result = await db.execute(
        select(MarketplaceItem)
        .where(
            and_(
                MarketplaceItem.id == item_id,
                MarketplaceItem.owner_id == current_user.id
            )
        )
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found or you don't have permission"
        )
    
    # Generate optimized content
    item_data = {
        "title": item.title,
        "description": item.description,
        "category": item.category,
        "tags": item.tags,
        "features": item.metadata.get("features", []) if item.metadata else []
    }
    
    optimized_content = await enhanced_marketplace.generate_smart_descriptions(
        item_data=item_data,
        target_audience=target_audience
    )
    
    return optimized_content


@router.post("/fraud-check")
async def check_fraud_signals(
    transaction_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Check for fraud signals in a transaction."""
    # Get transaction
    result = await db.execute(
        select(Transaction)
        .where(
            and_(
                Transaction.id == transaction_id,
                or_(
                    Transaction.buyer_id == current_user.id,
                    Transaction.seller_id == current_user.id
                )
            )
        )
        .options(
            joinedload(Transaction.buyer),
            joinedload(Transaction.seller),
            joinedload(Transaction.item)
        )
    )
    transaction = result.scalar_one_or_none()
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found or access denied"
        )
    
    # Prepare data for fraud detection
    transaction_data = {
        "amount": float(transaction.amount),
        "timestamp": transaction.created_at.isoformat(),
        "payment_method": transaction.payment_method,
        "metadata": transaction.metadata
    }
    
    user_data = {
        "id": str(transaction.buyer_id),
        "account_age": (datetime.utcnow() - transaction.buyer.created_at).days,
        "purchase_count": transaction.buyer.purchase_count if hasattr(transaction.buyer, 'purchase_count') else 0
    }
    
    item_data = {
        "id": str(transaction.item_id),
        "title": transaction.item.title,
        "price": float(transaction.item.price),
        "category": transaction.item.category
    }
    
    fraud_report = await enhanced_marketplace.detect_fraud_signals(
        transaction_data=transaction_data,
        user_data=user_data,
        item_data=item_data
    )
    
    return fraud_report


@router.get("/trends/{category}")
async def get_market_trends(
    category: str,
    timeframe: str = Query(default="30_days", regex="^(7_days|30_days|90_days|1_year)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get AI-powered market trend predictions."""
    trend_analysis = await enhanced_marketplace.predict_market_trends(
        category=category,
        timeframe=timeframe
    )
    
    return trend_analysis


@router.post("/match-buyers-sellers")
async def match_buyers_with_sellers(
    buyer_needs: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[Dict[str, Any]]:
    """AI-powered buyer-seller matching."""
    criteria = {
        "buyer_needs": buyer_needs,
        "buyer_id": current_user.id
    }
    
    matches = await enhanced_marketplace.match_buyers_sellers(criteria)
    
    return matches


@router.get("/recommendations")
async def get_recommendations(
    limit: int = Query(default=20, le=50),
    context: Optional[Dict[str, Any]] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Get personalized AI-powered recommendations."""
    recommendations = await enhanced_marketplace.get_personalized_recommendations(
        user_id=current_user.id,
        context=context,
        limit=limit
    )
    
    return recommendations