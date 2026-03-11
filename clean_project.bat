@echo off
SETLOCAL
chcp 65001 >nul 2>&1

set "ROOT=%~dp0"

echo ============================================
echo   BnF ERP Portal - Project Clean Script
echo ============================================
echo.

echo [1/5] Cleaning backend build artifacts...
if exist "%ROOT%backend\bin" (
    rmdir /s /q "%ROOT%backend\bin"
    echo       - backend\bin removed
)
if exist "%ROOT%backend\obj" (
    rmdir /s /q "%ROOT%backend\obj"
    echo       - backend\obj removed
)

echo [2/5] Cleaning frontend build artifacts...
if exist "%ROOT%frontend\dist" (
    rmdir /s /q "%ROOT%frontend\dist"
    echo       - frontend\dist removed
)
if exist "%ROOT%frontend\node_modules" (
    rmdir /s /q "%ROOT%frontend\node_modules"
    echo       - frontend\node_modules removed
)

echo [3/5] Cleaning frontend temp files...
del /q "%ROOT%frontend\build*.txt" 2>nul
del /q "%ROOT%frontend\build*.log" 2>nul
del /q "%ROOT%frontend\build-test.mjs" 2>nul
del /q "%ROOT%frontend\build_script.js" 2>nul
del /q "%ROOT%frontend\debug.log" 2>nul
del /q "%ROOT%frontend\error.log" 2>nul
del /q "%ROOT%frontend\vite.log" 2>nul
del /q "%ROOT%frontend\vite_utf8.log" 2>nul
echo       - temp/log files removed

echo [4/5] Cleaning publish artifacts...
if exist "%ROOT%publish" (
    rmdir /s /q "%ROOT%publish"
    echo       - publish folder removed
)
if exist "%ROOT%publish_docker" (
    rmdir /s /q "%ROOT%publish_docker"
    echo       - publish_docker folder removed
)

echo [5/5] Cleaning IDE caches...
if exist "%ROOT%.vs" (
    rmdir /s /q "%ROOT%.vs"
    echo       - .vs folder removed
)

echo.
echo ============================================
echo   Clean completed!
echo   To rebuild: publish_single_server.bat
echo ============================================
pause
ENDLOCAL
