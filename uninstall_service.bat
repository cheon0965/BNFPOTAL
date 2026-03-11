@echo off
SETLOCAL

set "SERVICE_NAME=BnFErpPortal"

echo [BnF ERP Portal] Uninstall Windows service...

sc stop "%SERVICE_NAME%" >NUL 2>&1
sc delete "%SERVICE_NAME%" >NUL 2>&1

echo.
echo Service uninstall command has been issued.
echo (If the service did not exist, this will have no effect.)

pause
ENDLOCAL
