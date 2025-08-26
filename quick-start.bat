@echo off
title Interview Module - Quick Start

echo 🚀 Quick Start - Interview Module
echo.

REM Start all servers without extra checks
start "Backend" cmd /k "npm run server"
timeout /t 2 /nobreak >nul

start "Chat Server" cmd /k "npm run chat" 
timeout /t 2 /nobreak >nul

start "Frontend" cmd /k "npm run dev"
timeout /t 5 /nobreak >nul

echo 🌐 Opening browser...
start "" "http://localhost:8080"

echo ✅ All servers started! Check the opened windows.
timeout /t 3 /nobreak >nul
exit
