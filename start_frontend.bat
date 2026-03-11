@echo off
SETLOCAL

rem Change to frontend directory relative to this script
set "ROOT=%~dp0"
cd /d "%ROOT%frontend"

if not exist node_modules (
    echo Installing frontend dependencies...
    npm install
)

echo Starting frontend (Vite dev server)...
npm run dev

ENDLOCAL
