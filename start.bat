@echo off
setlocal
cd /d "%~dp0"
title FCUK PAYWALLS - DEV

where npm >nul 2>nul
if errorlevel 1 (
    echo [X] npm not found. Install Node.js first: https://nodejs.org
    pause
    exit /b 1
)

if not exist node_modules (
    echo [*] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [X] npm install failed.
        pause
        exit /b 1
    )
)

echo [*] Starting dev server - the browser will open automatically...
call npm run dev -- --open

echo.
echo [*] Dev server stopped.
pause