@echo off
SETLOCAL

rem Root directory (folder where this script lives)
set "ROOT=%~dp0"
set "PUBLISH=%ROOT%publish"
set "EXE=%PUBLISH%\BnfErpPortal.exe"
set "SERVICE_NAME=BnFErpPortal"
set "DISPLAY_NAME=BnF ERP Portal"
set "HAS_ERROR=0"

echo [BnF ERP Portal] Installing Windows service...

rem This script does NOT build the app.
rem It only registers a Windows Service using the already-published EXE.
rem Make sure that on a development PC you have run:
rem   publish_single_server.bat
rem and then copied the 'publish' folder next to this script.

rem Check for administrative privileges
net session >NUL 2>&1
if %errorlevel% NEQ 0 (
  echo [ERROR] This script must be run as Administrator.
  echo         Please right-click install_service.bat and choose
  echo         "Run as administrator", then try again.
  set HAS_ERROR=1
  goto END
)

if not exist "%EXE%" (
  echo [ERROR] "%EXE%" not found.
  echo         The published output is missing.
  echo         Run publish_single_server.bat on a development machine,
  echo         then copy the 'publish' folder to this machine.
  set HAS_ERROR=1
  goto END
)

echo Stopping and deleting existing service (if any)...
sc stop "%SERVICE_NAME%" >NUL 2>&1
sc delete "%SERVICE_NAME%" >NUL 2>&1

echo Creating service...
sc create "%SERVICE_NAME%" binPath= "\"%EXE%\"" start= auto DisplayName= "%DISPLAY_NAME%"
if %errorlevel% NEQ 0 (
  echo [ERROR] Failed to create service. See the error message above.
  set HAS_ERROR=1
  goto END
)

sc description "%SERVICE_NAME%" "BnF ERP Portal ASP.NET Core service" >NUL 2>&1

echo Starting service...
sc start "%SERVICE_NAME%"
if %errorlevel% NEQ 0 (
  echo [WARN] Service was created but could not be started automatically.
  echo        Please check the Windows Event Log or start it manually
  echo        from services.msc.
) else (
  echo [OK] Service started successfully.
)

echo.
echo Service name : %SERVICE_NAME%
echo Executable   : %EXE%
echo You can manage it from services.msc.

:END
if "%HAS_ERROR%"=="1" (
  echo.
  echo [INFO] There were errors during installation. Review the messages above.
  pause
)

ENDLOCAL
