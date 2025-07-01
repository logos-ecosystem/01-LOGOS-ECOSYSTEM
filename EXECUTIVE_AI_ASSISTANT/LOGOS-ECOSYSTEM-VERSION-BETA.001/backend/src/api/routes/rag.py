"""RAG API Routes for LOGOS Ecosystem"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
import json

from ...shared.schemas.base import ResponseModel
from ...shared.models.user import User
from ...infrastructure.database import get_db
from ..deps import get_current_user
from ...services.ai.rag_service import get_rag_service, VectorStoreType, EmbeddingModelType
from ...services.ai.memory_service import get_memory_service, MemoryType, MemoryImportance
from ...services.ai.hybrid_search_service import get_hybrid_search_service, SearchType
from ...services.ai.fine_tuning_service import get_fine_tuning_service, TrainingConfig, ModelType
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

router = APIRouter(prefix="/rag", tags=["RAG"])


class DocumentIngest(BaseModel):
    """Document ingestion request"""
    documents: List[Dict[str, Any]] = Field(..., description="Documents to ingest")
    chunking_strategy: str = Field("sentence", description="Chunking strategy: fixed, sentence, semantic")
    chunk_size: int = Field(512, description="Chunk size for splitting")


class RAGQuery(BaseModel):
    """RAG query request"""
    query: str = Field(..., description="Query text")
    top_k: int = Field(5, description="Number of documents to retrieve")
    use_reranking: bool = Field(True, description="Use reranking")
    filter: Optional[Dict[str, Any]] = Field(None, description="Metadata filters")
    system_prompt: Optional[str] = Field(None, description="System prompt for generation")


class MemoryStore(BaseModel):
    """Memory storage request"""
    content: str = Field(..., description="Memory content")
    memory_type: str = Field("semantic", description="Memory type")
    importance: int = Field(3, description="Importance level 1-5")
    context: Optional[Dict[str, Any]] = Field(None, description="Context metadata")
    associations: Optional[List[str]] = Field(None, description="Associated memory IDs")


class MemoryQuery(BaseModel):
    """Memory query request"""
    query: str = Field(..., description="Query for memory retrieval")
    memory_types: Optional[List[str]] = Field(None, description="Filter by memory types")
    top_k: int = Field(10, description="Number of memories to retrieve")
    use_spreading_activation: bool = Field(True, description="Use spreading activation")


class HybridSearchQuery(BaseModel):
    """Hybrid search query"""
    query: str = Field(..., description="Search query")
    search_types: Optional[List[str]] = Field(None, description="Search types to use")
    limit: int = Field(10, description="Maximum results")
    filters: Optional[Dict[str, Any]] = Field(None, description="Search filters")
    rerank: bool = Field(True, description="Rerank results")


class TrainingJobRequest(BaseModel):
    """Training job creation request"""
    name: str = Field(..., description="Job name")
    description: str = Field(..., description="Job description")
    model_type: str = Field("causal_lm", description="Model type")
    base_model: str = Field("microsoft/DialoGPT-small", description="Base model")
    training_data: List[Dict[str, Any]] = Field(..., description="Training data")
    config: Optional[Dict[str, Any]] = Field(None, description="Training configuration")


@router.post("/ingest", response_model=ResponseModel)
async def ingest_documents(
    request: DocumentIngest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ingest documents into RAG system"""
    try:
        rag_service = get_rag_service()
        
        # Add metadata to documents
        for doc in request.documents:
            doc['metadata'] = doc.get('metadata', {})
            doc['metadata']['user_id'] = str(current_user.id)
            doc['metadata']['ingested_at'] = datetime.utcnow().isoformat()
        
        # Ingest documents
        chunk_count = await rag_service.ingest_documents(
            documents=request.documents,
            chunking_strategy=request.chunking_strategy,
            chunk_size=request.chunk_size
        )
        
        return ResponseModel(
            success=True,
            message=f"Successfully ingested {len(request.documents)} documents as {chunk_count} chunks",
            data={
                "documents_count": len(request.documents),
                "chunks_count": chunk_count,
                "chunking_strategy": request.chunking_strategy
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document ingestion failed: {str(e)}"
        )


@router.post("/query", response_model=ResponseModel)
async def query_rag(
    request: RAGQuery,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Query RAG system"""
    try:
        rag_service = get_rag_service()
        
        # Add user filter
        filter_dict = request.filter or {}
        filter_dict['user_id'] = str(current_user.id)
        
        # Perform RAG query
        result = await rag_service.rag_query(
            query=request.query,
            top_k=request.top_k,
            filter=filter_dict,
            use_reranking=request.use_reranking,
            system_prompt=request.system_prompt
        )
        
        return ResponseModel(
            success=True,
            message="RAG query completed successfully",
            data=result
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG query failed: {str(e)}"
        )


@router.post("/memory/store", response_model=ResponseModel)
async def store_memory(
    request: MemoryStore,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Store a memory"""
    try:
        memory_service = get_memory_service()
        
        # Convert string to enum
        memory_type = MemoryType(request.memory_type)
        importance = MemoryImportance(request.importance)
        
        # Store memory
        memory = await memory_service.store_memory(
            content=request.content,
            memory_type=memory_type,
            user_id=str(current_user.id),
            agent_id="general",  # Could be from request
            importance=importance,
            context=request.context,
            associations=request.associations
        )
        
        return ResponseModel(
            success=True,
            message="Memory stored successfully",
            data={
                "memory_id": memory.id,
                "memory_type": memory.memory_type.value,
                "importance": memory.importance.value
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Memory storage failed: {str(e)}"
        )


@router.post("/memory/retrieve", response_model=ResponseModel)
async def retrieve_memories(
    request: MemoryQuery,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve memories"""
    try:
        memory_service = get_memory_service()
        
        # Convert memory types
        memory_types = None
        if request.memory_types:
            memory_types = [MemoryType(mt) for mt in request.memory_types]
        
        # Retrieve memories
        memories = await memory_service.retrieve_memories(
            query=request.query,
            user_id=str(current_user.id),
            agent_id="general",
            memory_types=memory_types,
            top_k=request.top_k,
            use_spreading_activation=request.use_spreading_activation
        )
        
        # Convert to response format
        memory_data = [
            {
                "id": m.id,
                "content": m.content,
                "type": m.memory_type.value,
                "importance": m.importance.value,
                "created_at": m.created_at.isoformat(),
                "access_count": m.access_count
            }
            for m in memories
        ]
        
        return ResponseModel(
            success=True,
            message=f"Retrieved {len(memories)} memories",
            data={"memories": memory_data}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Memory retrieval failed: {str(e)}"
        )


@router.post("/search", response_model=ResponseModel)
async def hybrid_search(
    request: HybridSearchQuery,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Perform hybrid search"""
    try:
        search_service = get_hybrid_search_service()
        
        # Convert search types
        search_types = None
        if request.search_types:
            search_types = [SearchType(st) for st in request.search_types]
        
        # Add user filter
        filters = request.filters or {}
        filters['user_id'] = str(current_user.id)
        
        # Perform search
        response = await search_service.search(
            query=request.query,
            search_types=search_types,
            limit=request.limit,
            filters=filters,
            rerank=request.rerank
        )
        
        # Convert to dict
        results = [
            {
                "id": r.id,
                "content": r.content[:200] + "..." if len(r.content) > 200 else r.content,
                "score": r.score,
                "source": r.source,
                "metadata": r.metadata
            }
            for r in response.results
        ]
        
        return ResponseModel(
            success=True,
            message="Search completed successfully",
            data={
                "results": results,
                "total_count": response.total_count,
                "search_time_ms": response.search_time_ms,
                "suggestions": response.suggestions
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )


@router.post("/fine-tune", response_model=ResponseModel)
async def create_fine_tuning_job(
    request: TrainingJobRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a fine-tuning job"""
    try:
        fine_tuning_service = get_fine_tuning_service()
        
        # Prepare dataset
        dataset = await fine_tuning_service.prepare_dataset_from_conversations(
            conversations=request.training_data
        )
        
        # Create training config
        config_dict = request.config or {}
        config = TrainingConfig(
            model_name=request.name,
            model_type=ModelType(request.model_type),
            base_model=request.base_model,
            **config_dict
        )
        
        # Create training job
        job_id = await fine_tuning_service.create_training_job(
            name=request.name,
            description=request.description,
            dataset=dataset,
            config=config
        )
        
        return ResponseModel(
            success=True,
            message="Fine-tuning job created successfully",
            data={
                "job_id": job_id,
                "status": "preparing",
                "dataset_info": dataset.metadata
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fine-tuning job creation failed: {str(e)}"
        )


@router.get("/fine-tune/{job_id}", response_model=ResponseModel)
async def get_fine_tuning_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get fine-tuning job status"""
    try:
        fine_tuning_service = get_fine_tuning_service()
        
        status = await fine_tuning_service.get_training_job_status(job_id)
        
        return ResponseModel(
            success=True,
            message="Job status retrieved",
            data=status
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get job status: {str(e)}"
        )


@router.post("/memory/consolidate", response_model=ResponseModel)
async def consolidate_memories(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Consolidate user memories"""
    try:
        memory_service = get_memory_service()
        
        # Run consolidation in background
        background_tasks.add_task(
            memory_service.consolidate_memories,
            user_id=str(current_user.id),
            agent_id="general"
        )
        
        return ResponseModel(
            success=True,
            message="Memory consolidation started in background",
            data={"status": "processing"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Memory consolidation failed: {str(e)}"
        )


@router.get("/memory/summary", response_model=ResponseModel)
async def get_memory_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get memory summary for user"""
    try:
        memory_service = get_memory_service()
        
        summary = await memory_service.create_memory_summary(
            user_id=str(current_user.id),
            agent_id="general"
        )
        
        return ResponseModel(
            success=True,
            message="Memory summary retrieved",
            data=summary
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get memory summary: {str(e)}"
        )