"""
Optimized database queries for AI agent searches and operations
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy import (
    select, func, and_, or_, text, Index, 
    literal_column, case, exists, desc
)
from sqlalchemy.orm import Session, selectinload, joinedload
from sqlalchemy.sql import Select
from sqlalchemy.dialects.postgresql import array_agg, JSONB
import asyncio
from functools import lru_cache

from src.shared.models.ai import AIAgent, AgentCapability, AgentUsage
from src.shared.models.review import Review
from src.shared.models.user import User
from src.shared.utils.logger import get_logger
from src.infrastructure.cache import CacheManager

logger = get_logger(__name__)


class AgentQueryOptimizer:
    """Optimized query patterns for agent operations"""
    
    def __init__(self, db: Session, cache_manager: Optional[CacheManager] = None):
        self.db = db
        self.cache = cache_manager or CacheManager()
        
    async def search_agents_optimized(
        self,
        query: Optional[str] = None,
        categories: Optional[List[str]] = None,
        capabilities: Optional[List[str]] = None,
        tags: Optional[List[str]] = None,
        min_rating: Optional[float] = None,
        max_price: Optional[float] = None,
        sort_by: str = "relevance",
        limit: int = 20,
        offset: int = 0
    ) -> Tuple[List[AIAgent], int]:
        """
        Optimized agent search with full-text search and filtering
        """
        # Build cache key
        cache_key = self._build_cache_key(
            "agent_search",
            query, categories, capabilities, tags, 
            min_rating, max_price, sort_by, limit, offset
        )
        
        # Check cache
        cached_result = await self.cache.get(cache_key)
        if cached_result:
            return cached_result
        
        # Build optimized query
        stmt = select(AIAgent).options(
            selectinload(AIAgent.capabilities),
            selectinload(AIAgent.reviews)
        )
        
        # Full-text search using PostgreSQL ts_vector
        if query:
            search_vector = func.to_tsvector('english', 
                func.concat_ws(' ',
                    AIAgent.name,
                    AIAgent.description,
                    func.array_to_string(AIAgent.tags, ' ')
                )
            )
            search_query = func.plainto_tsquery('english', query)
            
            stmt = stmt.where(
                search_vector.op('@@')(search_query)
            )
            
            # Add relevance ranking
            if sort_by == "relevance":
                relevance = func.ts_rank_cd(search_vector, search_query)
                stmt = stmt.order_by(desc(relevance))
        
        # Category filter (using index)
        if categories:
            stmt = stmt.where(AIAgent.category.in_(categories))
        
        # Capability filter (using GIN index on JSONB)
        if capabilities:
            capability_conditions = []
            for cap in capabilities:
                capability_conditions.append(
                    exists().where(
                        and_(
                            AgentCapability.agent_id == AIAgent.id,
                            AgentCapability.name == cap
                        )
                    )
                )
            stmt = stmt.where(or_(*capability_conditions))
        
        # Tag filter (using GIN index on array)
        if tags:
            stmt = stmt.where(
                AIAgent.tags.op('&&')(tags)  # Array overlap operator
            )
        
        # Rating filter with subquery optimization
        if min_rating:
            rating_subquery = (
                select(
                    Review.agent_id,
                    func.avg(Review.rating).label('avg_rating')
                )
                .group_by(Review.agent_id)
                .having(func.avg(Review.rating) >= min_rating)
                .subquery()
            )
            
            stmt = stmt.join(
                rating_subquery,
                AIAgent.id == rating_subquery.c.agent_id
            )
        
        # Price filter
        if max_price:
            stmt = stmt.where(AIAgent.price_per_request <= max_price)
        
        # Apply sorting
        if sort_by == "popularity":
            # Use materialized view for performance
            stmt = stmt.order_by(desc(AIAgent.usage_count))
        elif sort_by == "rating":
            stmt = stmt.order_by(desc(AIAgent.average_rating))
        elif sort_by == "price_low":
            stmt = stmt.order_by(AIAgent.price_per_request)
        elif sort_by == "price_high":
            stmt = stmt.order_by(desc(AIAgent.price_per_request))
        elif sort_by == "newest":
            stmt = stmt.order_by(desc(AIAgent.created_at))
        
        # Count total results efficiently
        count_stmt = select(func.count()).select_from(
            stmt.subquery()
        )
        total_count = self.db.scalar(count_stmt)
        
        # Apply pagination
        stmt = stmt.limit(limit).offset(offset)
        
        # Execute query
        result = self.db.execute(stmt)
        agents = result.scalars().all()
        
        # Cache result
        await self.cache.set(cache_key, (agents, total_count), ttl=300)
        
        return agents, total_count
    
    async def get_agent_with_stats(self, agent_id: str) -> Dict[str, Any]:
        """
        Get agent with pre-calculated statistics
        """
        cache_key = f"agent_stats:{agent_id}"
        cached = await self.cache.get(cache_key)
        if cached:
            return cached
        
        # Use CTE for complex statistics
        usage_stats = (
            select(
                func.count(AgentUsage.id).label('total_requests'),
                func.avg(AgentUsage.response_time_ms).label('avg_response_time'),
                func.sum(AgentUsage.tokens_used).label('total_tokens'),
                func.sum(
                    case(
                        (AgentUsage.success == True, 1),
                        else_=0
                    )
                ).label('successful_requests')
            )
            .where(AgentUsage.agent_id == agent_id)
            .where(AgentUsage.created_at > datetime.utcnow() - timedelta(days=30))
            .cte('usage_stats')
        )
        
        # Main query with all joins
        stmt = (
            select(
                AIAgent,
                usage_stats.c.total_requests,
                usage_stats.c.avg_response_time,
                usage_stats.c.total_tokens,
                usage_stats.c.successful_requests,
                func.count(Review.id).label('review_count'),
                func.avg(Review.rating).label('avg_rating')
            )
            .select_from(AIAgent)
            .outerjoin(usage_stats, literal_column('1=1'))
            .outerjoin(Review, Review.agent_id == AIAgent.id)
            .where(AIAgent.id == agent_id)
            .group_by(
                AIAgent.id,
                usage_stats.c.total_requests,
                usage_stats.c.avg_response_time,
                usage_stats.c.total_tokens,
                usage_stats.c.successful_requests
            )
            .options(
                selectinload(AIAgent.capabilities),
                selectinload(AIAgent.reviews).selectinload(Review.user)
            )
        )
        
        result = self.db.execute(stmt).first()
        
        if not result:
            return None
        
        agent_data = {
            "agent": result.AIAgent,
            "stats": {
                "total_requests": result.total_requests or 0,
                "avg_response_time_ms": float(result.avg_response_time or 0),
                "total_tokens": result.total_tokens or 0,
                "success_rate": (
                    (result.successful_requests / result.total_requests * 100)
                    if result.total_requests else 0
                ),
                "review_count": result.review_count or 0,
                "average_rating": float(result.avg_rating or 0)
            }
        }
        
        # Cache for 5 minutes
        await self.cache.set(cache_key, agent_data, ttl=300)
        
        return agent_data
    
    async def get_agent_recommendations(
        self,
        user_id: str,
        limit: int = 10
    ) -> List[AIAgent]:
        """
        Get personalized agent recommendations using collaborative filtering
        """
        cache_key = f"agent_recommendations:{user_id}"
        cached = await self.cache.get(cache_key)
        if cached:
            return cached
        
        # Get user's usage history
        user_agents = (
            select(AgentUsage.agent_id, func.count().label('usage_count'))
            .where(AgentUsage.user_id == user_id)
            .group_by(AgentUsage.agent_id)
            .order_by(desc('usage_count'))
            .limit(5)
            .cte('user_agents')
        )
        
        # Find similar users (collaborative filtering)
        similar_users = (
            select(AgentUsage.user_id)
            .where(
                and_(
                    AgentUsage.agent_id.in_(select(user_agents.c.agent_id)),
                    AgentUsage.user_id != user_id
                )
            )
            .group_by(AgentUsage.user_id)
            .having(func.count(AgentUsage.agent_id) >= 2)
            .limit(20)
            .cte('similar_users')
        )
        
        # Get recommendations from similar users
        recommendations = (
            select(
                AIAgent,
                func.count(AgentUsage.user_id).label('recommendation_score')
            )
            .select_from(AIAgent)
            .join(AgentUsage, AgentUsage.agent_id == AIAgent.id)
            .where(
                and_(
                    AgentUsage.user_id.in_(select(similar_users.c.user_id)),
                    ~AIAgent.id.in_(select(user_agents.c.agent_id)),
                    AIAgent.is_active == True
                )
            )
            .group_by(AIAgent.id)
            .order_by(desc('recommendation_score'))
            .limit(limit)
        )
        
        result = self.db.execute(recommendations)
        agents = [row.AIAgent for row in result]
        
        # If not enough recommendations, add popular agents
        if len(agents) < limit:
            popular = (
                select(AIAgent)
                .where(
                    and_(
                        ~AIAgent.id.in_([a.id for a in agents]),
                        AIAgent.is_active == True
                    )
                )
                .order_by(desc(AIAgent.usage_count))
                .limit(limit - len(agents))
            )
            
            popular_agents = self.db.execute(popular).scalars().all()
            agents.extend(popular_agents)
        
        # Cache for 1 hour
        await self.cache.set(cache_key, agents, ttl=3600)
        
        return agents
    
    async def get_trending_agents(
        self,
        time_window: timedelta = timedelta(days=7),
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get trending agents based on recent usage growth
        """
        cache_key = f"trending_agents:{time_window.days}d"
        cached = await self.cache.get(cache_key)
        if cached:
            return cached
        
        cutoff_date = datetime.utcnow() - time_window
        
        # Calculate usage growth
        recent_usage = (
            select(
                AgentUsage.agent_id,
                func.count().label('recent_count')
            )
            .where(AgentUsage.created_at > cutoff_date)
            .group_by(AgentUsage.agent_id)
            .cte('recent_usage')
        )
        
        previous_usage = (
            select(
                AgentUsage.agent_id,
                func.count().label('previous_count')
            )
            .where(
                and_(
                    AgentUsage.created_at <= cutoff_date,
                    AgentUsage.created_at > cutoff_date - time_window
                )
            )
            .group_by(AgentUsage.agent_id)
            .cte('previous_usage')
        )
        
        # Calculate growth rate
        trending = (
            select(
                AIAgent,
                recent_usage.c.recent_count,
                func.coalesce(previous_usage.c.previous_count, 0).label('previous_count'),
                (
                    (recent_usage.c.recent_count - func.coalesce(previous_usage.c.previous_count, 0)) * 100.0 /
                    func.greatest(func.coalesce(previous_usage.c.previous_count, 1), 1)
                ).label('growth_rate')
            )
            .select_from(AIAgent)
            .join(recent_usage, AIAgent.id == recent_usage.c.agent_id)
            .outerjoin(previous_usage, AIAgent.id == previous_usage.c.agent_id)
            .where(
                and_(
                    AIAgent.is_active == True,
                    recent_usage.c.recent_count > 10  # Minimum threshold
                )
            )
            .order_by(desc('growth_rate'))
            .limit(limit)
        )
        
        result = self.db.execute(trending)
        
        trending_agents = [
            {
                "agent": row.AIAgent,
                "recent_usage": row.recent_count,
                "previous_usage": row.previous_count,
                "growth_rate": float(row.growth_rate)
            }
            for row in result
        ]
        
        # Cache for 1 hour
        await self.cache.set(cache_key, trending_agents, ttl=3600)
        
        return trending_agents
    
    async def bulk_update_agent_stats(self) -> None:
        """
        Bulk update agent statistics using efficient queries
        """
        # Update usage counts
        usage_update = text("""
            UPDATE ai_agents a
            SET 
                usage_count = COALESCE(u.count, 0),
                last_used_at = u.last_used
            FROM (
                SELECT 
                    agent_id,
                    COUNT(*) as count,
                    MAX(created_at) as last_used
                FROM agent_usage
                WHERE created_at > NOW() - INTERVAL '30 days'
                GROUP BY agent_id
            ) u
            WHERE a.id = u.agent_id
        """)
        
        # Update average ratings
        rating_update = text("""
            UPDATE ai_agents a
            SET 
                average_rating = COALESCE(r.avg_rating, 0),
                review_count = COALESCE(r.count, 0)
            FROM (
                SELECT 
                    agent_id,
                    AVG(rating)::DECIMAL(3,2) as avg_rating,
                    COUNT(*) as count
                FROM reviews
                WHERE agent_id IS NOT NULL
                GROUP BY agent_id
            ) r
            WHERE a.id = r.agent_id
        """)
        
        # Execute updates
        await self.db.execute(usage_update)
        await self.db.execute(rating_update)
        await self.db.commit()
        
        # Clear relevant caches
        await self.cache.delete_pattern("agent_stats:*")
        await self.cache.delete_pattern("trending_agents:*")
    
    def _build_cache_key(self, prefix: str, *args) -> str:
        """Build a cache key from arguments"""
        key_parts = [prefix]
        for arg in args:
            if arg is not None:
                if isinstance(arg, list):
                    key_parts.append(','.join(sorted(str(x) for x in arg)))
                else:
                    key_parts.append(str(arg))
        return ':'.join(key_parts)


