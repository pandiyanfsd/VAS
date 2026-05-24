@echo off
title Denalai Village Portal Launcher
echo ===================================================
echo 🚀 Starting Denalai Village Portal...
echo ===================================================

echo.
echo [1/3] Starting Backend API Server (Port 5000)...
start "Denalai Village Server" cmd /k "cd server && node index.js"

echo.
echo [2/3] Starting Frontend Client (Port 5173)...
start "Denalai Village Client" cmd /k "cd client && npm run dev"

echo.
echo [3/3] Launching your web browser...
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo ===================================================
echo ✅ All components launched! 
echo Keep the backend and frontend windows open while using.
echo ===================================================
pause
