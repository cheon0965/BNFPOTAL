# ==========================================================
# 1단계: 프론트엔드 빌드 (Node.js 기반 React 빌드)
# ==========================================================
FROM node:20-alpine AS frontend-build
WORKDIR /src/frontend

# 패키지 매니저 파일들 먼저 복사 (캐시 활용)
COPY frontend/package*.json ./
RUN npm ci

# 프론트엔드 소스코드 전체 복사 후 정적 파일 빌드
COPY frontend ./
RUN npm run build


# ==========================================================
# 2단계: 백엔드 빌드 (.NET 8.0 SDK)
# ==========================================================
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS backend-build
WORKDIR /src

# 백엔드 프로젝트 파일 복사 및 종속성 복원
COPY backend/BnfErpPortal.csproj backend/
RUN dotnet restore backend/BnfErpPortal.csproj

# 백엔드 소스코드 전체 복사 후 릴리즈용 퍼블리시
COPY backend backend/
WORKDIR /src/backend
RUN dotnet publish BnfErpPortal.csproj -c Release -o /app/publish /p:UseAppHost=false


# ==========================================================
# 3단계: 최종 실행 환경 구성 (.NET 8.0 런타임 최소 경량 이미지)
# ==========================================================
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# 기본 포트 노출 선언 (주로 appsettings나 환경 변수로 동적 할당되므로 문서화용)
EXPOSE 3000

# 시간대(Timezone) 설정 (한국 시간 - KST)
ENV TZ=Asia/Seoul
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 1. 2단계(백엔드 빌드)에서 퍼블리시된 최종 .NET 결과물 복사
COPY --from=backend-build /app/publish .

# 2. 1단계(프론트엔드 빌드)에서 생성된 dist (정적 파일) 결과물을 백엔드의 wwwroot 폴더로 복사
COPY --from=frontend-build /src/frontend/dist ./wwwroot

# 첨부파일 저장을 위한 기본 마운트 지점(디렉터리) 생성
RUN mkdir -p /app/uploads

# 애플리케이션 실행
ENTRYPOINT ["dotnet", "BnfErpPortal.dll"]
