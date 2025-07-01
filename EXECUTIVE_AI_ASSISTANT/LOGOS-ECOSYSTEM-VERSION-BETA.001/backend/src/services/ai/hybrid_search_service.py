"""Hybrid Search Service - Combining Keyword, Semantic, and Graph-based Search"""

from typing import List, Dict, Any, Optional, Tuple, Set
from datetime import datetime
import asyncio
import json
from dataclasses import dataclass
from enum import Enum
import numpy as np
from collections import defaultdict

# Search libraries
try:
    from whoosh import index
    from whoosh.fields import Schema, TEXT, ID, KEYWORD, NUMERIC, DATETIME
    from whoosh.qparser import QueryParser, MultifieldParser
    from whoosh.query import And, Or, Term
    from whoosh.analysis import StemmingAnalyzer
    WHOOSH_AVAILABLE = True
except ImportError:
    WHOOSH_AVAILABLE = False

try:
    from rank_bm25 import BM25Okapi
    BM25_AVAILABLE = True
except ImportError:
    BM25_AVAILABLE = False

try:
    import networkx as nx
    NETWORKX_AVAILABLE = True
except ImportError:
    NETWORKX_AVAILABLE = False

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

from ...shared.utils.logger import get_logger
from ...shared.utils.config import get_settings

settings = get_settings()
from ...infrastructure.cache import cache_manager
from .rag_service import EmbeddingService, VectorStore, VectorStoreType
from .memory_service import MemoryService

logger = get_logger(__name__)


class SearchType(Enum):
    KEYWORD = "keyword"
    SEMANTIC = "semantic"
    FUZZY = "fuzzy"
    PHRASE = "phrase"
    REGEX = "regex"
    GRAPH = "graph"
    HYBRID = "hybrid"


class RankingAlgorithm(Enum):
    BM25 = "bm25"
    TFIDF = "tfidf"
    SEMANTIC_SIMILARITY = "semantic"
    PAGERANK = "pagerank"
    HYBRID_FUSION = "hybrid"


@dataclass
class SearchQuery:
    """Search query with metadata"""
    query: str
    search_type: SearchType
    filters: Dict[str, Any] = None
    boost_fields: Dict[str, float] = None
    fuzzy_distance: int = 2
    phrase_slop: int = 2
    limit: int = 10
    offset: int = 0
    min_score: float = 0.0


@dataclass
class SearchResult:
    """Individual search result"""
    id: str
    content: str
    score: float
    source: str
    metadata: Dict[str, Any]
    highlights: List[str] = None
    explanation: Dict[str, Any] = None


@dataclass
class SearchResponse:
    """Complete search response"""
    results: List[SearchResult]
    total_count: int
    search_time_ms: float
    query_expansion: List[str] = None
    facets: Dict[str, Dict[str, int]] = None
    suggestions: List[str] = None


class QueryExpansion:
    """Query expansion techniques"""
    
    @staticmethod
    async def expand_with_synonyms(query: str, synonym_dict: Dict[str, List[str]]) -> List[str]:
        """Expand query with synonyms"""
        expanded_terms = [query]
        
        for word in query.lower().split():
            if word in synonym_dict:
                for synonym in synonym_dict[word]:
                    expanded_query = query.replace(word, synonym)
                    if expanded_query not in expanded_terms:
                        expanded_terms.append(expanded_query)
        
        return expanded_terms
    
    @staticmethod
    async def expand_with_word_embeddings(
        query: str,
        embedding_service: EmbeddingService,
        vocabulary: List[str],
        top_k: int = 5
    ) -> List[str]:
        """Expand query using word embeddings"""
        if not vocabulary:
            return [query]
        
        # Get query embedding
        query_embedding = await embedding_service.embed_text(query)
        
        # Get embeddings for vocabulary
        vocab_embeddings = await embedding_service.embed_batch(vocabulary)
        
        # Find similar words
        similarities = cosine_similarity([query_embedding], vocab_embeddings)[0]
        top_indices = np.argsort(similarities)[-top_k:]
        
        expanded_terms = [query]
        for idx in top_indices:
            if similarities[idx] > 0.7:  # Similarity threshold
                expanded_terms.append(vocabulary[idx])
        
        return expanded_terms
    
    @staticmethod
    def expand_with_stemming(query: str) -> List[str]:
        """Expand query with word stems"""
        from nltk.stem import PorterStemmer
        stemmer = PorterStemmer()
        
        words = query.split()
        stemmed_words = [stemmer.stem(word) for word in words]
        
        if stemmed_words != words:
            return [query, ' '.join(stemmed_words)]
        return [query]


