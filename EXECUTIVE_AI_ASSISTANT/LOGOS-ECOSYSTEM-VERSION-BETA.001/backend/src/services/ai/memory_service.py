"""Advanced Memory Service for LOGOS Ecosystem - Long-term and Semantic Memory"""

from typing import List, Dict, Any, Optional, Tuple, Set
from datetime import datetime, timedelta
import json
import asyncio
from dataclasses import dataclass, field
from enum import Enum
import numpy as np
from collections import defaultdict
import hashlib

# Vector similarity libraries
try:
    from sklearn.metrics.pairwise import cosine_similarity
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

from ...shared.utils.logger import get_logger
from ...shared.utils.config import get_settings

settings = get_settings()
from ...infrastructure.database import Base
from ...infrastructure.cache import cache_manager
from .rag_service import EmbeddingService, VectorStore, VectorStoreType
from sqlalchemy import Column, String, JSON, DateTime, Float, Integer, Text, Boolean
from ...shared.utils.database_types import UUID
import uuid

logger = get_logger(__name__)


class MemoryType(Enum):
    EPISODIC = "episodic"  # Specific conversations/events
    SEMANTIC = "semantic"  # Facts and knowledge
    PROCEDURAL = "procedural"  # How-to knowledge
    WORKING = "working"  # Current context
    SENSORY = "sensory"  # Recent perceptions


class MemoryImportance(Enum):
    CRITICAL = 5
    HIGH = 4
    MEDIUM = 3
    LOW = 2
    TRIVIAL = 1


@dataclass
class Memory:
    """Individual memory unit"""
    id: str
    content: str
    memory_type: MemoryType
    importance: MemoryImportance
    embedding: Optional[List[float]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    accessed_at: datetime = field(default_factory=datetime.utcnow)
    access_count: int = 0
    decay_rate: float = 0.1
    associations: List[str] = field(default_factory=list)
    context: Optional[Dict[str, Any]] = None
    source: Optional[str] = None
    confidence: float = 1.0


@dataclass
class MemoryCluster:
    """Cluster of related memories"""
    id: str
    theme: str
    memories: List[Memory]
    centroid: Optional[List[float]] = None
    keywords: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


class MemoryModel(Base):
    """SQLAlchemy model for persistent memory storage"""
    __tablename__ = "ai_memories"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID, nullable=False)
    agent_id = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    memory_type = Column(String, nullable=False)
    importance = Column(Integer, nullable=False)
    embedding = Column(JSON)  # Store as JSON array
    memory_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    accessed_at = Column(DateTime, default=datetime.utcnow)
    access_count = Column(Integer, default=0)
    decay_rate = Column(Float, default=0.1)
    associations = Column(JSON, default=list)
    context = Column(JSON)
    source = Column(String)
    confidence = Column(Float, default=1.0)
    is_active = Column(Boolean, default=True)


class MemoryConsolidation:
    """Memory consolidation strategies"""
    
    @staticmethod
    def spaced_repetition_score(memory: Memory) -> float:
        """Calculate spaced repetition score for memory retention"""
        time_since_access = (datetime.utcnow() - memory.accessed_at).total_seconds() / 3600  # hours
        
        # Ebbinghaus forgetting curve
        retention = np.exp(-memory.decay_rate * time_since_access)
        
        # Boost based on access count
        access_boost = np.log1p(memory.access_count) * 0.1
        
        # Importance factor
        importance_factor = memory.importance.value / 5.0
        
        return min(1.0, retention + access_boost) * importance_factor
    
    @staticmethod
    def should_reinforce(memory: Memory, threshold: float = 0.3) -> bool:
        """Determine if memory needs reinforcement"""
        score = MemoryConsolidation.spaced_repetition_score(memory)
        return score < threshold
    
    @staticmethod
    def consolidate_similar_memories(memories: List[Memory], threshold: float = 0.8) -> List[Memory]:
        """Consolidate similar memories into stronger ones"""
        if not memories or not SKLEARN_AVAILABLE:
            return memories
        
        # Calculate similarity matrix
        embeddings = [m.embedding for m in memories if m.embedding]
        if len(embeddings) < 2:
            return memories
        
        similarity_matrix = cosine_similarity(embeddings)
        
        # Find groups of similar memories
        consolidated = []
        processed = set()
        
        for i, memory in enumerate(memories):
            if i in processed:
                continue
            
            # Find similar memories
            similar_indices = [
                j for j in range(len(memories))
                if j != i and similarity_matrix[i][j] > threshold and j not in processed
            ]
            
            if similar_indices:
                # Consolidate memories
                group = [memory] + [memories[j] for j in similar_indices]
                
                # Create consolidated memory
                consolidated_memory = Memory(
                    id=f"consolidated_{memory.id}",
                    content=memory.content,  # Keep the most important content
                    memory_type=memory.memory_type,
                    importance=MemoryImportance(
                        min(5, max(m.importance.value for m in group) + 1)
                    ),
                    embedding=np.mean([m.embedding for m in group if m.embedding], axis=0).tolist(),
                    metadata={
                        'consolidated_from': [m.id for m in group],
                        'consolidation_count': len(group)
                    },
                    access_count=sum(m.access_count for m in group),
                    associations=list(set(sum([m.associations for m in group], [])))
                )
                
                consolidated.append(consolidated_memory)
                processed.update([i] + similar_indices)
            else:
                consolidated.append(memory)
                processed.add(i)
        
        return consolidated


