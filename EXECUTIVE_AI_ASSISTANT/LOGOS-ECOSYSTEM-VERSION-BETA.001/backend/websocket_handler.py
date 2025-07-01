"""
AWS Lambda handler for WebSocket connections
Handles WebSocket connect, disconnect, and message routing
"""

import json
import os
import boto3
from typing import Dict, Any
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS services
dynamodb = boto3.resource('dynamodb')
apigateway = boto3.client('apigatewaymanagementapi')

# Get table name from environment
CONNECTIONS_TABLE = os.environ.get('CONNECTIONS_TABLE', 'logos-websocket-connections')

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main WebSocket handler"""
    route_key = event.get('requestContext', {}).get('routeKey')
    connection_id = event.get('requestContext', {}).get('connectionId')
    
    logger.info(f"Route: {route_key}, Connection: {connection_id}")
    
    if route_key == '$connect':
        return handle_connect(connection_id, event)
    elif route_key == '$disconnect':
        return handle_disconnect(connection_id)
    elif route_key == '$default':
        return handle_message(connection_id, event)
    else:
        return {'statusCode': 400, 'body': 'Invalid route'}

def handle_connect(connection_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Handle new WebSocket connections"""
    try:
        # Store connection in DynamoDB
        table = dynamodb.Table(CONNECTIONS_TABLE)
        
        # Get user info from authorization if available
        headers = event.get('headers', {})
        auth_token = headers.get('Authorization', '')
        
        table.put_item(
            Item={
                'connectionId': connection_id,
                'timestamp': context.request_time_epoch,
                'authToken': auth_token,
                'status': 'connected'
            }
        )
        
        logger.info(f"Connected: {connection_id}")
        return {'statusCode': 200, 'body': 'Connected'}
        
    except Exception as e:
        logger.error(f"Connect error: {str(e)}")
        return {'statusCode': 500, 'body': 'Failed to connect'}

def handle_disconnect(connection_id: str) -> Dict[str, Any]:
    """Handle WebSocket disconnections"""
    try:
        # Remove connection from DynamoDB
        table = dynamodb.Table(CONNECTIONS_TABLE)
        table.delete_item(
            Key={'connectionId': connection_id}
        )
        
        logger.info(f"Disconnected: {connection_id}")
        return {'statusCode': 200, 'body': 'Disconnected'}
        
    except Exception as e:
        logger.error(f"Disconnect error: {str(e)}")
        return {'statusCode': 500, 'body': 'Failed to disconnect'}

def handle_message(connection_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Handle incoming WebSocket messages"""
    try:
        # Parse message body
        body = json.loads(event.get('body', '{}'))
        message_type = body.get('type')
        
        logger.info(f"Message from {connection_id}: {message_type}")
        
        # Route message based on type
        if message_type == 'ping':
            return send_message(connection_id, {'type': 'pong'}, event)
        elif message_type == 'subscribe':
            return handle_subscription(connection_id, body, event)
        elif message_type == 'unsubscribe':
            return handle_unsubscription(connection_id, body)
        elif message_type == 'broadcast':
            return handle_broadcast(body, event)
        else:
            return send_message(connection_id, {
                'type': 'error',
                'message': f'Unknown message type: {message_type}'
            }, event)
            
    except json.JSONDecodeError:
        return {'statusCode': 400, 'body': 'Invalid JSON'}
    except Exception as e:
        logger.error(f"Message error: {str(e)}")
        return {'statusCode': 500, 'body': 'Failed to process message'}

def handle_subscription(connection_id: str, body: Dict[str, Any], event: Dict[str, Any]) -> Dict[str, Any]:
    """Handle subscription requests"""
    channel = body.get('channel')
    if not channel:
        return send_message(connection_id, {
            'type': 'error',
            'message': 'Channel is required for subscription'
        }, event)
    
    # Store subscription in DynamoDB
    table = dynamodb.Table(CONNECTIONS_TABLE)
    table.update_item(
        Key={'connectionId': connection_id},
        UpdateExpression='SET channels = list_append(if_not_exists(channels, :empty_list), :channel)',
        ExpressionAttributeValues={
            ':empty_list': [],
            ':channel': [channel]
        }
    )
    
    return send_message(connection_id, {
        'type': 'subscribed',
        'channel': channel
    }, event)

def handle_unsubscription(connection_id: str, body: Dict[str, Any]) -> Dict[str, Any]:
    """Handle unsubscription requests"""
    channel = body.get('channel')
    if not channel:
        return {'statusCode': 400, 'body': 'Channel is required'}
    
    # Remove subscription from DynamoDB
    # Note: This is simplified - in production, you'd want more robust list manipulation
    return {'statusCode': 200, 'body': f'Unsubscribed from {channel}'}

def handle_broadcast(body: Dict[str, Any], event: Dict[str, Any]) -> Dict[str, Any]:
    """Handle broadcast messages to all connections in a channel"""
    channel = body.get('channel')
    message = body.get('message')
    
    if not channel or not message:
        return {'statusCode': 400, 'body': 'Channel and message are required'}
    
    # Get all connections subscribed to the channel
    table = dynamodb.Table(CONNECTIONS_TABLE)
    response = table.scan(
        FilterExpression='contains(channels, :channel)',
        ExpressionAttributeValues={':channel': channel}
    )
    
    # Send message to all connections
    for item in response.get('Items', []):
        try:
            send_to_connection(
                item['connectionId'],
                {'type': 'broadcast', 'channel': channel, 'data': message},
                event
            )
        except Exception as e:
            logger.error(f"Failed to send to {item['connectionId']}: {str(e)}")
            # Remove stale connections
            if 'GoneException' in str(e):
                table.delete_item(Key={'connectionId': item['connectionId']})
    
    return {'statusCode': 200, 'body': 'Broadcast sent'}

def send_message(connection_id: str, message: Dict[str, Any], event: Dict[str, Any]) -> Dict[str, Any]:
    """Send a message to a specific connection"""
    try:
        send_to_connection(connection_id, message, event)
        return {'statusCode': 200, 'body': 'Message sent'}
    except Exception as e:
        logger.error(f"Failed to send message: {str(e)}")
        return {'statusCode': 500, 'body': 'Failed to send message'}

def send_to_connection(connection_id: str, message: Dict[str, Any], event: Dict[str, Any]) -> None:
    """Helper to send message via API Gateway Management API"""
    domain = event.get('requestContext', {}).get('domainName')
    stage = event.get('requestContext', {}).get('stage')
    
    endpoint_url = f'https://{domain}/{stage}'
    
    client = boto3.client(
        'apigatewaymanagementapi',
        endpoint_url=endpoint_url
    )
    
    client.post_to_connection(
        ConnectionId=connection_id,
        Data=json.dumps(message)
    )