class KeywordSearchEngine:
    """Whoosh-based keyword search engine"""
    
    def __init__(self, index_dir: str = "./search_index"):
        self.index_dir = index_dir
        self.schema = Schema(
            id=ID(stored=True, unique=True),
            content=TEXT(analyzer=StemmingAnalyzer(), stored=True),
            title=TEXT(stored=True),
            keywords=KEYWORD(stored=True, commas=True),
            category=ID(stored=True),
            created_at=DATETIME(stored=True),
            metadata=TEXT(stored=True)  # JSON string
        )
        self._initialize_index()
    
    def _initialize_index(self):
        """Initialize or open search index"""
        if WHOOSH_AVAILABLE:
            import os
            if not os.path.exists(self.index_dir):
                os.makedirs(self.index_dir)
                self.ix = index.create_in(self.index_dir, self.schema)
            else:
                self.ix = index.open_dir(self.index_dir)
    
    def index_document(self, doc_id: str, content: str, **kwargs):
        """Index a document"""
        if not WHOOSH_AVAILABLE:
            return
        
        writer = self.ix.writer()
        writer.add_document(
            id=doc_id,
            content=content,
            title=kwargs.get('title', ''),
            keywords=kwargs.get('keywords', ''),
            category=kwargs.get('category', ''),
            created_at=kwargs.get('created_at', datetime.utcnow()),
            metadata=json.dumps(kwargs.get('metadata', {}))
        )
        writer.commit()
    
    def search(self, query: SearchQuery) -> List[Tuple[str, float, Dict[str, Any]]]:
        """Perform keyword search"""
        if not WHOOSH_AVAILABLE:
            return []
        
        results = []
        
        with self.ix.searcher() as searcher:
            # Build query parser
            if query.boost_fields:
                parser = MultifieldParser(
                    list(query.boost_fields.keys()),
                    self.schema,
                    fieldboosts=query.boost_fields
                )
            else:
                parser = QueryParser("content", self.schema)
            
            # Parse query based on type
            if query.search_type == SearchType.PHRASE:
                whoosh_query = parser.parse(f'"{query.query}"~{query.phrase_slop}')
            elif query.search_type == SearchType.FUZZY:
                whoosh_query = parser.parse(f"{query.query}~{query.fuzzy_distance}")
            else:
                whoosh_query = parser.parse(query.query)
            
            # Apply filters
            if query.filters:
                filter_queries = []
                for field, value in query.filters.items():
                    filter_queries.append(Term(field, value))
                whoosh_query = And([whoosh_query] + filter_queries)
            
            # Execute search
            search_results = searcher.search(
                whoosh_query,
                limit=query.limit,
                offset=query.offset
            )
            
            # Process results
            for hit in search_results:
                if hit.score >= query.min_score:
                    metadata = json.loads(hit.get('metadata', '{}'))
                    results.append((
                        hit['id'],
                        hit.score,
                        {
                            'content': hit['content'],
                            'title': hit.get('title', ''),
                            'highlights': hit.highlights('content'),
                            **metadata
                        }
                    ))
        
        return results


class BM25SearchEngine:
    """BM25-based search engine"""
    
    def __init__(self):
        self.documents = []
        self.doc_ids = []
        self.bm25 = None
        self.tokenized_docs = []
    
    def index_documents(self, documents: List[Tuple[str, str]]):
        """Index documents for BM25 search"""
        if not BM25_AVAILABLE:
            return
        
        self.doc_ids = [doc_id for doc_id, _ in documents]
        self.documents = [content for _, content in documents]
        
        # Tokenize documents
        self.tokenized_docs = [doc.lower().split() for doc in self.documents]
        
        # Create BM25 index
        self.bm25 = BM25Okapi(self.tokenized_docs)
    
    def search(self, query: str, top_k: int = 10) -> List[Tuple[str, float, str]]:
        """Search using BM25"""
        if not self.bm25:
            return []
        
        # Tokenize query
        tokenized_query = query.lower().split()
        
        # Get BM25 scores
        scores = self.bm25.get_scores(tokenized_query)
        
        # Get top k results
        top_indices = np.argsort(scores)[-top_k:][::-1]
        
        results = []
        for idx in top_indices:
            if scores[idx] > 0:
                results.append((
                    self.doc_ids[idx],
                    float(scores[idx]),
                    self.documents[idx]
                ))
        
        return results


