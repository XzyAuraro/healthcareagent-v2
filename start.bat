@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1
echo ========================================
echo   Healthcare Agent - Start Script
echo ========================================
echo.

call :check_port 8000
if "!PORT_IN_USE!"=="1" (
    echo [1/2] FastAPI backend already running on port 8000 ^(PID !PORT_PID!^). Skip.
) else (
    echo [1/2] Starting FastAPI backend ^(port 8000^)...
    cd /d "%~dp0backend"
    start "FastAPI-Backend" cmd /k "pip install -r requirements.txt && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"
)

call :check_port 3000
if "!PORT_IN_USE!"=="1" (
    echo [2/2] Next.js frontend already running on port 3000 ^(PID !PORT_PID!^). Skip.
) else (
    echo [2/2] Starting Next.js frontend ^(port 3000^)...
    cd /d "%~dp0frontend"
    start "NextJS-Frontend" cmd /k "npm install && npm run dev"
)

echo [3/3] Opening frontend in browser...
start "" "http://localhost:3000"

echo.
echo ========================================
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo ========================================
echo.
pause
exit /b 0

:check_port
set "PORT_IN_USE=0"
set "PORT_PID="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%~1 .*LISTENING"') do (
    set "PORT_IN_USE=1"
    set "PORT_PID=%%P"
    goto :eof
)
goto :eof
