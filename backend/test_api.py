#!/usr/bin/env python3
"""
Test script for Shroomify API
"""
import requests
import json
import os

API_BASE = "https://reliably-one-kiwi.ngrok-free.app"

def test_health():
    """Test health endpoint"""
    print("🏥 Testing health endpoint...")
    try:
        response = requests.get(f"{API_BASE}/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_home():
    """Test home endpoint"""
    print("\n🏠 Testing home endpoint...")
    try:
        response = requests.get(f"{API_BASE}/")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Home endpoint failed: {e}")
        return False

def test_upload(image_path):
    """Test image upload"""
    print(f"\n📤 Testing upload with {image_path}...")
    
    if not os.path.exists(image_path):
        print(f"❌ Image file not found: {image_path}")
        return False
    
    try:
        with open(image_path, 'rb') as f:
            files = {'image': f}
            response = requests.post(f"{API_BASE}/api/upload", files=files)
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Upload failed: {e}")
        return False

def main():
    print("🍄 Shroomify API Test Suite")
    print("=" * 40)
    
    # Test endpoints
    health_ok = test_health()
    home_ok = test_home()
    
    # Test upload if we have a test image
    upload_ok = False
    test_images = ['uploads/snapshot.jpg', 'test_image.jpg', 'sample.png']
    for img in test_images:
        if os.path.exists(img):
            upload_ok = test_upload(img)
            break
    
    # Summary
    print("\n📊 Test Results:")
    print(f"Health Check: {'✅' if health_ok else '❌'}")
    print(f"Home Endpoint: {'✅' if home_ok else '❌'}")
    print(f"Upload Test: {'✅' if upload_ok else '❌'}")
    
    if all([health_ok, home_ok]):
        print("\n🎉 API is working correctly!")
    else:
        print("\n⚠️  Some tests failed. Check the API status.")

if __name__ == "__main__":
    main()
