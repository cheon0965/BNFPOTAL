@echo off
SETLOCAL

rem Change to backend directory relative to this script
set "ROOT=%~dp0"
cd /d "%ROOT%backend"

echo Running backend (ASP.NET Core)...
dotnet restore
dotnet run

ENDLOCAL
