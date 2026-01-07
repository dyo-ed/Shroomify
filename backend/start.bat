@echo off
REM Quick start script for Shroomify backend
echo 🍄 Starting Shroomify Backend...
echo ================================

REM Activate virtual environment if it exists
if exist "venv\Scripts\activate.bat" (
    echo 🔧 Activating virtual environment...
    call venv\Scripts\activate.bat
)

REM Set environment variables
set FLASK_DEBUG=False
set PORT=5000
set HOST=0.0.0.0

echo 🚀 Starting Flask application...
python app.py

pause
