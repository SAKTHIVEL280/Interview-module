@echo off
title Stop Interview Module Servers

echo 🛑 Stopping Interview Module Servers...
echo.

REM Kill Node.js processes (Backend and Frontend)
echo Stopping Node.js servers...
taskkill /f /im node.exe >nul 2>&1

REM Kill Python processes (Chat Server)
echo Stopping Python chat server...
taskkill /f /im python.exe >nul 2>&1
taskkill /f /im python3.exe >nul 2>&1

REM Also try to kill by window title
taskkill /f /fi "WindowTitle eq Backend*" >nul 2>&1
taskkill /f /fi "WindowTitle eq Chat Server*" >nul 2>&1
taskkill /f /fi "WindowTitle eq Frontend*" >nul 2>&1
taskkill /f /fi "WindowTitle eq React Frontend*" >nul 2>&1
taskkill /f /fi "WindowTitle eq Python Chat Server*" >nul 2>&1

echo.
echo ✅ All Interview Module servers have been stopped.
echo.
echo 💡 Note: This will stop ALL Node.js and Python processes.
echo    If you have other Node.js or Python applications running,
echo    they may also be affected.
echo.
pause
