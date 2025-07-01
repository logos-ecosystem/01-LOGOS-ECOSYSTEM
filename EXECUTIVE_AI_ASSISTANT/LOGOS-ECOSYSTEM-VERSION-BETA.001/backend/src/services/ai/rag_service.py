"""RAG (Retrieval Augmented Generation) Service for LOGOS Ecosystem"""

from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from datetime import datetime
import asyncio
import json
from dataclasses import dataclass
from enum import Enum

# Vector store integrations
try:
    import pinecone
    from pinecone import Pinecone, ServerlessSpec
    PINECONE_AVAILABLE = True
except ImportError:
    PINECONE_AVAILABLE = False

try:
    import weaviate
    WEAVIATE_AVAILABLE = True
except ImportError:
    WEAVIATE_AVAILABLE = False

try:
    import qdrant_client
    from qdrant_client import QdrantClient
    from qdrant_client.models import Distance, VectorParams, PointStruct
    QDRANT_AVAILABLE = True
except ImportError:
    QDRANT_AVAILABLE = False

try:
    import chromadb
    from chromadb.utils import embedding_functions
    CHROMA_AVAILABLE = True
except ImportError:
    CHROMA_AVAILABLE = False

# Embedding models
try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    import cohere
    COHERE_AVAILABLE = True
except ImportError:
    COHERE_AVAILABLE = False

from ...shared.utils.logger import get_logger
from ...shared.utils.config import get_settings
settings = get_settings()
from ...infrastructure.cache import cache_manager
from ..ai.ai_integration import AIService

logger = get_logger(__name__)


class VectorStoreType(Enum):
    PINECONE = "pinecone"
    WEAVIATE = "weaviate"
    QDRANT = "qdrant"
    CHROMA = "chroma"
    FAISS = "faiss"


class EmbeddingModelType(Enum):
    OPENAI = "openai"
    COHERE = "cohere"
    SENTENCE_TRANSFORMERS = "sentence_transformers"
    CUSTOM = "custom"


@dataclass
class Document:
    """Document for RAG processing"""
    id: str
    content: str
    metadata: Dict[str, Any]
    embedding: Optional[List[float]] = None
    chunk_id: Optional[int] = None
    source: Optional[str] = None


@dataclass
class RetrievalResult:
    """Result from retrieval operation"""
    document: Document
    score: float
    reranked_score: Optional[float] = None


class ChunkingStrategy:
    """Document chunking strategies"""
    
    @staticmethod
    def fixed_size_chunking(text: str, chunk_size: int = 512, overlap: int = 50) -> List[str]:
        """Fixed size chunking with overlap"""
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            chunks.append(chunk)
            start = end - overlap
        
        return chunks
    
    @staticmethod
    def sentence_chunking(text: str, max_chunk_size: int = 512) -> List[str]:
        """Chunk by sentences with size limit"""
        import nltk
        try:
            nltk.data.find('tokenizers/punkt')
        except LookupError:
            nltk.download('punkt')
        
        sentences = nltk.sent_tokenize(text)
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            if len(current_chunk) + len(sentence) <= max_chunk_size:
                current_chunk += " " + sentence
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = sentence
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks
    
    @staticmethod
    def semantic_chunking(text: str, model: Any, threshold: float = 0.7) -> List[str]:
        """Semantic chunking based on similarity"""
        # Advanced semantic chunking implementation
        sentences = ChunkingStrategy.sentence_chunking(text, max_chunk_size=100)
        
        if len(sentences) <= 1:
            return sentences
        
        # Calculate embeddings for sentences
        embeddings = model.encode(sentences)
        
        chunks = []
        current_chunk = [sentences[0]]
        current_embedding = embeddings[0]
        
        for i in range(1, len(sentences)):
            similarity = np.dot(current_embedding, embeddings[i]) / (
                np.linalg.norm(current_embedding) * np.linalg.norm(embeddings[i])
            )
            
            if similarity >= threshold:
                current_chunk.append(sentences[i])
                # Update embedding as average
                current_embedding = np.mean([current_embedding, embeddings[i]], axis=0)
            else:
                chunks.append(" ".join(current_chunk))
                current_chunk = [sentences[i]]
                current_embedding = embeddings[i]
        
        if current_chunk:
            chunks.append(" ".join(current_chunk))
        
        return chunks