# Database indexes for optimization
def create_agent_indexes(engine):
    """Create optimized indexes for agent queries"""
    
    indexes = [
        # Full-text search index
        Index(
            'idx_agent_search_vector',
            text("""
                to_tsvector('english', 
                    COALESCE(name, '') || ' ' || 
                    COALESCE(description, '') || ' ' || 
                    COALESCE(array_to_string(tags, ' '), '')
                )
            """),
            postgresql_using='gin'
        ),
        
        # Category and status composite index
        Index(
            'idx_agent_category_status',
            'category',
            'is_active',
            postgresql_where=text('is_active = true')
        ),
        
        # Tags GIN index
        Index(
            'idx_agent_tags',
            'tags',
            postgresql_using='gin'
        ),
        
        # Usage count index for sorting
        Index(
            'idx_agent_usage_count',
            'usage_count',
            postgresql_using='btree'
        ),
        
        # Average rating index
        Index(
            'idx_agent_rating',
            'average_rating',
            postgresql_where=text('average_rating IS NOT NULL')
        ),
        
        # Agent usage indexes
        Index(
            'idx_agent_usage_lookup',
            'agent_id',
            'user_id',
            'created_at'
        ),
        
        # Review indexes
        Index(
            'idx_review_agent_rating',
            'agent_id',
            'rating'
        )
    ]
    
    # Create indexes
    for index in indexes:
        try:
            index.create(engine)
            logger.info(f"Created index: {index.name}")
        except Exception as e:
            logger.warning(f"Index {index.name} may already exist: {e}")


