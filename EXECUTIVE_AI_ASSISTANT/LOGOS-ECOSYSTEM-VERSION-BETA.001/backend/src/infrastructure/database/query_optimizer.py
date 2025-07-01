"""Database Query Optimizer with performance monitoring and optimization"""

import asyncio
import time
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
import asyncpg
from sqlalchemy import event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import Pool
import redis
import json
import hashlib
from dataclasses import dataclass, asdict
import logging

from src.shared.utils.logger import get_logger
from src.shared.utils.config import get_settings

settings = get_settings()

logger = get_logger(__name__)


@dataclass
class QueryStats:
    """Statistics for a query"""
    query_hash: str
    query_text: str
    execution_count: int = 0
    total_time: float = 0.0
    avg_time: float = 0.0
    max_time: float = 0.0
    min_time: float = float('inf')
    last_executed: Optional[datetime] = None
    query_plan: Optional[Dict] = None
    is_slow: bool = False


class QueryOptimizer:
    """Query optimizer with performance monitoring and caching"""
    
    def __init__(
        self,
        slow_query_threshold: float = 1.0,  # seconds
        cache_ttl: int = 3600,  # 1 hour
        enable_query_cache: bool = True,
        enable_read_replica: bool = True
    ):
        self.slow_query_threshold = slow_query_threshold
        self.cache_ttl = cache_ttl
        self.enable_query_cache = enable_query_cache
        self.enable_read_replica = enable_read_replica
        
        # Query statistics
        self.query_stats: Dict[str, QueryStats] = {}
        self.slow_queries: List[QueryStats] = []
        
        # Redis for query result caching
        self.redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            decode_responses=True
        ) if enable_query_cache else None
        
        # Connection pools
        self.read_pool: Optional[asyncpg.Pool] = None
        self.write_pool: Optional[asyncpg.Pool] = None
        
        # Initialize monitoring
        self._setup_monitoring()
    
    async def initialize_pools(self):
        """Initialize connection pools for read/write separation"""
        if self.enable_read_replica:
            # Read replica pool
            self.read_pool = await asyncpg.create_pool(
                settings.DATABASE_READ_URL,
                min_size=10,
                max_size=20,
                max_queries=50000,
                max_inactive_connection_lifetime=300,
                command_timeout=60
            )
        
        # Write pool (primary database)
        self.write_pool = await asyncpg.create_pool(
            settings.DATABASE_URL,
            min_size=10,
            max_size=20,
            max_queries=50000,
            max_inactive_connection_lifetime=300,
            command_timeout=60
        )
    
    async def close_pools(self):
        """Close connection pools"""
        if self.read_pool:
            await self.read_pool.close()
        if self.write_pool:
            await self.write_pool.close()
    
    def _setup_monitoring(self):
        """Setup SQLAlchemy event listeners for monitoring"""
        
        @event.listens_for(Engine, "before_cursor_execute")
        def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            context._query_start_time = time.time()
            context._query_statement = statement
        
        @event.listens_for(Engine, "after_cursor_execute")
        def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            execution_time = time.time() - context._query_start_time
            self._record_query_stats(statement, execution_time)
    
    def _get_query_hash(self, query: str) -> str:
        """Generate hash for query (normalized)"""
        # Normalize query by removing extra whitespace
        normalized = ' '.join(query.split())
        return hashlib.md5(normalized.encode()).hexdigest()
    
    def _record_query_stats(self, query: str, execution_time: float):
        """Record query statistics"""
        query_hash = self._get_query_hash(query)
        
        if query_hash not in self.query_stats:
            self.query_stats[query_hash] = QueryStats(
                query_hash=query_hash,
                query_text=query[:500]  # Store first 500 chars
            )
        
        stats = self.query_stats[query_hash]
        stats.execution_count += 1
        stats.total_time += execution_time
        stats.avg_time = stats.total_time / stats.execution_count
        stats.max_time = max(stats.max_time, execution_time)
        stats.min_time = min(stats.min_time, execution_time)
        stats.last_executed = datetime.utcnow()
        
        # Check if slow query
        if execution_time > self.slow_query_threshold:
            stats.is_slow = True
            self.slow_queries.append(stats)
            logger.warning(f"Slow query detected: {execution_time:.2f}s - {query[:100]}...")
            
            # Automatically explain slow queries
            asyncio.create_task(self._explain_slow_query(query))
    
    async def _explain_slow_query(self, query: str):
        """Run EXPLAIN ANALYZE on slow queries"""
        try:
            async with self.write_pool.acquire() as conn:
                # Only explain SELECT queries
                if query.strip().upper().startswith('SELECT'):
                    explain_query = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query}"
                    result = await conn.fetchval(explain_query)
                    
                    query_hash = self._get_query_hash(query)
                    if query_hash in self.query_stats:
                        self.query_stats[query_hash].query_plan = json.loads(result)
                        
                        # Log insights
                        self._analyze_query_plan(self.query_stats[query_hash])
        except Exception as e:
            logger.error(f"Error explaining query: {e}")
    
    def _analyze_query_plan(self, stats: QueryStats):
        """Analyze query plan and provide optimization suggestions"""
        if not stats.query_plan:
            return
        
        plan = stats.query_plan[0]
        total_cost = plan.get('Plan', {}).get('Total Cost', 0)
        
        suggestions = []
        
        # Check for sequential scans on large tables
        if self._has_seq_scan(plan.get('Plan', {})):
            suggestions.append("Consider adding indexes to avoid sequential scans")
        
        # Check for high cost
        if total_cost > 10000:
            suggestions.append("Query has high cost, consider optimization")
        
        if suggestions:
            logger.info(f"Query optimization suggestions for {stats.query_hash}: {', '.join(suggestions)}")
    
    def _has_seq_scan(self, plan: Dict) -> bool:
        """Check if query plan has sequential scan"""
        if plan.get('Node Type') == 'Seq Scan':
            return True
        
        # Check child plans
        for child in plan.get('Plans', []):
            if self._has_seq_scan(child):
                return True
        
        return False
    
    async def execute_query(
        self,
        query: str,
        params: Optional[List] = None,
        is_write: bool = False,
        cache_key: Optional[str] = None,
        cache_ttl: Optional[int] = None
    ) -> List[Dict]:
        """Execute query with caching and read/write routing"""
        
        # Check cache for read queries
        if not is_write and self.enable_query_cache and cache_key:
            cached = await self._get_cached_result(cache_key)
            if cached is not None:
                return cached
        
        # Route to appropriate pool
        pool = self.write_pool if is_write else (self.read_pool or self.write_pool)
        
        start_time = time.time()
        try:
            async with pool.acquire() as conn:
                if params:
                    result = await conn.fetch(query, *params)
                else:
                    result = await conn.fetch(query)
                
                # Convert to dict
                result_dicts = [dict(row) for row in result]
                
                # Cache result if applicable
                if not is_write and self.enable_query_cache and cache_key:
                    await self._cache_result(cache_key, result_dicts, cache_ttl or self.cache_ttl)
                
                # Record stats
                execution_time = time.time() - start_time
                self._record_query_stats(query, execution_time)
                
                return result_dicts
                
        except Exception as e:
            logger.error(f"Query execution error: {e}")
            raise
    
    async def _get_cached_result(self, cache_key: str) -> Optional[List[Dict]]:
        """Get cached query result"""
        try:
            if self.redis_client:
                cached = self.redis_client.get(f"query_cache:{cache_key}")
                if cached:
                    return json.loads(cached)
        except Exception as e:
            logger.error(f"Cache retrieval error: {e}")
        return None
    
    async def _cache_result(self, cache_key: str, result: List[Dict], ttl: int):
        """Cache query result"""
        try:
            if self.redis_client:
                self.redis_client.setex(
                    f"query_cache:{cache_key}",
                    ttl,
                    json.dumps(result, default=str)
                )
        except Exception as e:
            logger.error(f"Cache storage error: {e}")
    
    def get_slow_queries(self, limit: int = 10) -> List[Dict]:
        """Get slowest queries"""
        sorted_queries = sorted(
            [stats for stats in self.query_stats.values() if stats.is_slow],
            key=lambda x: x.avg_time,
            reverse=True
        )[:limit]
        
        return [asdict(stats) for stats in sorted_queries]
    
    def get_query_stats(self) -> Dict[str, Any]:
        """Get overall query statistics"""
        total_queries = sum(stats.execution_count for stats in self.query_stats.values())
        total_time = sum(stats.total_time for stats in self.query_stats.values())
        
        return {
            'total_queries': total_queries,
            'total_time': total_time,
            'unique_queries': len(self.query_stats),
            'slow_queries': len(self.slow_queries),
            'avg_query_time': total_time / total_queries if total_queries > 0 else 0,
            'cache_enabled': self.enable_query_cache,
            'read_replica_enabled': self.enable_read_replica
        }
    
    async def optimize_connection_pool(self, pool: Pool):
        """Optimize connection pool settings based on usage"""
        # Get pool statistics
        size = pool.size()
        checked_out = pool.checked_out()
        overflow = pool.overflow()
        total = pool.total()
        
        # Log pool stats
        logger.info(f"Pool stats - Size: {size}, Checked out: {checked_out}, Overflow: {overflow}, Total: {total}")
        
        # Adjust pool size if needed
        utilization = checked_out / size if size > 0 else 0
        
        if utilization > 0.8:
            logger.warning("High connection pool utilization, consider increasing pool size")
        elif utilization < 0.2 and size > 10:
            logger.info("Low connection pool utilization, consider decreasing pool size")
    
    def clear_query_cache(self, pattern: Optional[str] = None):
        """Clear query cache"""
        if self.redis_client:
            if pattern:
                keys = self.redis_client.keys(f"query_cache:{pattern}*")
                if keys:
                    self.redis_client.delete(*keys)
            else:
                keys = self.redis_client.keys("query_cache:*")
                if keys:
                    self.redis_client.delete(*keys)
    
    def reset_stats(self):
        """Reset query statistics"""
        self.query_stats.clear()
        self.slow_queries.clear()