class EmbeddingService:
    """Unified embedding service"""
    
    def __init__(self, model_type: EmbeddingModelType = EmbeddingModelType.SENTENCE_TRANSFORMERS):
        self.model_type = model_type
        self.model = None
        self._initialize_model()
    
    def _initialize_model(self):
        """Initialize embedding model"""
        if self.model_type == EmbeddingModelType.SENTENCE_TRANSFORMERS:
            if SENTENCE_TRANSFORMERS_AVAILABLE:
                self.model = SentenceTransformer('all-MiniLM-L6-v2')
            else:
                logger.warning("Sentence transformers not available")
        
        elif self.model_type == EmbeddingModelType.OPENAI:
            if OPENAI_AVAILABLE:
                openai.api_key = settings.OPENAI_API_KEY
                self.model = "text-embedding-3-small"
            else:
                logger.warning("OpenAI not available")
        
        elif self.model_type == EmbeddingModelType.COHERE:
            if COHERE_AVAILABLE:
                self.model = cohere.Client(settings.COHERE_API_KEY)
            else:
                logger.warning("Cohere not available")
    
    async def embed_text(self, text: str) -> List[float]:
        """Generate embedding for text"""
        cache_key = f"embedding:{self.model_type.value}:{hash(text)}"
        
        # Check cache
        cached = await cache_manager.get(cache_key)
        if cached:
            return json.loads(cached)
        
        embedding = None
        
        if self.model_type == EmbeddingModelType.SENTENCE_TRANSFORMERS:
            embedding = self.model.encode(text).tolist()
        
        elif self.model_type == EmbeddingModelType.OPENAI:
            response = await openai.Embedding.create(
                model=self.model,
                input=text
            )
            embedding = response.data[0].embedding
        
        elif self.model_type == EmbeddingModelType.COHERE:
            response = self.model.embed(texts=[text])
            embedding = response.embeddings[0]
        
        # Cache embedding
        if embedding:
            await cache_manager.set(cache_key, json.dumps(embedding), ttl=86400)  # 24 hours
        
        return embedding
    
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for batch of texts"""
        if self.model_type == EmbeddingModelType.SENTENCE_TRANSFORMERS:
            return self.model.encode(texts).tolist()
        else:
            # For API-based models, use async batch processing
            tasks = [self.embed_text(text) for text in texts]
            return await asyncio.gather(*tasks)


class VectorStore:
    """Unified vector store interface"""
    
    def __init__(self, store_type: VectorStoreType, **kwargs):
        self.store_type = store_type
        self.client = None
        self.index_name = kwargs.get('index_name', 'logos-ecosystem')
        self._initialize_store(**kwargs)
    
    def _initialize_store(self, **kwargs):
        """Initialize vector store client"""
        if self.store_type == VectorStoreType.PINECONE:
            if PINECONE_AVAILABLE:
                pc = Pinecone(api_key=settings.PINECONE_API_KEY)
                
                # Create index if not exists
                if self.index_name not in pc.list_indexes().names():
                    pc.create_index(
                        name=self.index_name,
                        dimension=kwargs.get('dimension', 384),
                        metric=kwargs.get('metric', 'cosine'),
                        spec=ServerlessSpec(
                            cloud=kwargs.get('cloud', 'aws'),
                            region=kwargs.get('region', 'us-east-1')
                        )
                    )
                
                self.client = pc.Index(self.index_name)
        
        elif self.store_type == VectorStoreType.QDRANT:
            if QDRANT_AVAILABLE:
                self.client = QdrantClient(
                    host=kwargs.get('host', 'localhost'),
                    port=kwargs.get('port', 6333)
                )
                
                # Create collection if not exists
                try:
                    self.client.get_collection(self.index_name)
                except:
                    self.client.create_collection(
                        collection_name=self.index_name,
                        vectors_config=VectorParams(
                            size=kwargs.get('dimension', 384),
                            distance=Distance.COSINE
                        )
                    )
        
        elif self.store_type == VectorStoreType.CHROMA:
            if CHROMA_AVAILABLE:
                self.client = chromadb.PersistentClient(
                    path=kwargs.get('path', './chroma_db')
                )
                self.collection = self.client.get_or_create_collection(
                    name=self.index_name
                )
    
    async def upsert(self, documents: List[Document]):
        """Insert or update documents in vector store"""
        if self.store_type == VectorStoreType.PINECONE:
            vectors = [
                (doc.id, doc.embedding, doc.metadata)
                for doc in documents
            ]
            self.client.upsert(vectors=vectors)
        
        elif self.store_type == VectorStoreType.QDRANT:
            points = [
                PointStruct(
                    id=doc.id,
                    vector=doc.embedding,
                    payload=doc.metadata
                )
                for doc in documents
            ]
            self.client.upsert(
                collection_name=self.index_name,
                points=points
            )
        
        elif self.store_type == VectorStoreType.CHROMA:
            self.collection.upsert(
                ids=[doc.id for doc in documents],
                embeddings=[doc.embedding for doc in documents],
                metadatas=[doc.metadata for doc in documents],
                documents=[doc.content for doc in documents]
            )
    
    async def search(self, 
                    query_embedding: List[float], 
                    top_k: int = 10,
                    filter: Optional[Dict[str, Any]] = None) -> List[Tuple[str, float, Dict[str, Any]]]:
        """Search similar vectors"""
        results = []
        
        if self.store_type == VectorStoreType.PINECONE:
            response = self.client.query(
                vector=query_embedding,
                top_k=top_k,
                filter=filter,
                include_metadata=True
            )
            results = [
                (match.id, match.score, match.metadata)
                for match in response.matches
            ]
        
        elif self.store_type == VectorStoreType.QDRANT:
            search_result = self.client.search(
                collection_name=self.index_name,
                query_vector=query_embedding,
                limit=top_k,
                query_filter=filter
            )
            results = [
                (hit.id, hit.score, hit.payload)
                for hit in search_result
            ]
        
        elif self.store_type == VectorStoreType.CHROMA:
            search_results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=filter
            )
            for i in range(len(search_results['ids'][0])):
                results.append((
                    search_results['ids'][0][i],
                    search_results['distances'][0][i],
                    search_results['metadatas'][0][i]
                ))
        
        return results


class Reranker:
    """Document reranking service"""
    
    def __init__(self, model_type: str = "cross-encoder"):
        self.model_type = model_type
        self.model = None
        
        if model_type == "cross-encoder" and SENTENCE_TRANSFORMERS_AVAILABLE:
            from sentence_transformers import CrossEncoder
            self.model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
    
    async def rerank(self, query: str, documents: List[Document], top_k: int = 5) -> List[RetrievalResult]:
        """Rerank documents based on query relevance"""
        if self.model_type == "cross-encoder" and self.model:
            # Prepare pairs for cross-encoder
            pairs = [(query, doc.content) for doc in documents]
            scores = self.model.predict(pairs)
            
            # Sort by score and return top k
            results = []
            for i, (doc, score) in enumerate(sorted(
                zip(documents, scores), 
                key=lambda x: x[1], 
                reverse=True
            )[:top_k]):
                results.append(RetrievalResult(
                    document=doc,
                    score=float(scores[i]),
                    reranked_score=float(score)
                ))
            
            return results
        
        # Fallback to original scores
        return [
            RetrievalResult(document=doc, score=1.0)
            for doc in documents[:top_k]
        ]


class RAGService:
    """Main RAG service for LOGOS Ecosystem"""
    
    def __init__(self,
                 vector_store_type: VectorStoreType = VectorStoreType.CHROMA,
                 embedding_model_type: EmbeddingModelType = EmbeddingModelType.SENTENCE_TRANSFORMERS,
                 **kwargs):
        self.vector_store = VectorStore(vector_store_type, **kwargs)
        self.embedding_service = EmbeddingService(embedding_model_type)
        self.reranker = Reranker()
        self.ai_service = AIService()
        self.cache = cache_manager
    
    async def ingest_documents(self, 
                             documents: List[Dict[str, Any]], 
                             chunking_strategy: str = "sentence",
                             chunk_size: int = 512) -> int:
        """Ingest documents into RAG system"""
        total_chunks = 0
        
        for doc_data in documents:
            # Extract content
            content = doc_data.get('content', '')
            metadata = doc_data.get('metadata', {})
            doc_id = doc_data.get('id', str(datetime.utcnow().timestamp()))
            
            # Chunk document
            if chunking_strategy == "fixed":
                chunks = ChunkingStrategy.fixed_size_chunking(content, chunk_size)
            elif chunking_strategy == "sentence":
                chunks = ChunkingStrategy.sentence_chunking(content, chunk_size)
            else:
                chunks = [content]  # No chunking
            
            # Create document objects and generate embeddings
            chunk_documents = []
            embeddings = await self.embedding_service.embed_batch(chunks)
            
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                chunk_doc = Document(
                    id=f"{doc_id}_chunk_{i}",
                    content=chunk,
                    metadata={
                        **metadata,
                        'chunk_id': i,
                        'parent_doc_id': doc_id,
                        'chunk_strategy': chunking_strategy
                    },
                    embedding=embedding,
                    source=metadata.get('source', 'unknown')
                )
                chunk_documents.append(chunk_doc)
            
            # Store in vector database
            await self.vector_store.upsert(chunk_documents)
            total_chunks += len(chunk_documents)
        
        logger.info(f"Ingested {len(documents)} documents as {total_chunks} chunks")
        return total_chunks
    
    async def retrieve(self,
                      query: str,
                      top_k: int = 10,
                      filter: Optional[Dict[str, Any]] = None,
                      use_reranking: bool = True) -> List[RetrievalResult]:
        """Retrieve relevant documents for query"""
        # Generate query embedding
        query_embedding = await self.embedding_service.embed_text(query)
        
        # Search vector store
        search_results = await self.vector_store.search(
            query_embedding,
            top_k=top_k * 2 if use_reranking else top_k,  # Get more for reranking
            filter=filter
        )
        
        # Convert to documents
        documents = []
        for doc_id, score, metadata in search_results:
            # Retrieve full content if needed
            content = metadata.get('content', '')
            
            doc = Document(
                id=doc_id,
                content=content,
                metadata=metadata,
                source=metadata.get('source', 'unknown')
            )
            documents.append(doc)
        
        # Rerank if enabled
        if use_reranking and documents:
            results = await self.reranker.rerank(query, documents, top_k)
        else:
            results = [
                RetrievalResult(document=doc, score=score)
                for doc, (_, score, _) in zip(documents, search_results[:top_k])
            ]
        
        return results
    
    async def generate_answer(self,
                            query: str,
                            retrieved_docs: List[RetrievalResult],
                            system_prompt: Optional[str] = None,
                            max_tokens: int = 1000) -> Dict[str, Any]:
        """Generate answer using retrieved context"""
        # Build context from retrieved documents
        context_parts = []
        for i, result in enumerate(retrieved_docs):
            context_parts.append(
                f"[Document {i+1}] (Relevance: {result.score:.2f})\n"
                f"Source: {result.document.source}\n"
                f"Content: {result.document.content}\n"
            )
        
        context = "\n---\n".join(context_parts)
        
        # Build RAG prompt
        rag_prompt = f"""You are a helpful AI assistant. Use the following retrieved context to answer the user's question.