class MemoryRetrieval:
    """Memory retrieval strategies"""
    
    @staticmethod
    def calculate_relevance(memory: Memory, query_embedding: List[float], context: Dict[str, Any]) -> float:
        """Calculate memory relevance based on multiple factors"""
        if not memory.embedding or not SKLEARN_AVAILABLE:
            return 0.0
        
        # Semantic similarity
        semantic_similarity = cosine_similarity(
            [query_embedding], 
            [memory.embedding]
        )[0][0]
        
        # Recency factor
        time_decay = MemoryConsolidation.spaced_repetition_score(memory)
        
        # Context similarity
        context_similarity = 0.0
        if memory.context and context:
            shared_keys = set(memory.context.keys()) & set(context.keys())
            if shared_keys:
                matches = sum(
                    1 for k in shared_keys 
                    if memory.context.get(k) == context.get(k)
                )
                context_similarity = matches / len(shared_keys)
        
        # Importance weight
        importance_weight = memory.importance.value / 5.0
        
        # Combined relevance score
        relevance = (
            0.5 * semantic_similarity +
            0.2 * time_decay +
            0.2 * context_similarity +
            0.1 * importance_weight
        )
        
        return relevance
    
    @staticmethod
    def spreading_activation(
        seed_memories: List[Memory],
        all_memories: List[Memory],
        max_hops: int = 2,
        activation_threshold: float = 0.3
    ) -> List[Memory]:
        """Retrieve associated memories through spreading activation"""
        activated = set(m.id for m in seed_memories)
        activation_scores = {m.id: 1.0 for m in seed_memories}
        result_memories = seed_memories.copy()
        
        memory_map = {m.id: m for m in all_memories}
        
        for hop in range(max_hops):
            new_activations = {}
            
            for memory_id, activation in activation_scores.items():
                memory = memory_map.get(memory_id)
                if not memory:
                    continue
                
                # Spread activation to associations
                for assoc_id in memory.associations:
                    if assoc_id not in activated and assoc_id in memory_map:
                        # Decay activation with each hop
                        new_activation = activation * 0.7
                        
                        if new_activation > activation_threshold:
                            new_activations[assoc_id] = max(
                                new_activations.get(assoc_id, 0),
                                new_activation
                            )
            
            # Add newly activated memories
            for memory_id, activation in new_activations.items():
                if memory_id not in activated:
                    activated.add(memory_id)
                    activation_scores[memory_id] = activation
                    result_memories.append(memory_map[memory_id])
        
        return result_memories


class WorkingMemory:
    """Short-term working memory with limited capacity"""
    
    def __init__(self, capacity: int = 7):  # Miller's magical number
        self.capacity = capacity
        self.memories: List[Memory] = []
        self.attention_weights: Dict[str, float] = {}
    
    def add(self, memory: Memory, attention_weight: float = 1.0):
        """Add memory to working memory with attention weight"""
        self.memories.append(memory)
        self.attention_weights[memory.id] = attention_weight
        
        # Maintain capacity limit by removing least attended
        if len(self.memories) > self.capacity:
            # Sort by attention weight
            sorted_memories = sorted(
                self.memories,
                key=lambda m: self.attention_weights.get(m.id, 0),
                reverse=True
            )
            
            # Keep top memories
            self.memories = sorted_memories[:self.capacity]
            
            # Clean up attention weights
            kept_ids = {m.id for m in self.memories}
            self.attention_weights = {
                k: v for k, v in self.attention_weights.items()
                if k in kept_ids
            }
    
    def get_context(self) -> str:
        """Get working memory as context string"""
        sorted_memories = sorted(
            self.memories,
            key=lambda m: self.attention_weights.get(m.id, 0),
            reverse=True
        )
        
        context_parts = []
        for memory in sorted_memories:
            weight = self.attention_weights.get(memory.id, 0)
            if weight > 0.3:  # Only include sufficiently attended memories
                context_parts.append(memory.content)
        
        return "\n".join(context_parts)
    
    def update_attention(self, memory_id: str, delta: float):
        """Update attention weight for a memory"""
        if memory_id in self.attention_weights:
            self.attention_weights[memory_id] = max(
                0,
                min(1, self.attention_weights[memory_id] + delta)
            )


