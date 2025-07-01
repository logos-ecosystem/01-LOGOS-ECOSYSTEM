"""Marketplace Service Module with AI-powered enhancements."""

from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

from src.shared.models.marketplace import MarketplaceItem, Transaction
from src.shared.models.review import Review
from src.shared.models.user import User
from src.shared.models.upload import Upload
from src.shared.utils.logger import get_logger
from src.infrastructure.cache import cache_manager
from src.services.wallet import wallet_service
from src.services.tasks.email import send_email as send_purchase_notification

# Import enhanced marketplace service
try:
    from .enhanced_marketplace_service import EnhancedMarketplaceService
except ImportError:
    EnhancedMarketplaceService = None

logger = get_logger(__name__)


class MarketplaceService:
    """Service for managing marketplace operations"""
    
    async def create_item(
        self,
        owner_id: str,
        title: str,
        description: str,
        price: Decimal,
        category: str,
        tags: List[str],
        db: AsyncSession,
        thumbnail_upload_id: Optional[str] = None,
        media_upload_ids: Optional[List[str]] = None,
        **kwargs
    ) -> MarketplaceItem:
        """Create a new marketplace item"""
        item = MarketplaceItem(
            id=str(uuid.uuid4()),
            owner_id=owner_id,
            title=title,
            description=description,
            price=price,
            category=category,
            tags=tags,
            status="active",
            thumbnail_upload_id=thumbnail_upload_id,
            media_upload_ids=media_upload_ids or [],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            **kwargs
        )
        
        db.add(item)
        
        # Update upload references if provided
        if thumbnail_upload_id:
            await self._update_upload_reference(thumbnail_upload_id, db, increment=True)
        
        if media_upload_ids:
            for upload_id in media_upload_ids:
                await self._update_upload_reference(upload_id, db, increment=True)
        
        await db.commit()
        await db.refresh(item)
        
        # Clear cache
        await cache_manager.delete(f"marketplace:items:*")
        
        return item
    
    async def get_item(
        self,
        item_id: str,
        db: AsyncSession,
        include_owner: bool = True
    ) -> Optional[MarketplaceItem]:
        """Get a marketplace item by ID"""
        cache_key = f"marketplace:item:{item_id}"
        cached = await cache_manager.get(cache_key)
        if cached:
            return cached
        
        query = select(MarketplaceItem).where(
            MarketplaceItem.id == item_id,
            MarketplaceItem.status == "active"
        )
        
        if include_owner:
            query = query.options(selectinload(MarketplaceItem.owner))
        
        result = await db.execute(query)
        item = result.scalar_one_or_none()
        
        if item:
            await cache_manager.set(cache_key, item, expire=300)
        
        return item
    
    async def list_items(
        self,
        db: AsyncSession,
        category: Optional[str] = None,
        owner_id: Optional[str] = None,
        search: Optional[str] = None,
        tags: Optional[List[str]] = None,
        min_price: Optional[Decimal] = None,
        max_price: Optional[Decimal] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        limit: int = 20,
        offset: int = 0
    ) -> List[MarketplaceItem]:
        """List marketplace items with filters"""
        query = select(MarketplaceItem).where(MarketplaceItem.status == "active")
        
        if category:
            query = query.where(MarketplaceItem.category == category)
        
        if owner_id:
            query = query.where(MarketplaceItem.owner_id == owner_id)
        
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    MarketplaceItem.title.ilike(search_term),
                    MarketplaceItem.description.ilike(search_term)
                )
            )
        
        if tags:
            query = query.where(MarketplaceItem.tags.overlap(tags))
        
        if min_price is not None:
            query = query.where(MarketplaceItem.price >= min_price)
        
        if max_price is not None:
            query = query.where(MarketplaceItem.price <= max_price)
        
        # Sorting
        order_column = getattr(MarketplaceItem, sort_by, MarketplaceItem.created_at)
        if sort_order == "desc":
            query = query.order_by(order_column.desc())
        else:
            query = query.order_by(order_column)
        
        query = query.limit(limit).offset(offset)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def update_item(
        self,
        item_id: str,
        owner_id: str,
        db: AsyncSession,
        **updates
    ) -> Optional[MarketplaceItem]:
        """Update a marketplace item"""
        item = await self.get_item(item_id, db, include_owner=False)
        if not item or item.owner_id != owner_id:
            return None
        
        for key, value in updates.items():
            if hasattr(item, key):
                setattr(item, key, value)
        
        item.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(item)
        
        # Clear cache
        await cache_manager.delete(f"marketplace:item:{item_id}")
        await cache_manager.delete(f"marketplace:items:*")
        
        return item
    
    async def delete_item(
        self,
        item_id: str,
        owner_id: str,
        db: AsyncSession
    ) -> bool:
        """Soft delete a marketplace item"""
        item = await self.get_item(item_id, db, include_owner=False)
        if not item or item.owner_id != owner_id:
            return False
        
        item.status = "removed"
        item.updated_at = datetime.utcnow()
        
        await db.commit()
        
        # Clear cache
        await cache_manager.delete(f"marketplace:item:{item_id}")
        await cache_manager.delete(f"marketplace:items:*")
        
        return True
    
    async def purchase_item(
        self,
        buyer_id: str,
        item_id: str,
        quantity: int,
        payment_method: str,
        db: AsyncSession,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Transaction:
        """Purchase a marketplace item"""
        # Get item
        item = await self.get_item(item_id, db)
        if not item:
            raise ValueError("Item not found")
        
        if item.owner_id == buyer_id:
            raise ValueError("Cannot purchase your own item")
        
        # Calculate total
        total_amount = item.price * quantity
        
        # Process payment based on method
        if payment_method == "wallet":
            # Deduct from buyer's wallet
            await wallet_service.process_payment(
                user_id=buyer_id,
                amount=total_amount,
                description=f"Purchase: {item.title}",
                db=db
            )
            
            # Add to seller's wallet
            await wallet_service.add_funds(
                user_id=item.owner_id,
                amount=total_amount * Decimal("0.95"),  # 5% platform fee
                description=f"Sale: {item.title}",
                db=db
            )
        
        # Create transaction record
        transaction = Transaction(
            id=str(uuid.uuid4()),
            buyer_id=buyer_id,
            item_id=item_id,
            seller_id=item.owner_id,
            amount=total_amount,
            currency=item.currency,
            status="pending",
            payment_method=payment_method,
            metadata=metadata or {},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(transaction)
        
        # Update item stats
        item.purchase_count += quantity
        
        await db.commit()
        await db.refresh(transaction)
        
        # Send notifications
        await send_purchase_notification.delay(transaction.id)
        
        return transaction
    
    async def get_transaction(
        self,
        transaction_id: str,
        user_id: str,
        db: AsyncSession
    ) -> Optional[Transaction]:
        """Get a transaction by ID"""
        result = await db.execute(
            select(Transaction)
            .where(
                Transaction.id == transaction_id,
                or_(
                    Transaction.buyer_id == user_id,
                    Transaction.seller_id == user_id
                )
            )
            .options(selectinload(Transaction.item))
        )
        return result.scalar_one_or_none()
    
    async def list_transactions(
        self,
        user_id: str,
        db: AsyncSession,
        as_buyer: bool = True,
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[Transaction]:
        """List user's transactions (purchases or sales)"""
        query = select(Transaction)
        
        if as_buyer:
            query = query.where(Transaction.buyer_id == user_id)
        else:
            query = query.where(Transaction.seller_id == user_id)
        
        if status:
            query = query.where(Transaction.status == status)
        
        query = query.order_by(Transaction.created_at.desc())
        query = query.limit(limit).offset(offset)
        
        result = await db.execute(query.options(selectinload(Transaction.item)))
        return result.scalars().all()
    
    async def update_transaction_status(
        self,
        transaction_id: str,
        owner_id: str,
        status: str,
        db: AsyncSession,
        transaction_hash: Optional[str] = None
    ) -> Optional[Transaction]:
        """Update transaction status (for sellers)"""
        result = await db.execute(
            select(Transaction)
            .where(
                Transaction.id == transaction_id,
                Transaction.seller_id == owner_id
            )
        )
        transaction = result.scalar_one_or_none()
        
        if not transaction:
            return None
        
        transaction.status = status
        if transaction_hash:
            transaction.transaction_hash = transaction_hash
        transaction.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(transaction)
        
        return transaction
    
    async def get_seller_stats(
        self,
        owner_id: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Get seller statistics"""
        # Get total sales
        sales_result = await db.execute(
            select(
                func.count(Transaction.id).label("total_orders"),
                func.sum(Transaction.amount).label("total_revenue")
            )
            .where(
                Transaction.seller_id == owner_id,
                Transaction.status.in_(["pending", "completed"])
            )
        )
        sales_stats = sales_result.first()
        
        # Get active listings
        listings_result = await db.execute(
            select(func.count(MarketplaceItem.id))
            .where(
                MarketplaceItem.owner_id == owner_id,
                MarketplaceItem.status == "active"
            )
        )
        active_listings = listings_result.scalar()
        
        # Get average rating
        rating_result = await db.execute(
            select(func.avg(Review.rating))
            .join(MarketplaceItem)
            .where(MarketplaceItem.owner_id == owner_id)
        )
        avg_rating = rating_result.scalar() or 0
        
        return {
            "total_orders": sales_stats.total_orders or 0,
            "total_revenue": float(sales_stats.total_revenue or 0),
            "active_listings": active_listings or 0,
            "average_rating": float(avg_rating),
            "seller_level": self._calculate_seller_level(sales_stats.total_orders or 0)
        }
    
    def _calculate_seller_level(self, total_orders: int) -> str:
        """Calculate seller level based on total orders"""
        if total_orders >= 1000:
            return "platinum"
        elif total_orders >= 500:
            return "gold"
        elif total_orders >= 100:
            return "silver"
        elif total_orders >= 10:
            return "bronze"
        else:
            return "new"
    
    async def get_related_items(
        self,
        item_id: str,
        db: AsyncSession,
        limit: int = 8
    ) -> List[MarketplaceItem]:
        """Get related items based on category and tags"""
        item = await self.get_item(item_id, db, include_owner=False)
        if not item:
            return []
        
        # Find items with similar tags or same category
        query = select(MarketplaceItem).where(
            MarketplaceItem.id != item_id,
            MarketplaceItem.status == "active",
            or_(
                MarketplaceItem.category == item.category,
                MarketplaceItem.tags.overlap(item.tags)
            )
        )
        
        query = query.order_by(func.random()).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def _update_upload_reference(
        self,
        upload_id: str,
        db: AsyncSession,
        increment: bool = True
    ) -> None:
        """Update upload reference count"""
        result = await db.execute(
            select(Upload).where(Upload.id == upload_id)
        )
        upload = result.scalar_one_or_none()
        
        if upload:
            if increment:
                upload.reference_count += 1
            else:
                upload.reference_count = max(0, upload.reference_count - 1)
            
            await db.commit()
    
    async def toggle_favorite(
        self,
        user_id: str,
        item_id: str,
        db: AsyncSession
    ) -> bool:
        """Toggle item favorite status"""
        # Implementation depends on favorite model
        # This is a placeholder
        return True


# Global marketplace service instance
marketplace_service = MarketplaceService()

# Export services
__all__ = ['MarketplaceService', 'marketplace_service']
if EnhancedMarketplaceService:
    __all__.append('EnhancedMarketplaceService')