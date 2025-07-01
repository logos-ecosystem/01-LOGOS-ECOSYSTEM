#!/usr/bin/env python3
"""
System test script to verify Executive AI Assistant is working
"""

import requests
import json
import time
import sys

def test_api_health():
    """Test if the API is running and healthy"""
    print("Testing API health...")
    try:
        response = requests.get("http://localhost:8000/api/v1/health/", timeout=5)
        if response.status_code == 200:
            print("✅ API is healthy")
            return True
        else:
            print(f"❌ API returned status code: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API. Is the server running?")
        print("   Run './run.sh' or 'python start_server.py' to start the server")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_api_status():
    """Test detailed API status"""
    print("\nTesting API status...")
    try:
        response = requests.get("http://localhost:8000/api/v1/health/status", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✅ API Status:")
            print(f"   - Version: {data.get('version', 'Unknown')}")
            print(f"   - Database: {data.get('components', {}).get('database', {}).get('status', 'Unknown')}")
            
            # Check AI services
            ai_services = data.get('components', {}).get('ai_services', {})
            if ai_services.get('openai') == 'configured':
                print("   - OpenAI: ✅ Configured")
            else:
                print("   - OpenAI: ⚠️  Not configured (add OPENAI_API_KEY to .env)")
            
            if ai_services.get('anthropic') == 'configured':
                print("   - Anthropic: ✅ Configured")
            else:
                print("   - Anthropic: ⚠️  Not configured (add ANTHROPIC_API_KEY to .env)")
            
            # Check features
            features = data.get('components', {}).get('features', {})
            print("\n   Features enabled:")
            for feature, enabled in features.items():
                status = "✅" if enabled else "❌"
                print(f"   - {feature}: {status}")
            
            return True
        else:
            print(f"❌ API status returned: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error checking status: {str(e)}")
        return False

def test_chat_endpoint():
    """Test the chat endpoint"""
    print("\nTesting chat endpoint...")
    try:
        payload = {
            "message": "Hello, this is a test message",
            "language": "en"
        }
        
        response = requests.post(
            "http://localhost:8000/api/v1/chat/",
            json=payload,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Chat endpoint working")
            print(f"   - Conversation ID: {data.get('conversation_id', 'None')}")
            print(f"   - Response preview: {data.get('response', '')[:100]}...")
            return True
        else:
            print(f"❌ Chat endpoint returned: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error testing chat: {str(e)}")
        return False

def test_web_interface():
    """Test if web interface is accessible"""
    print("\nTesting web interface...")
    try:
        response = requests.get("http://localhost:8000/", timeout=5)
        if response.status_code == 200:
            print("✅ Web interface is accessible at http://localhost:8000")
            return True
        else:
            print(f"❌ Web interface returned: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error accessing web interface: {str(e)}")
        return False

def test_domains():
    """Test domain endpoints"""
    print("\nTesting domain modules...")
    try:
        response = requests.get("http://localhost:8000/api/v1/domains/available", timeout=5)
        if response.status_code == 200:
            data = response.json()
            domains = data.get('domains', [])
            print(f"✅ Found {len(domains)} domain modules:")
            for domain in domains:
                print(f"   - {domain['name']}: {domain['description']}")
            return True
        else:
            print(f"❌ Domains endpoint returned: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error testing domains: {str(e)}")
        return False

def main():
    print("Executive AI Assistant - System Test")
    print("=" * 50)
    
    # Check if server is running
    if not test_api_health():
        print("\n⚠️  Server is not running. Please start it first:")
        print("   - Linux/Mac: ./run.sh")
        print("   - Windows/Cross-platform: python start_server.py")
        sys.exit(1)
    
    # Run tests
    tests_passed = 0
    tests_total = 4
    
    if test_api_status():
        tests_passed += 1
    
    if test_chat_endpoint():
        tests_passed += 1
    
    if test_web_interface():
        tests_passed += 1
    
    if test_domains():
        tests_passed += 1
    
    # Summary
    print("\n" + "=" * 50)
    print(f"Test Summary: {tests_passed}/{tests_total} tests passed")
    
    if tests_passed == tests_total:
        print("\n✅ All systems operational!")
        print("\nYou can now:")
        print("1. Open http://localhost:8000 in your browser")
        print("2. Try the voice assistant: python src/prototype/voice_assistant_demo.py")
        print("3. Use the CLI interface: python src/prototype/unified_control_demo.py")
    else:
        print("\n⚠️  Some tests failed. Check the messages above.")
        print("\nCommon issues:")
        print("- No API keys: Add OPENAI_API_KEY or ANTHROPIC_API_KEY to .env")
        print("- Dependencies: Run 'pip install -r requirements.txt'")
        print("- Database: Delete 'data/' folder and restart to reinitialize")

if __name__ == "__main__":
    main()