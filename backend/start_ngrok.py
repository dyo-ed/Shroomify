#!/usr/bin/env python3
"""
Startup script for Shroomify backend with ngrok
"""
import subprocess
import time
import os
import sys
import signal
import threading
from pathlib import Path

def start_flask():
    """Start Flask application"""
    print("🚀 Starting Flask application...")
    os.system("python app.py")

def start_ngrok():
    """Start ngrok tunnel"""
    print("🌐 Starting ngrok tunnel...")
    time.sleep(3)  # Wait for Flask to start
    
    # Check if ngrok is installed
    try:
        subprocess.run(["ngrok", "version"], check=True, capture_output=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ ngrok is not installed. Please install ngrok first:")
        print("   https://ngrok.com/download")
        sys.exit(1)
    
    # Start ngrok
    subprocess.run([
        "ngrok", "http", "5000",
        "--domain=reliably-one-kiwi.ngrok-free.app",
        "--log=stdout"
    ])

def signal_handler(sig, frame):
    """Handle shutdown signals"""
    print("\n🛑 Shutting down...")
    sys.exit(0)

if __name__ == "__main__":
    # Set up signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    print("🍄 Starting Shroomify Backend with ngrok")
    print("=" * 50)
    
    # Start Flask in a separate thread
    flask_thread = threading.Thread(target=start_flask, daemon=True)
    flask_thread.start()
    
    # Start ngrok
    try:
        start_ngrok()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
        sys.exit(0)
