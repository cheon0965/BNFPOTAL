@echo off
SETLOCAL

rem Root directory of the project (directory where this script lives)
set "ROOT=%~dp0"

echo ================================================
echo  BnF ERP Portal - Publish (self-contained)
echo ================================================
echo.

echo [1/3] Frontend build (Vite)
cd /d "%ROOT%frontend"
if not exist package.json (
  echo ERROR: frontend\package.json not found.
  goto END
)
if not exist node_modules\.bin\vite.cmd (
  echo Installing frontend dependencies with npm install ...
  call npm install
  if errorlevel 1 goto END
)
call node_modules\.bin\vite.cmd build
if errorlevel 1 goto END

echo.
echo [2/3] Backend publish (ASP.NET Core, self-contained win-x64)
cd /d "%ROOT%backend"
call dotnet restore
if errorlevel 1 goto END
call dotnet publish -c Release -r win-x64 --self-contained true -o "%ROOT%publish"
if errorlevel 1 goto END

echo.
echo [3/3] Copy frontend build output to publish\wwwroot
if not exist "%ROOT%publish" mkdir "%ROOT%publish"
if exist "%ROOT%publish\wwwroot" rmdir /s /q "%ROOT%publish\wwwroot"
mkdir "%ROOT%publish\wwwroot"
xcopy "%ROOT%frontend\dist\*" "%ROOT%publish\wwwroot" /E /Y /I

echo.
echo ================================================
echo  Publish completed.
echo  Output folder:
echo      %ROOT%publish
echo.
echo  To run the app on any Windows 10 machine:
echo      cd /d %ROOT%publish
echo      BnfErpPortal.exe
echo ================================================

:END
echo.
echo Script finished. If there were errors, check the messages above.
pause
ENDLOCAL