class MemoryService:
    """Advanced memory management service"""
    
    def __init__(self,
                 vector_store_type: VectorStoreType = VectorStoreType.CHROMA,
                 embedding_service: Optional[EmbeddingService] = None):
        self.vector_store = VectorStore(vector_store_type, index_name='memory-store')
        self.embedding_service = embedding_service or EmbeddingService()
        self.cache = cache_manager
        self.working_memories: Dict[str, WorkingMemory] = {}  # Per session
        self.memory_clusters: Dict[str, MemoryCluster] = {}
    
    async def store_memory(self,
                         content: str,
                         memory_type: MemoryType,
                         user_id: str,
                         agent_id: str,
                         importance: MemoryImportance = MemoryImportance.MEDIUM,
                         context: Optional[Dict[str, Any]] = None,
                         associations: Optional[List[str]] = None) -> Memory:
        """Store a new memory"""
        # Generate embedding
        embedding = await self.embedding_service.embed_text(content)
        
        # Create memory object
        memory = Memory(
            id=str(uuid.uuid4()),
            content=content,
            memory_type=memory_type,
            importance=importance,
            embedding=embedding,
            metadata={
                'user_id': user_id,
                'agent_id': agent_id
            },
            context=context,
            associations=associations or []
        )
        
        # Store in vector store
        await self.vector_store.upsert([{
            'id': memory.id,
            'embedding': memory.embedding,
            'metadata': {
                'content': content,
                'memory_type': memory_type.value,
                'importance': importance.value,
                'user_id': user_id,
                'agent_id': agent_id,
                'created_at': memory.created_at.isoformat(),
                'context': json.dumps(context) if context else None,
                'associations': json.dumps(associations) if associations else None
            }
        }])
        
        # Update working memory if session exists
        session_key = f"{user_id}:{agent_id}"
        if session_key in self.working_memories:
            self.working_memories[session_key].add(memory)
        
        # Find associations automatically
        if not associations:
            await self._find_associations(memory, user_id, agent_id)
        
        return memory
    
    async def retrieve_memories(self,
                              query: str,
                              user_id: str,
                              agent_id: str,
                              memory_types: Optional[List[MemoryType]] = None,
                              top_k: int = 10,
                              use_spreading_activation: bool = True,
                              context: Optional[Dict[str, Any]] = None) -> List[Memory]:
        """Retrieve relevant memories"""
        # Generate query embedding
        query_embedding = await self.embedding_service.embed_text(query)
        
        # Build filter
        filter_dict = {
            'user_id': user_id,
            'agent_id': agent_id
        }
        
        if memory_types:
            filter_dict['memory_type'] = {'$in': [mt.value for mt in memory_types]}
        
        # Search vector store
        search_results = await self.vector_store.search(
            query_embedding,
            top_k=top_k * 2,  # Get more for filtering
            filter=filter_dict
        )
        
        # Convert to Memory objects
        memories = []
        for doc_id, score, metadata in search_results:
            memory = Memory(
                id=doc_id,
                content=metadata.get('content', ''),
                memory_type=MemoryType(metadata.get('memory_type', 'semantic')),
                importance=MemoryImportance(metadata.get('importance', 3)),
                embedding=query_embedding,  # Placeholder
                metadata=metadata,
                created_at=datetime.fromisoformat(metadata.get('created_at', datetime.utcnow().isoformat())),
                context=json.loads(metadata.get('context', '{}')) if metadata.get('context') else None,
                associations=json.loads(metadata.get('associations', '[]')) if metadata.get('associations') else []
            )
            memories.append(memory)
        
        # Apply relevance scoring
        if context:
            scored_memories = [
                (m, MemoryRetrieval.calculate_relevance(m, query_embedding, context))
                for m in memories
            ]
            scored_memories.sort(key=lambda x: x[1], reverse=True)
            memories = [m for m, _ in scored_memories[:top_k]]
        else:
            memories = memories[:top_k]
        
        # Apply spreading activation
        if use_spreading_activation and memories:
            all_memories = await self._get_all_memories(user_id, agent_id)
            memories = MemoryRetrieval.spreading_activation(
                memories,
                all_memories,
                max_hops=2
            )
        
        # Update access patterns
        for memory in memories:
            memory.accessed_at = datetime.utcnow()
            memory.access_count += 1
        
        return memories
    
    async def consolidate_memories(self,
                                 user_id: str,
                                 agent_id: str,
                                 force: bool = False) -> int:
        """Consolidate similar memories to strengthen important patterns"""
        # Get all memories
        all_memories = await self._get_all_memories(user_id, agent_id)
        
        # Group by memory type
        type_groups = defaultdict(list)
        for memory in all_memories:
            type_groups[memory.memory_type].append(memory)
        
        consolidated_count = 0
        
        for memory_type, memories in type_groups.items():
            # Check if consolidation is needed
            if not force and len(memories) < 10:
                continue
            
            # Consolidate similar memories
            consolidated = MemoryConsolidation.consolidate_similar_memories(memories)
            
            # Store consolidated memories
            for memory in consolidated:
                if memory.id.startswith('consolidated_'):
                    await self.store_memory(
                        content=memory.content,
                        memory_type=memory.memory_type,
                        user_id=user_id,
                        agent_id=agent_id,
                        importance=memory.importance,
                        context=memory.context,
                        associations=memory.associations
                    )
                    consolidated_count += 1
        
        return consolidated_count
    
    async def forget_memories(self,
                            user_id: str,
                            agent_id: str,
                            threshold: float = 0.1,
                            protect_important: bool = True) -> int:
        """Forget memories below retention threshold"""
        all_memories = await self._get_all_memories(user_id, agent_id)
        
        forgotten_count = 0
        
        for memory in all_memories:
            # Skip important memories if protected
            if protect_important and memory.importance.value >= 4:
                continue
            
            # Check retention score
            retention_score = MemoryConsolidation.spaced_repetition_score(memory)
            
            if retention_score < threshold:
                # Mark as inactive instead of deleting
                await self._deactivate_memory(memory.id)
                forgotten_count += 1
        
        return forgotten_count
    
    async def reinforce_memory(self, memory_id: str):
        """Reinforce a specific memory"""
        # Retrieve memory
        # Update access count and timestamp
        # Potentially increase importance
        pass
    
    async def create_memory_summary(self,
                                  user_id: str,
                                  agent_id: str,
                                  time_range: Optional[timedelta] = None) -> Dict[str, Any]:
        """Create a summary of memories"""
        memories = await self._get_all_memories(user_id, agent_id)
        
        if time_range:
            cutoff = datetime.utcnow() - time_range
            memories = [m for m in memories if m.created_at > cutoff]
        
        # Group by type
        type_distribution = defaultdict(int)
        importance_distribution = defaultdict(int)
        
        for memory in memories:
            type_distribution[memory.memory_type.value] += 1
            importance_distribution[memory.importance.value] += 1
        
        # Find key themes
        themes = await self._extract_memory_themes(memories)
        
        return {
            'total_memories': len(memories),
            'type_distribution': dict(type_distribution),
            'importance_distribution': dict(importance_distribution),
            'key_themes': themes,
            'most_accessed': sorted(
                memories,
                key=lambda m: m.access_count,
                reverse=True
            )[:5],
            'recent_memories': sorted(
                memories,
                key=lambda m: m.created_at,
                reverse=True
            )[:5]
        }
    
    def get_working_memory(self, user_id: str, agent_id: str) -> WorkingMemory:
        """Get or create working memory for session"""
        session_key = f"{user_id}:{agent_id}"
        
        if session_key not in self.working_memories:
            self.working_memories[session_key] = WorkingMemory()
        
        return self.working_memories[session_key]
    
    async def _find_associations(self, memory: Memory, user_id: str, agent_id: str):
        """Find and create associations between memories"""
        # Search for similar memories
        similar = await self.vector_store.search(
            memory.embedding,
            top_k=5,
            filter={
                'user_id': user_id,
                'agent_id': agent_id
            }
        )
        
        # Add associations
        for doc_id, score, _ in similar:
            if doc_id != memory.id and score > 0.7:
                memory.associations.append(doc_id)
    
    async def _get_all_memories(self, user_id: str, agent_id: str) -> List[Memory]:
        """Get all memories for a user/agent combination"""
        # This would typically query the database
        # For now, return empty list
        return []
    
    async def _deactivate_memory(self, memory_id: str):
        """Mark memory as inactive"""
        # Update database to set is_active = False
        pass
    
    async def _extract_memory_themes(self, memories: List[Memory]) -> List[str]:
        """Extract key themes from memories"""
        # Use clustering or topic modeling
        # For now, return placeholder
        return ["learning", "problem_solving", "conversations"]


# Singleton instance
_memory_service: Optional[MemoryService] = None


def get_memory_service() -> MemoryService:
    """Get or create memory service instance"""
    global _memory_service
    if _memory_service is None:
        _memory_service = MemoryService()
    return _memory_service