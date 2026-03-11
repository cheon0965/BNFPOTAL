@echo off
SETLOCAL

rem Set encoding to UTF-8
for /f "tokens=2 delims=:" %%a in ('chcp') do set "ORIG_CHCP=%%a"
chcp 65001 > NUL

rem Root directory (folder where this script lives)
set "ROOT=%~dp0"
cd /d "%ROOT%"

set "IMAGE_NAME=bnf-erp-portal"
set "IMAGE_TAG=latest"
set "TAR_FILE=publish_docker\%IMAGE_NAME%_%IMAGE_TAG%.tar"

echo ===================================================
echo [BnF ERP Portal] Docker Image Build Script
echo ===================================================
echo.

rem 1. Check if docker is available
where docker >NUL 2>&1
if %errorlevel% NEQ 0 (
  echo [ERROR] Docker 데스크탑이나 CLI가 윈도우에 설치되어 있지 않거나 실행 중이 아닙니다.
  echo         Docker Desktop을 켜주신 후 다시 실행해 주세요.
  pause
  goto END
)

echo [1/3] 기존 Docker 이미지 정리 중...
docker rmi %IMAGE_NAME%:%IMAGE_TAG% >NUL 2>&1

echo.
echo [2/3] Docker 컨테이너 이미지 빌드 시작... (이 작업은 몇 분 정도 소요될 수 있습니다)
echo.
docker build -t %IMAGE_NAME%:%IMAGE_TAG% -f Dockerfile .
if %errorlevel% NEQ 0 (
  echo.
  echo [ERROR] Docker 이미지 빌드에 실패했습니다. 에러 메시지를 확인해주세요.
  pause
  goto END
)

echo.
echo [3/3] Docker 이미지 빌드 완료! 로컬 Docker에 성공적으로 등록되었습니다.
echo.

CHOICE /C YN /M "이 이미지를 리눅스 서버로 가져가기 위해 tar 압축 파일로 백업/추출하시겠습니까?"
IF ERRORLEVEL 2 GOTO SKIP_EXPORT
IF ERRORLEVEL 1 GOTO EXPORT_IMAGE

:EXPORT_IMAGE
echo.
echo 'publish_docker' 폴더를 생성하고 tar 추출을 시작합니다...
if not exist "%ROOT%publish_docker" mkdir "%ROOT%publish_docker"

docker save -o "%TAR_FILE%" %IMAGE_NAME%:%IMAGE_TAG%
if %errorlevel% NEQ 0 (
  echo [ERROR] Docker 이미지 추출에 실패했습니다.
  pause
  goto END
)

echo.
echo ===================================================
echo [작업 성공] "%TAR_FILE%" 위치에 파일이 저장되었습니다.
echo 리눅스 서버로 이 tar 파일과 docker-compose.yml 파일을 가져가시면 배포가 가능합니다!
echo ===================================================
pause
goto END

:SKIP_EXPORT
echo.
echo ===================================================
echo [완료] Docker CLI로 윈도우 로컬에서 이미지(%IMAGE_NAME%:%IMAGE_TAG%)를 생성했습니다.
echo 완료되었습니다.
echo ===================================================
pause

:END
chcp %ORIG_CHCP% > NUL
ENDLOCAL
