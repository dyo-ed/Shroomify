#!/bin/bash

# Shroomify Backend Deployment Script for ngrok
# Domain: reliably-one-kiwi.ngrok-free.app

set -e

echo "🍄 Shroomify Backend Deployment"
echo "================================"

# Check if Python is installed
if ! command -v python &> /dev/null; then
    echo "❌ Python is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed. Please install ngrok first:"
    echo "   https://ngrok.com/download"
    exit 1
fi

# Check if model files exist
if [ ! -f "ann_model_state_dict.pth" ]; then
    echo "❌ Model file 'ann_model_state_dict.pth' not found!"
    echo "Please ensure the model file is in the current directory."
    exit 1
fi

if [ ! -f "minmax_scaler.pkl" ]; then
    echo "❌ Scaler file 'minmax_scaler.pkl' not found!"
    echo "Please ensure the scaler file is in the current directory."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate || source venv/Scripts/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Create uploads directory
mkdir -p uploads

# Set environment variables
export FLASK_DEBUG=False
export PORT=5000
export HOST=0.0.0.0
export MAX_CONTENT_LENGTH=8388608

echo "✅ Setup complete!"
echo ""
echo "🚀 Starting application with ngrok..."
echo "Domain: reliably-one-kiwi.ngrok-free.app"
echo ""
echo "Press Ctrl+C to stop the application"
echo ""

# Start the application
python start_ngrok.py
