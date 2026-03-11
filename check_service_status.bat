@echo off

REM ============================================
REM  BnF ERP Portal - Windows Service Status Check
REM ============================================

SET SERVICE_NAME=BnFErpPortal

ECHO [BnF ERP Portal] Service status check
ECHO -------------------------------------
ECHO Service name: %SERVICE_NAME%
ECHO.

REM Query service status (basic)
SC QUERY "%SERVICE_NAME%"
ECHO.

ECHO If STATE is RUNNING, the service is up.
ECHO You can also open http://SERVER-IP:5000 in a browser.
ECHO.

PAUSE
