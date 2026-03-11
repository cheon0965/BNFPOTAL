@echo off
SETLOCAL

set "ROOT=%~dp0"

echo Starting backend...
cd /d "%ROOT%backend"
start "Backend" cmd /k "dotnet restore && dotnet run"

echo Starting frontend...
cd /d "%ROOT%frontend"
start "Frontend" cmd /k "if not exist node_modules ( npm install ) & npm run dev"

echo Backend and frontend have been started in separate windows.

ENDLOCAL
