"""
Pagination Utilities for API Responses
Implements cursor, keyset, and offset pagination strategies
"""

import base64
import json
from typing import Optional, List, Dict, Any, Tuple, TypeVar, Generic
from datetime import datetime
from urllib.parse import urlencode, urlparse, parse_qs
from pydantic import BaseModel, Field, field_validator
import redis.asyncio as redis
from sqlalchemy import Select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select as SelectType
import logging


logger = logging.getLogger(__name__)

T = TypeVar("T")


class PaginationParams(BaseModel):
    """Base pagination parameters"""
    page_size: int = Field(default=20, ge=1, le=100)
    
    @field_validator("page_size")
    @classmethod
    def validate_page_size(cls, v):
        if v > 100:
            raise ValueError("Page size cannot exceed 100")
        return v


class CursorPaginationParams(PaginationParams):
    """Cursor-based pagination parameters"""
    cursor: Optional[str] = None
    direction: str = Field(default="next", pattern="^(next|prev)$")


class KeysetPaginationParams(PaginationParams):
    """Keyset-based pagination parameters"""
    after_id: Optional[str] = None
    after_timestamp: Optional[datetime] = None
    before_id: Optional[str] = None
    before_timestamp: Optional[datetime] = None


class OffsetPaginationParams(PaginationParams):
    """Offset-based pagination parameters"""
    page: int = Field(default=1, ge=1)
    
    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response"""
    items: List[T]
    total: Optional[int] = None
    page_size: int
    has_next: bool
    has_prev: bool
    cursor_next: Optional[str] = None
    cursor_prev: Optional[str] = None
    links: Dict[str, str] = Field(default_factory=dict)


class CursorPagination:
    """
    Cursor-based pagination using base64 encoded cursors
    """
    
    def __init__(self, default_page_size: int = 20, max_page_size: int = 100):
        self.default_page_size = default_page_size
        self.max_page_size = max_page_size
    
    def encode_cursor(self, data: Dict[str, Any]) -> str:
        """
        Encode pagination data into a cursor string
        """
        try:
            json_str = json.dumps(data, default=str)
            return base64.urlsafe_b64encode(json_str.encode()).decode()
        except Exception as e:
            logger.error(f"Failed to encode cursor: {e}")
            raise ValueError("Invalid cursor data")
    
    def decode_cursor(self, cursor: str) -> Dict[str, Any]:
        """
        Decode cursor string into pagination data
        """
        try:
            decoded = base64.urlsafe_b64decode(cursor.encode())
            return json.loads(decoded)
        except Exception as e:
            logger.error(f"Failed to decode cursor: {e}")
            raise ValueError("Invalid cursor format")
    
    async def paginate_query(
        self,
        query: SelectType,
        session: AsyncSession,
        params: CursorPaginationParams,
        order_field: str = "id",
        order_desc: bool = False
    ) -> PaginatedResponse[T]:
        """
        Apply cursor pagination to a SQLAlchemy query
        """
        # Decode cursor if provided
        cursor_data = {}
        if params.cursor:
            cursor_data = self.decode_cursor(params.cursor)
        
        # Apply cursor filter
        if cursor_data and order_field in cursor_data:
            if params.direction == "next":
                if order_desc:
                    query = query.filter(
                        getattr(query.column_descriptions[0]["type"], order_field) < cursor_data[order_field]
                    )
                else:
                    query = query.filter(
                        getattr(query.column_descriptions[0]["type"], order_field) > cursor_data[order_field]
                    )
            else:  # prev
                if order_desc:
                    query = query.filter(
                        getattr(query.column_descriptions[0]["type"], order_field) > cursor_data[order_field]
                    )
                else:
                    query = query.filter(
                        getattr(query.column_descriptions[0]["type"], order_field) < cursor_data[order_field]
                    )
        
        # Apply ordering
        if order_desc:
            query = query.order_by(getattr(query.column_descriptions[0]["type"], order_field).desc())
        else:
            query = query.order_by(getattr(query.column_descriptions[0]["type"], order_field))
        
        # Fetch one extra item to check if there's a next page
        query = query.limit(params.page_size + 1)
        
        # Execute query
        result = await session.execute(query)
        items = list(result.scalars().all())
        
        # Check if there's a next page
        has_next = len(items) > params.page_size
        if has_next:
            items = items[:-1]
        
        # Generate cursors
        cursor_next = None
        cursor_prev = None
        
        if items:
            if has_next:
                cursor_next = self.encode_cursor({
                    order_field: getattr(items[-1], order_field)
                })
            
            if cursor_data or params.direction == "prev":
                cursor_prev = self.encode_cursor({
                    order_field: getattr(items[0], order_field)
                })
        
        return PaginatedResponse(
            items=items,
            page_size=params.page_size,
            has_next=has_next,
            has_prev=bool(cursor_prev),
            cursor_next=cursor_next,
            cursor_prev=cursor_prev
        )


class KeysetPagination:
    """
    Keyset pagination for timeline/feed pagination
    """
    
    def __init__(self, default_page_size: int = 20, max_page_size: int = 100):
        self.default_page_size = default_page_size
        self.max_page_size = max_page_size
    
    async def paginate_timeline(
        self,
        query: SelectType,
        session: AsyncSession,
        params: KeysetPaginationParams,
        id_field: str = "id",
        timestamp_field: str = "created_at"
    ) -> PaginatedResponse[T]:
        """
        Apply keyset pagination for timeline-like queries
        """
        # Apply keyset filters
        if params.after_id and params.after_timestamp:
            query = query.filter(
                (getattr(query.column_descriptions[0]["type"], timestamp_field) < params.after_timestamp) |
                (
                    (getattr(query.column_descriptions[0]["type"], timestamp_field) == params.after_timestamp) &
                    (getattr(query.column_descriptions[0]["type"], id_field) > params.after_id)
                )
            )
        elif params.before_id and params.before_timestamp:
            query = query.filter(
                (getattr(query.column_descriptions[0]["type"], timestamp_field) > params.before_timestamp) |
                (
                    (getattr(query.column_descriptions[0]["type"], timestamp_field) == params.before_timestamp) &
                    (getattr(query.column_descriptions[0]["type"], id_field) < params.before_id)
                )
            )
        
        # Apply ordering (newest first)
        query = query.order_by(
            getattr(query.column_descriptions[0]["type"], timestamp_field).desc(),
            getattr(query.column_descriptions[0]["type"], id_field).desc()
        )
        
        # Limit results
        query = query.limit(params.page_size + 1)
        
        # Execute query
        result = await session.execute(query)
        items = list(result.scalars().all())
        
        # Check if there's more data
        has_next = len(items) > params.page_size
        if has_next:
            items = items[:-1]
        
        # Generate cursor data
        cursor_next = None
        cursor_prev = None
        
        if items:
            # Next cursor points to the last item
            if has_next:
                last_item = items[-1]
                cursor_next = self._encode_keyset_cursor(
                    getattr(last_item, id_field),
                    getattr(last_item, timestamp_field)
                )
            
            # Previous cursor points to the first item
            if params.after_id or params.before_id:
                first_item = items[0]
                cursor_prev = self._encode_keyset_cursor(
                    getattr(first_item, id_field),
                    getattr(first_item, timestamp_field),
                    direction="before"
                )
        
        return PaginatedResponse(
            items=items,
            page_size=params.page_size,
            has_next=has_next,
            has_prev=bool(cursor_prev),
            cursor_next=cursor_next,
            cursor_prev=cursor_prev
        )
    
    def _encode_keyset_cursor(
        self,
        id_value: Any,
        timestamp_value: datetime,
        direction: str = "after"
    ) -> str:
        """
        Encode keyset values into a cursor
        """
        data = {
            f"{direction}_id": str(id_value),
            f"{direction}_timestamp": timestamp_value.isoformat()
        }
        return base64.urlsafe_b64encode(json.dumps(data).encode()).decode()


class OffsetPagination:
    """
    Traditional offset-based pagination with cached totals
    """
    
    def __init__(
        self,
        default_page_size: int = 20,
        max_page_size: int = 100,
        redis_client: Optional[redis.Redis] = None,
        cache_ttl: int = 300  # 5 minutes
    ):
        self.default_page_size = default_page_size
        self.max_page_size = max_page_size
        self.redis_client = redis_client
        self.cache_ttl = cache_ttl
    
    async def paginate_with_total(
        self,
        query: SelectType,
        count_query: SelectType,
        session: AsyncSession,
        params: OffsetPaginationParams,
        cache_key: Optional[str] = None
    ) -> PaginatedResponse[T]:
        """
        Apply offset pagination with total count
        """
        # Get total count (with caching)
        total = await self._get_total_count(count_query, session, cache_key)
        
        # Apply offset and limit
        query = query.offset(params.offset).limit(params.page_size)
        
        # Execute query
        result = await session.execute(query)
        items = list(result.scalars().all())
        
        # Calculate pagination info
        total_pages = (total + params.page_size - 1) // params.page_size
        has_next = params.page < total_pages
        has_prev = params.page > 1
        
        return PaginatedResponse(
            items=items,
            total=total,
            page_size=params.page_size,
            has_next=has_next,
            has_prev=has_prev,
            links=self._generate_links(params, total_pages)
        )
    
    async def _get_total_count(
        self,
        count_query: SelectType,
        session: AsyncSession,
        cache_key: Optional[str] = None
    ) -> int:
        """
        Get total count with optional caching
        """
        # Try to get from cache
        if self.redis_client and cache_key:
            try:
                cached = await self.redis_client.get(f"pagination:count:{cache_key}")
                if cached:
                    return int(cached)
            except Exception as e:
                logger.warning(f"Failed to get cached count: {e}")
        
        # Execute count query
        result = await session.execute(count_query)
        total = result.scalar() or 0
        
        # Cache the result
        if self.redis_client and cache_key:
            try:
                await self.redis_client.setex(
                    f"pagination:count:{cache_key}",
                    self.cache_ttl,
                    str(total)
                )
            except Exception as e:
                logger.warning(f"Failed to cache count: {e}")
        
        return total
    
    def _generate_links(
        self,
        params: OffsetPaginationParams,
        total_pages: int
    ) -> Dict[str, str]:
        """
        Generate pagination links
        """
        links = {}
        
        if params.page > 1:
            links["first"] = f"?page=1&page_size={params.page_size}"
            links["prev"] = f"?page={params.page - 1}&page_size={params.page_size}"
        
        if params.page < total_pages:
            links["next"] = f"?page={params.page + 1}&page_size={params.page_size}"
            links["last"] = f"?page={total_pages}&page_size={params.page_size}"
        
        return links


def generate_link_header(links: Dict[str, str], base_url: str) -> str:
    """
    Generate Link header for pagination
    RFC 5988 compliant
    """
    link_parts = []
    
    for rel, path in links.items():
        # Parse and update query parameters
        parsed = urlparse(path)
        params = parse_qs(parsed.query)
        
        # Build full URL
        full_url = f"{base_url}?{urlencode(params, doseq=True)}"
        
        # Add to link header
        link_parts.append(f'<{full_url}>; rel="{rel}"')
    
    return ", ".join(link_parts)


def validate_page_size(
    page_size: int,
    default: int = 20,
    minimum: int = 1,
    maximum: int = 100
) -> int:
    """
    Validate and normalize page size
    """
    if page_size < minimum:
        return default
    if page_size > maximum:
        return maximum
    return page_size