"""LLM Health Check Endpoint."""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from ...services.ai.llm_client import llm_client
from ...shared.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/llm", tags=["LLM Health"])


@router.get("/health", response_model=Dict[str, Any])
async def check_llm_health():
    """Check the health status of the LLM integration.
    
    Returns:
        Dict containing health status and configuration info
    """
    try:
        health_status = await llm_client.health_check()
        
        return {
            "status": health_status["status"],
            "model": health_status.get("model"),
            "client_initialized": health_status.get("client_initialized", False),
            "usage_stats": health_status.get("usage_stats", {}),
            "error": health_status.get("error"),
            "configuration": {
                "model": llm_client.model,
                "max_tokens": llm_client.max_tokens,
                "temperature": llm_client.default_temperature,
                "api_key_configured": bool(llm_client.api_key)
            }
        }
    except Exception as e:
        logger.error(f"LLM health check failed: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail={
                "status": "unhealthy",
                "error": str(e),
                "message": "LLM service is not available"
            }
        )


@router.post("/test", response_model=Dict[str, Any])
async def test_llm_completion(prompt: str = "Hello, how are you?"):
    """Test LLM completion functionality.
    
    Args:
        prompt: Test prompt to send to the LLM
        
    Returns:
        Dict containing the test results
    """
    try:
        response = await llm_client.complete(
            prompt=prompt,
            max_tokens=50,
            temperature=0.5
        )
        
        return {
            "status": "success",
            "prompt": prompt,
            "response": response,
            "model": llm_client.model
        }
    except Exception as e:
        logger.error(f"LLM test failed: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail={
                "status": "failed",
                "error": str(e),
                "message": "LLM test completion failed"
            }
        )