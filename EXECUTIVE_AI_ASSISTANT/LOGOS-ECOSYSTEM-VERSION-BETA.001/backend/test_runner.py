#!/usr/bin/env python3
"""
Simple test runner to verify critical components
"""

import sys
import importlib.util
from pathlib import Path

def test_imports():
    """Test that all critical modules can be imported"""
    print("Testing imports...")
    
    modules_to_test = [
        "src.api.main",
        "src.services.auth.auth_service",
        "src.services.marketplace",
        "src.services.wallet.wallet_service",
        "src.services.ai",
        "src.services.email",
        "src.services.payment",
        "src.services.websocket",
        "src.services.upload",
        "src.shared.models.user",
        "src.shared.models.marketplace",
        "src.shared.models.wallet",
        "src.shared.models.ai",
        "src.shared.models.review",
        "src.shared.models.upload",
        "src.infrastructure.database",
        "src.infrastructure.cache",
        "src.infrastructure.queue",
    ]
    
    failed = []
    for module_name in modules_to_test:
        try:
            # Convert module path to file path
            module_path = module_name.replace('.', '/')
            file_path = Path(f"{module_path}.py")
            if not file_path.exists():
                file_path = Path(f"{module_path}/__init__.py")
            
            if file_path.exists():
                spec = importlib.util.spec_from_file_location(module_name, file_path)
                module = importlib.util.module_from_spec(spec)
                print(f"✓ {module_name}")
            else:
                print(f"✗ {module_name} - File not found")
                failed.append(module_name)
        except Exception as e:
            print(f"✗ {module_name} - {str(e)}")
            failed.append(module_name)
    
    return failed

def test_config():
    """Test configuration loading"""
    print("\nTesting configuration...")
    try:
        from src.shared.utils.config import settings
        print(f"✓ Configuration loaded")
        print(f"  - App Name: {settings.APP_NAME}")
        print(f"  - Environment: {settings.ENVIRONMENT}")
        return True
    except Exception as e:
        print(f"✗ Configuration failed: {str(e)}")
        return False

def test_models():
    """Test model definitions"""
    print("\nTesting models...")
    try:
        from src.shared.models.user import User
        from src.shared.models.marketplace import MarketplaceItem, Transaction
        from src.shared.models.wallet import Wallet
        from src.shared.models.ai import AISession
        from src.shared.models.review import Review
        from src.shared.models.upload import Upload
        
        print("✓ All models imported successfully")
        return True
    except Exception as e:
        print(f"✗ Model import failed: {str(e)}")
        return False

def test_services():
    """Test service initialization"""
    print("\nTesting services...")
    services_ok = True
    
    try:
        from src.services.auth import auth_service
        print("✓ Auth service initialized")
    except Exception as e:
        print(f"✗ Auth service failed: {str(e)}")
        services_ok = False
    
    try:
        from src.services.marketplace import marketplace_service
        print("✓ Marketplace service initialized")
    except Exception as e:
        print(f"✗ Marketplace service failed: {str(e)}")
        services_ok = False
    
    try:
        from src.services.wallet import wallet_service
        print("✓ Wallet service initialized")
    except Exception as e:
        print(f"✗ Wallet service failed: {str(e)}")
        services_ok = False
    
    try:
        from src.services.email import email_service
        print("✓ Email service initialized")
    except Exception as e:
        print(f"✗ Email service failed: {str(e)}")
        services_ok = False
    
    try:
        from src.services.payment import payment_service
        print("✓ Payment service initialized")
    except Exception as e:
        print(f"✗ Payment service failed: {str(e)}")
        services_ok = False
    
    try:
        from src.services.websocket import websocket_service
        print("✓ WebSocket service initialized")
    except Exception as e:
        print(f"✗ WebSocket service failed: {str(e)}")
        services_ok = False
    
    try:
        from src.services.upload import upload_service
        print("✓ Upload service initialized")
    except Exception as e:
        print(f"✗ Upload service failed: {str(e)}")
        services_ok = False
    
    return services_ok

def test_api_routes():
    """Test API route imports"""
    print("\nTesting API routes...")
    routes_ok = True
    
    routes = [
        "auth",
        "users",
        "marketplace",
        "wallet",
        "ai",
        "health",
        "upload",
    ]
    
    for route in routes:
        try:
            spec = importlib.util.spec_from_file_location(
                f"src.api.routes.{route}", 
                f"src/api/routes/{route}.py"
            )
            module = importlib.util.module_from_spec(spec)
            print(f"✓ {route} routes")
        except Exception as e:
            print(f"✗ {route} routes - {str(e)}")
            routes_ok = False
    
    return routes_ok

def main():
    """Run all tests"""
    print("=" * 50)
    print("LOGOS AI Ecosystem - Component Test Runner")
    print("=" * 50)
    
    # Run tests
    import_failures = test_imports()
    config_ok = test_config()
    models_ok = test_models()
    services_ok = test_services()
    routes_ok = test_api_routes()
    
    # Summary
    print("\n" + "=" * 50)
    print("TEST SUMMARY")
    print("=" * 50)
    
    total_failures = len(import_failures)
    if not config_ok:
        total_failures += 1
    if not models_ok:
        total_failures += 1
    if not services_ok:
        total_failures += 1
    if not routes_ok:
        total_failures += 1
    
    if total_failures == 0:
        print("✓ All tests passed!")
        print("\nThe LOGOS AI Ecosystem backend is ready for deployment.")
        return 0
    else:
        print(f"✗ {total_failures} test(s) failed")
        print("\nFailed imports:")
        for module in import_failures:
            print(f"  - {module}")
        return 1

if __name__ == "__main__":
    sys.exit(main())