class GraphSearchEngine:
    """Graph-based search using NetworkX"""
    
    def __init__(self):
        self.graph = nx.DiGraph() if NETWORKX_AVAILABLE else None
        self.node_content = {}
    
    def add_node(self, node_id: str, content: str, **attributes):
        """Add node to graph"""
        if not self.graph:
            return
        
        self.graph.add_node(node_id, **attributes)
        self.node_content[node_id] = content
    
    def add_edge(self, source: str, target: str, weight: float = 1.0, **attributes):
        """Add edge between nodes"""
        if not self.graph:
            return
        
        self.graph.add_edge(source, target, weight=weight, **attributes)
    
    def search_by_pagerank(self, query: str, top_k: int = 10) -> List[Tuple[str, float, str]]:
        """Search using PageRank algorithm"""
        if not self.graph:
            return []
        
        # Calculate PageRank
        pagerank_scores = nx.pagerank(self.graph)
        
        # Filter nodes by query relevance (simple keyword matching)
        query_words = set(query.lower().split())
        relevant_nodes = []
        
        for node_id, content in self.node_content.items():
            content_words = set(content.lower().split())
            if query_words & content_words:  # Intersection
                relevant_nodes.append((
                    node_id,
                    pagerank_scores.get(node_id, 0),
                    content
                ))
        
        # Sort by PageRank score
        relevant_nodes.sort(key=lambda x: x[1], reverse=True)
        
        return relevant_nodes[:top_k]
    
    def search_by_similarity_propagation(
        self,
        seed_nodes: List[str],
        max_hops: int = 2,
        top_k: int = 10
    ) -> List[Tuple[str, float, str]]:
        """Search by propagating similarity through graph"""
        if not self.graph:
            return []
        
        scores = defaultdict(float)
        visited = set()
        
        # BFS with score propagation
        queue = [(node, 1.0, 0) for node in seed_nodes]
        
        while queue:
            node, score, depth = queue.pop(0)
            
            if node in visited or depth > max_hops:
                continue
            
            visited.add(node)
            scores[node] = max(scores[node], score)
            
            # Propagate to neighbors
            if depth < max_hops:
                for neighbor in self.graph.neighbors(node):
                    edge_weight = self.graph[node][neighbor].get('weight', 1.0)
                    propagated_score = score * edge_weight * 0.7  # Decay factor
                    queue.append((neighbor, propagated_score, depth + 1))
        
        # Get results
        results = []
        for node_id, score in scores.items():
            if node_id in self.node_content:
                results.append((
                    node_id,
                    score,
                    self.node_content[node_id]
                ))
        
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]


