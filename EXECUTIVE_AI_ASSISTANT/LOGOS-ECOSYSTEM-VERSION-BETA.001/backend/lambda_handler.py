"""
AWS Lambda handler for LOGOS Ecosystem API
This handler integrates with API Gateway and routes requests to FastAPI
"""

import json
import os
from typing import Dict, Any
from mangum import Mangum
from src.api.main import app

# Configure Mangum adapter for AWS Lambda
handler = Mangum(
    app,
    lifespan="off",  # Disable lifespan for Lambda
    api_gateway_base_path="/api",
    custom_handlers=[]
)

def warmup_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle Lambda warmup events"""
    if event.get("source") == "serverless-plugin-warmup":
        return {"statusCode": 200, "body": "Lambda warmed up"}
    return handler(event, context)

# Export the handler
lambda_handler = warmup_handler