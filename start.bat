@echo off
title N.I.T.E. — Startup
color 0A
echo.
echo ============================================================
echo   N.I.T.E. — Network Intrusion ^& Threat Evaluation System
echo ============================================================
echo.

REM 1. Verify model exists
IF NOT EXIST "ml\model_pipeline.joblib" (
    echo [*] No trained model found. Training now...
    python ml\train.py
    IF ERRORLEVEL 1 (
        echo [!] Training failed. Check python/pip setup.
        pause
        exit /B 1
    )
)

echo [*] Model found.
echo.
echo [*] Starting FastAPI backend on http://127.0.0.1:8000 ...
start "NITE Backend" cmd /k "uvicorn backend.main:app --reload --port 8000"

echo [*] Waiting 2 seconds for backend to initialise...
timeout /T 2 /NOBREAK >NUL

echo [*] Starting frontend server on http://127.0.0.1:3000 ...
start "NITE Frontend" cmd /k "python -m http.server 3000 --directory frontend"

echo.
echo ============================================================
echo   Backend  : http://127.0.0.1:8000
echo   Frontend : http://127.0.0.1:3000
echo   API Docs : http://127.0.0.1:8000/docs
echo ============================================================
echo.
echo Opening frontend in browser...
timeout /T 2 /NOBREAK >NUL
start http://127.0.0.1:3000

pause