# Global query optimizer instance
query_optimizer = QueryOptimizer()


# Utility functions for common query patterns
async def execute_read_query(query: str, params: Optional[List] = None, cache_key: Optional[str] = None) -> List[Dict]:
    """Execute a read query with caching"""
    return await query_optimizer.execute_query(query, params, is_write=False, cache_key=cache_key)


async def execute_write_query(query: str, params: Optional[List] = None) -> List[Dict]:
    """Execute a write query"""
    return await query_optimizer.execute_query(query, params, is_write=True)


# Query builder helpers for common patterns
class OptimizedQueryBuilder:
    """Helper class for building optimized queries"""
    
    @staticmethod
    def paginated_query(
        table: str,
        columns: List[str] = ["*"],
        where_clause: Optional[str] = None,
        order_by: str = "created_at DESC",
        limit: int = 20,
        offset: int = 0
    ) -> str:
        """Build optimized paginated query"""
        query = f"SELECT {', '.join(columns)} FROM {table}"
        
        if where_clause:
            query += f" WHERE {where_clause}"
        
        query += f" ORDER BY {order_by} LIMIT {limit} OFFSET {offset}"
        
        return query
    
    @staticmethod
    def count_query(
        table: str,
        where_clause: Optional[str] = None
    ) -> str:
        """Build optimized count query"""
        query = f"SELECT COUNT(*) as total FROM {table}"
        
        if where_clause:
            query += f" WHERE {where_clause}"
        
        return query
    
    @staticmethod
    def bulk_insert_query(
        table: str,
        columns: List[str],
        values_placeholder: str
    ) -> str:
        """Build optimized bulk insert query"""
        return f"""
            INSERT INTO {table} ({', '.join(columns)})
            VALUES {values_placeholder}
            ON CONFLICT DO NOTHING
            RETURNING id
        """
    
    @staticmethod
    def update_with_returning(
        table: str,
        set_clause: str,
        where_clause: str,
        returning_columns: List[str] = ["*"]
    ) -> str:
        """Build update query with RETURNING clause"""
        return f"""
            UPDATE {table}
            SET {set_clause}, updated_at = NOW()
            WHERE {where_clause}
            RETURNING {', '.join(returning_columns)}
        """