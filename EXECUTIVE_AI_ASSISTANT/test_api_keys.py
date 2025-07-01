#!/usr/bin/env python3
"""
Test script to verify API key integration
"""
import requests
import json

# API endpoint
BASE_URL = "http://localhost:8080"

def test_chat_endpoint():
    """Test the chat endpoint with a simple message"""
    print("\n=== Testing Chat API ===")
    
    payload = {
        "message": "Hello, can you help me test if the API is working?",
        "conversation_id": None,
        "domain": "general",
        "language": "en"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/v1/chat/", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Success! API is working")
            print(f"Response: {data['response'][:100]}...")
            print(f"Model used: {data.get('model_used', 'Unknown')}")
            print(f"Conversation ID: {data['conversation_id']}")
        else:
            print(f"❌ Error: Status code {response.status_code}")
            print(f"Response: {response.text}")
            
            if "API key" in response.text:
                print("\n💡 Tip: Make sure to add your API keys to the .env file:")
                print("   - OPENAI_API_KEY=sk-your-key-here")
                print("   - ANTHROPIC_API_KEY=sk-ant-your-key-here")
                
    except Exception as e:
        print(f"❌ Connection error: {e}")
        print("Make sure the server is running on port 8080")

def test_health_endpoint():
    """Test the health endpoint"""
    print("\n=== Testing Health Endpoint ===")
    
    try:
        response = requests.get(f"{BASE_URL}/api/v1/health/")
        if response.status_code == 200:
            data = response.json()
            print("✅ Health check passed")
            print(f"Response: {json.dumps(data, indent=2)}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Connection error: {e}")

if __name__ == "__main__":
    print("Executive AI Assistant - API Key Test")
    print("====================================")
    
    # Test health endpoint first
    test_health_endpoint()
    
    # Test chat functionality
    test_chat_endpoint()
    
    print("\n✨ Test complete!")
    print("\nIf you see errors about missing API keys:")
    print("1. Edit the .env file in the project root")
    print("2. Add your OpenAI or Anthropic API keys")
    print("3. Restart the server")
    print("4. Run this test again")