# Query execution plans for monitoring
class QueryPlanAnalyzer:
    """Analyze and optimize query execution plans"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def analyze_query(self, query: Select) -> Dict[str, Any]:
        """Analyze query execution plan"""
        explain_query = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query}"
        result = self.db.execute(text(explain_query))
        plan = result.scalar()
        
        # Extract key metrics
        execution_plan = plan[0]["Plan"]
        
        return {
            "total_cost": execution_plan.get("Total Cost"),
            "execution_time": plan[0].get("Execution Time"),
            "planning_time": plan[0].get("Planning Time"),
            "shared_blocks_hit": execution_plan.get("Shared Hit Blocks", 0),
            "shared_blocks_read": execution_plan.get("Shared Read Blocks", 0),
            "cache_hit_ratio": self._calculate_cache_hit_ratio(execution_plan),
            "node_types": self._extract_node_types(execution_plan),
            "recommendations": self._generate_recommendations(execution_plan)
        }
    
    def _calculate_cache_hit_ratio(self, plan: Dict) -> float:
        """Calculate cache hit ratio from plan"""
        hits = plan.get("Shared Hit Blocks", 0)
        reads = plan.get("Shared Read Blocks", 0)
        total = hits + reads
        
        return (hits / total * 100) if total > 0 else 100.0
    
    def _extract_node_types(self, plan: Dict) -> List[str]:
        """Extract all node types from execution plan"""
        node_types = []
        
        def extract_nodes(node):
            node_types.append(node.get("Node Type"))
            for child in node.get("Plans", []):
                extract_nodes(child)
        
        extract_nodes(plan)
        return node_types
    
    def _generate_recommendations(self, plan: Dict) -> List[str]:
        """Generate optimization recommendations"""
        recommendations = []
        
        # Check for sequential scans
        if "Seq Scan" in self._extract_node_types(plan):
            recommendations.append("Consider adding indexes to avoid sequential scans")
        
        # Check cache hit ratio
        if self._calculate_cache_hit_ratio(plan) < 90:
            recommendations.append("Low cache hit ratio - consider increasing shared_buffers")
        
        # Check for expensive sorts
        if plan.get("Sort Method") == "external merge":
            recommendations.append("External sort detected - consider increasing work_mem")
        
        return recommendations