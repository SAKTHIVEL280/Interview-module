@echo off
echo ====================================================
echo        Interview Module - Auto Startup Script
echo ====================================================
echo.
echo Starting all servers for Interview Module...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js and try again
    pause
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python and try again
    pause
    exit /b 1
)

echo ✅ Node.js and Python are available
echo.

REM Install dependencies if node_modules doesn't exist
if not exist "%~dp0..\node_modules" (
    echo 📦 Installing dependencies...
    cd /d "%~dp0.."
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed successfully
    echo.
)

echo 🚀 Starting servers...
echo.

REM Start the servers in separate windows
echo 1️⃣ Starting Node.js Backend Server (Port 5000)...
start "Backend Server" cmd /k "echo Backend Server - Port 5000 && cd /d "%~dp0.." && npm run server"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

echo 2️⃣ Starting Python Chat Server (Port 5001)...
start "Python Chat Server" cmd /k "echo Python Chat Server - Port 5001 && cd /d "%~dp0.." && npm run chat"

REM Wait a moment for chat server to start
timeout /t 3 /nobreak >nul

echo 3️⃣ Starting React Frontend (Port 8080)...
start "React Frontend" cmd /k "echo React Frontend - Port 8080 && cd /d "%~dp0.." && npm run dev"

echo.
echo ⏳ Waiting for servers to fully start...
timeout /t 8 /nobreak >nul

echo.
echo 🌐 Opening Interview Module in browser...
start "" "http://localhost:8080"

echo.
echo ====================================================
echo        🎉 Interview Module Started Successfully!
echo ====================================================
echo.
echo 📋 Server Information:
echo    • Backend API:      http://localhost:5000
echo    • Python Chat:      http://localhost:5001  
echo    • Frontend UI:      http://localhost:8080
echo.
echo 💡 What's running:
echo    • Node.js Backend Server (Database, APIs, File handling)
echo    • Python Chat Server (Q-Bot AI Interview System)
echo    • React Frontend (User Interface)
echo.
echo 🔧 To stop all servers:
echo    • Close all the server windows that opened
echo    • Or press Ctrl+C in each server window
echo.
echo ℹ️  This window can be closed safely.
echo    The servers will continue running in their own windows.
echo.
pause