If the context doesn't contain relevant information, say so honestly.

Context:
{context}

User Question: {query}

Please provide a comprehensive answer based on the context provided."""
        
        if system_prompt:
            rag_prompt = f"{system_prompt}\n\n{rag_prompt}"
        
        # Generate response
        response = await self.ai_service.generate_response(
            prompt=rag_prompt,
            max_tokens=max_tokens,
            temperature=0.7
        )
        
        return {
            'answer': response['content'],
            'sources': [
                {
                    'source': doc.document.source,
                    'score': doc.score,
                    'content_preview': doc.document.content[:200] + '...'
                }
                for doc in retrieved_docs
            ],
            'tokens_used': response.get('tokens_used', 0)
        }
    
    async def rag_query(self,
                       query: str,
                       top_k: int = 5,
                       filter: Optional[Dict[str, Any]] = None,
                       use_reranking: bool = True,
                       system_prompt: Optional[str] = None) -> Dict[str, Any]:
        """Complete RAG pipeline: retrieve and generate"""
        # Check cache
        cache_key = f"rag:{hash(query)}:{top_k}:{json.dumps(filter or {})}"
        cached = await self.cache.get(cache_key)
        if cached:
            return json.loads(cached)
        
        # Retrieve relevant documents
        retrieved_docs = await self.retrieve(
            query=query,
            top_k=top_k,
            filter=filter,
            use_reranking=use_reranking
        )
        
        # Generate answer
        result = await self.generate_answer(
            query=query,
            retrieved_docs=retrieved_docs,
            system_prompt=system_prompt
        )
        
        # Add metadata
        result['retrieval_metadata'] = {
            'documents_retrieved': len(retrieved_docs),
            'use_reranking': use_reranking,
            'top_k': top_k,
            'filter': filter
        }
        
        # Cache result
        await self.cache.set(cache_key, json.dumps(result), ttl=3600)  # 1 hour
        
        return result
    
    async def hybrid_search(self,
                          query: str,
                          keyword_weight: float = 0.3,
                          semantic_weight: float = 0.7,
                          top_k: int = 10) -> List[RetrievalResult]:
        """Hybrid search combining keyword and semantic search"""
        # Semantic search
        semantic_results = await self.retrieve(
            query=query,
            top_k=top_k * 2,
            use_reranking=False
        )
        
        # Keyword search (using metadata filtering)
        keywords = query.lower().split()
        keyword_filter = {
            'keywords': {'$in': keywords}  # Assumes keywords are stored in metadata
        }
        keyword_results = await self.vector_store.search(
            query_embedding=await self.embedding_service.embed_text(query),
            top_k=top_k * 2,
            filter=keyword_filter
        )
        
        # Combine and reweight scores
        combined_scores = {}
        
        for result in semantic_results:
            combined_scores[result.document.id] = {
                'document': result.document,
                'score': result.score * semantic_weight
            }
        
        for doc_id, score, metadata in keyword_results:
            if doc_id in combined_scores:
                combined_scores[doc_id]['score'] += score * keyword_weight
            else:
                doc = Document(
                    id=doc_id,
                    content=metadata.get('content', ''),
                    metadata=metadata
                )
                combined_scores[doc_id] = {
                    'document': doc,
                    'score': score * keyword_weight
                }
        
        # Sort by combined score
        sorted_results = sorted(
            combined_scores.values(),
            key=lambda x: x['score'],
            reverse=True
        )[:top_k]
        
        return [
            RetrievalResult(
                document=item['document'],
                score=item['score']
            )
            for item in sorted_results
        ]
    
    async def update_document(self, doc_id: str, new_content: str, new_metadata: Optional[Dict[str, Any]] = None):
        """Update existing document in RAG system"""
        # Generate new embedding
        embedding = await self.embedding_service.embed_text(new_content)
        
        # Create updated document
        doc = Document(
            id=doc_id,
            content=new_content,
            metadata=new_metadata or {},
            embedding=embedding
        )
        
        # Update in vector store
        await self.vector_store.upsert([doc])
        
        # Invalidate relevant caches
        await self.cache.delete_pattern(f"rag:*")
    
    async def delete_document(self, doc_id: str):
        """Delete document from RAG system"""
        # Implementation depends on vector store
        # Most vector stores support delete operations
        logger.info(f"Deleting document {doc_id}")
        # Invalidate caches
        await self.cache.delete_pattern(f"rag:*")


# Singleton instance
_rag_service: Optional[RAGService] = None


def get_rag_service() -> RAGService:
    """Get or create RAG service instance"""
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service