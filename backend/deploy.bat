@echo off
REM Shroomify Backend Deployment Script for ngrok (Windows)
REM Domain: reliably-one-kiwi.ngrok-free.app

echo 🍄 Shroomify Backend Deployment
echo ================================

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.8+ first.
    pause
    exit /b 1
)

REM Check if ngrok is installed
ngrok version >nul 2>&1
if errorlevel 1 (
    echo ❌ ngrok is not installed. Please install ngrok first:
    echo    https://ngrok.com/download
    pause
    exit /b 1
)

REM Check if model files exist
if not exist "ann_model_state_dict.pth" (
    echo ❌ Model file 'ann_model_state_dict.pth' not found!
    echo Please ensure the model file is in the current directory.
    pause
    exit /b 1
)

if not exist "minmax_scaler.pkl" (
    echo ❌ Scaler file 'minmax_scaler.pkl' not found!
    echo Please ensure the scaler file is in the current directory.
    pause
    exit /b 1
)

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo 📥 Installing dependencies...
pip install -r requirements.txt

REM Create uploads directory
if not exist "uploads" mkdir uploads

REM Set environment variables
set FLASK_DEBUG=False
set PORT=5000
set HOST=0.0.0.0
set MAX_CONTENT_LENGTH=8388608

echo ✅ Setup complete!
echo.
echo 🚀 Starting application with ngrok...
echo Domain: reliably-one-kiwi.ngrok-free.app
echo.
echo Press Ctrl+C to stop the application
echo.

REM Clear screen before starting
cls

REM Start the application
python start_ngrok.py

pause