class HybridSearchService:
    """Main hybrid search service combining multiple search strategies"""
    
    def __init__(self):
        self.keyword_engine = KeywordSearchEngine()
        self.bm25_engine = BM25SearchEngine()
        self.graph_engine = GraphSearchEngine()
        self.embedding_service = EmbeddingService()
        self.vector_store = VectorStore(VectorStoreType.CHROMA, index_name='hybrid-search')
        self.cache = cache_manager
        
        # Fusion weights for hybrid ranking
        self.fusion_weights = {
            SearchType.KEYWORD: 0.3,
            SearchType.SEMANTIC: 0.4,
            SearchType.GRAPH: 0.3
        }
    
    async def index_document(self,
                           doc_id: str,
                           content: str,
                           metadata: Optional[Dict[str, Any]] = None,
                           connections: Optional[List[Tuple[str, float]]] = None):
        """Index document across all search engines"""
        metadata = metadata or {}
        
        # Keyword indexing
        self.keyword_engine.index_document(
            doc_id=doc_id,
            content=content,
            **metadata
        )
        
        # BM25 indexing (batch operation)
        # Would typically batch these
        
        # Semantic indexing
        embedding = await self.embedding_service.embed_text(content)
        await self.vector_store.upsert([{
            'id': doc_id,
            'embedding': embedding,
            'metadata': {
                'content': content,
                **metadata
            }
        }])
        
        # Graph indexing
        self.graph_engine.add_node(doc_id, content, **metadata)
        if connections:
            for target_id, weight in connections:
                self.graph_engine.add_edge(doc_id, target_id, weight)
    
    async def search(self,
                   query: str,
                   search_types: List[SearchType] = None,
                   limit: int = 10,
                   filters: Optional[Dict[str, Any]] = None,
                   rerank: bool = True) -> SearchResponse:
        """Perform hybrid search"""
        start_time = datetime.utcnow()
        
        # Default to hybrid search
        if not search_types:
            search_types = [SearchType.KEYWORD, SearchType.SEMANTIC]
        
        # Check cache
        cache_key = f"search:{hash(query)}:{':'.join(st.value for st in search_types)}:{limit}"
        cached = await self.cache.get(cache_key)
        if cached:
            return SearchResponse(**json.loads(cached))
        
        # Perform individual searches
        all_results = {}
        
        # Keyword search
        if SearchType.KEYWORD in search_types:
            keyword_results = await self._keyword_search(query, filters, limit * 2)
            all_results[SearchType.KEYWORD] = keyword_results
        
        # Semantic search
        if SearchType.SEMANTIC in search_types:
            semantic_results = await self._semantic_search(query, filters, limit * 2)
            all_results[SearchType.SEMANTIC] = semantic_results
        
        # Graph search
        if SearchType.GRAPH in search_types:
            graph_results = await self._graph_search(query, limit * 2)
            all_results[SearchType.GRAPH] = graph_results
        
        # Fusion ranking
        final_results = self._fusion_ranking(all_results, limit)
        
        # Reranking if requested
        if rerank and len(final_results) > 1:
            final_results = await self._rerank_results(query, final_results)
        
        # Query expansion suggestions
        suggestions = await self._generate_suggestions(query, final_results)
        
        # Build response
        response = SearchResponse(
            results=final_results[:limit],
            total_count=len(final_results),
            search_time_ms=(datetime.utcnow() - start_time).total_seconds() * 1000,
            suggestions=suggestions
        )
        
        # Cache response
        await self.cache.set(cache_key, json.dumps({
            'results': [r.__dict__ for r in response.results],
            'total_count': response.total_count,
            'search_time_ms': response.search_time_ms,
            'suggestions': response.suggestions
        }), ttl=3600)
        
        return response
    
    async def _keyword_search(self, 
                            query: str, 
                            filters: Dict[str, Any],
                            limit: int) -> List[SearchResult]:
        """Perform keyword search"""
        search_query = SearchQuery(
            query=query,
            search_type=SearchType.KEYWORD,
            filters=filters,
            limit=limit
        )
        
        results = self.keyword_engine.search(search_query)
        
        return [
            SearchResult(
                id=doc_id,
                content=metadata.get('content', ''),
                score=score,
                source='keyword',
                metadata=metadata,
                highlights=metadata.get('highlights', [])
            )
            for doc_id, score, metadata in results
        ]
    
    async def _semantic_search(self,
                             query: str,
                             filters: Dict[str, Any],
                             limit: int) -> List[SearchResult]:
        """Perform semantic search"""
        # Generate query embedding
        query_embedding = await self.embedding_service.embed_text(query)
        
        # Search vector store
        results = await self.vector_store.search(
            query_embedding,
            top_k=limit,
            filter=filters
        )
        
        return [
            SearchResult(
                id=doc_id,
                content=metadata.get('content', ''),
                score=score,
                source='semantic',
                metadata=metadata
            )
            for doc_id, score, metadata in results
        ]
    
    async def _graph_search(self, query: str, limit: int) -> List[SearchResult]:
        """Perform graph-based search"""
        results = self.graph_engine.search_by_pagerank(query, limit)
        
        return [
            SearchResult(
                id=doc_id,
                content=content,
                score=score,
                source='graph',
                metadata={}
            )
            for doc_id, score, content in results
        ]
    
    def _fusion_ranking(self,
                       results_by_type: Dict[SearchType, List[SearchResult]],
                       limit: int) -> List[SearchResult]:
        """Combine results from different search types"""
        # Reciprocal Rank Fusion (RRF)
        doc_scores = defaultdict(float)
        doc_map = {}
        
        k = 60  # RRF parameter
        
        for search_type, results in results_by_type.items():
            weight = self.fusion_weights.get(search_type, 1.0)
            
            for rank, result in enumerate(results):
                # RRF score
                rrf_score = weight / (k + rank + 1)
                doc_scores[result.id] += rrf_score
                
                # Keep the result with highest individual score
                if result.id not in doc_map or result.score > doc_map[result.id].score:
                    doc_map[result.id] = result
        
        # Sort by fusion score
        sorted_ids = sorted(doc_scores.keys(), key=lambda x: doc_scores[x], reverse=True)
        
        # Build final results
        final_results = []
        for doc_id in sorted_ids[:limit]:
            result = doc_map[doc_id]
            result.score = doc_scores[doc_id]  # Update with fusion score
            final_results.append(result)
        
        return final_results
    
    async def _rerank_results(self,
                            query: str,
                            results: List[SearchResult]) -> List[SearchResult]:
        """Rerank results using cross-encoder or other methods"""
        # Simple TF-IDF based reranking
        if not SKLEARN_AVAILABLE:
            return results
        
        # Extract contents
        contents = [r.content for r in results]
        
        # Create TF-IDF vectors
        vectorizer = TfidfVectorizer()
        tfidf_matrix = vectorizer.fit_transform([query] + contents)
        
        # Calculate similarities
        query_vector = tfidf_matrix[0]
        doc_vectors = tfidf_matrix[1:]
        
        similarities = cosine_similarity(query_vector, doc_vectors)[0]
        
        # Combine with original scores
        for i, (result, similarity) in enumerate(zip(results, similarities)):
            # Weighted combination
            result.score = 0.7 * result.score + 0.3 * similarity
        
        # Re-sort by new scores
        results.sort(key=lambda r: r.score, reverse=True)
        
        return results
    
    async def _generate_suggestions(self,
                                  query: str,
                                  results: List[SearchResult]) -> List[str]:
        """Generate query suggestions based on results"""
        suggestions = []
        
        # Extract common terms from top results
        if results and SKLEARN_AVAILABLE:
            top_contents = [r.content for r in results[:5]]
            
            # Use TF-IDF to find important terms
            vectorizer = TfidfVectorizer(max_features=20, stop_words='english')
            tfidf_matrix = vectorizer.fit_transform(top_contents)
            
            # Get feature names (important terms)
            feature_names = vectorizer.get_feature_names_out()
            
            # Find terms not in original query
            query_terms = set(query.lower().split())
            
            for term in feature_names:
                if term.lower() not in query_terms:
                    suggestions.append(f"{query} {term}")
            
            suggestions = suggestions[:5]
        
        return suggestions
    
    async def more_like_this(self,
                           doc_id: str,
                           limit: int = 10) -> SearchResponse:
        """Find documents similar to a given document"""
        # Retrieve document
        doc_results = await self.vector_store.search(
            query_embedding=[0] * 384,  # Dummy embedding
            top_k=1,
            filter={'id': doc_id}
        )
        
        if not doc_results:
            return SearchResponse(results=[], total_count=0, search_time_ms=0)
        
        # Use document content as query
        _, _, metadata = doc_results[0]
        content = metadata.get('content', '')
        
        # Search for similar documents
        return await self.search(
            query=content[:500],  # Limit query length
            search_types=[SearchType.SEMANTIC],
            limit=limit
        )


# Singleton instance
_hybrid_search_service: Optional[HybridSearchService] = None


def get_hybrid_search_service() -> HybridSearchService:
    """Get or create hybrid search service instance"""
    global _hybrid_search_service
    if _hybrid_search_service is None:
        _hybrid_search_service = HybridSearchService()
    return _hybrid_search_service