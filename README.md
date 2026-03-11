# BnF SOFT - ERP 유지보수 포털 (BnF ERP Portal)

비앤에프소프트 ERP 유지보수 고객/관리자 포털입니다.  
고객사는 요청을 등록/조회하고, 내부 인력(관리자/매니저/엔지니어)은 요청 처리, 공지, 내부업무, 로그 모니터링을 수행합니다.

![BnF SOFT Logo](frontend/public/logo.png)

---

## 1. 프로젝트 개요

이 프로젝트는 다음 기능을 중심으로 구성되어 있습니다.

- 유지보수 요청(Request) 등록/조회/상태변경/담당자 배정
- 요청 댓글/첨부파일 및 엑셀 다운로드
- 공지사항(Notice) 및 공지 첨부파일 관리
- 내부업무(Task) 등록/처리/댓글/첨부파일/엑셀 다운로드
- JWT 인증 + Refresh Token(쿠키) 기반 로그인 세션
- SignalR 실시간 알림
- 이메일 템플릿/설정 관리 및 비동기 메일 발송
- 관리자용 회사/사용자/등록코드/시스템로그 관리

---

## 2. 기술 스택

### Backend

- ASP.NET Core Web API (.NET 8)
- Entity Framework Core + Pomelo MySQL
- JWT Bearer 인증 + Refresh Token
- SignalR
- Health Checks (`/api/health`)
- Rate Limiter (인증 관련 API에 적용)
- Swagger (개발 환경)

### Frontend

- React 18 + Vite 5
- React Router 6
- Zustand
- TanStack React Query
- Axios (공통 API 래퍼)
- React Hook Form + Zod
- Tailwind CSS
- React Quill (에디터) + DOMPurify

### Database

- MySQL 8.0+ (기준 스크립트: `database/create_database_mysql.sql`)

---

## 3. 실행 모드와 포트

이 프로젝트는 크게 2가지 실행 방식이 있습니다.

| 모드 | Frontend | Backend/API | 비고 |
|---|---|---|---|
| 로컬 개발 분리 모드 | Vite dev server (`3000`) | Kestrel (`5000` 권장) | `frontend/vite.config.js` 프록시(`/api -> 5000`) 기준 |
| 통합 실행 모드(배포) | Backend `wwwroot` 정적 서빙 | Kestrel 단일 포트 | 기본 `App:Urls = http://0.0.0.0:3000/` |

중요:

- 현재 `backend/appsettings.json` 기본값은 `3000`입니다.
- `frontend/vite.config.js`는 `/api`를 `http://localhost:5000`으로 프록시합니다.
- 로컬 분리 모드에서는 백엔드 포트를 `5000`으로 바꾸거나, 프록시 타겟을 `3000`으로 맞춰야 합니다.

---

## 4. 디렉터리 구조

```text
bnf-erp-portal/
├── backend/                          # ASP.NET Core Web API
│   ├── BnfErpPortal.csproj
│   ├── Program.cs
│   ├── appsettings.json
│   ├── Controllers/
│   ├── Services/
│   ├── Data/
│   ├── Models/
│   ├── DTOs/
│   ├── Constants/
│   └── Hubs/
│
├── frontend/                         # React SPA (Vite)
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── api/
│       ├── pages/
│       ├── components/
│       ├── hooks/
│       ├── store/
│       └── constants/
│
├── database/
│   ├── create_database_mysql.sql     # MySQL 기준(필수)
│   ├── update_email_templates_mysql.sql
│   ├── create_database.sql           # 레거시(SQL Server)
│   └── insert_dummy_data.sql         # 레거시(SQL Server 문법, MySQL용 아님)
│
├── start_backend.bat
├── start_frontend.bat
├── start_all.bat
├── publish_single_server.bat
├── install_service.bat
├── uninstall_service.bat
├── check_service_status.bat
├── publish_docker.bat
├── docker-compose.yml
├── Dockerfile
├── clean_project.bat
└── README.md
```

---

## 5. 시작하기 (MySQL 기준)

### 5.1 사전 요구사항

- .NET 8 SDK
- Node.js 18+ (LTS 권장)
- MySQL 8.0+
- (선택) Docker Desktop

### 5.1.1 Git 훅(인코딩/문법 가드) 설정 (권장)

깨진 문자나 JSX 문법 오류가 커밋에 포함되지 않도록 pre-commit 훅을 사용할 수 있습니다.

1. Git 설치 확인
2. 프로젝트 루트에서 아래 명령 실행

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\_dev_scripts\install_git_hooks.ps1
```

적용되면 커밋 전에 아래 검사가 자동 실행됩니다.

- `_dev_scripts/check_mojibake.ps1` (깨진 문자/인코딩 검사)
- `_dev_scripts/check_frontend_parse.js` (프론트 소스 파싱 검사)

### 5.2 데이터베이스 준비 (기준: `create_database_mysql.sql`)

`database/create_database_mysql.sql`이 기준 스크립트입니다.

1. 스크립트 상단의 DB 계정 변수(`@app_db_user`, `@app_db_password`, `@app_db_host`)를 운영 환경에 맞게 수정합니다.
2. 스크립트를 전체 실행합니다.
3. DB/테이블/기본 시드(회사, 사용자, 등록코드, 이메일 템플릿 등)가 생성됩니다.
4. `backend/appsettings.json`의 `ConnectionStrings:DefaultConnection`을 실제 DB 정보로 맞춥니다.
5. (선택) 이메일 템플릿만 갱신하려면 `database/update_email_templates_mysql.sql`을 실행합니다.

주의:

- `database/insert_dummy_data.sql`은 SQL Server 문법이므로 MySQL에서 사용하지 않습니다.

예시:

```jsonc
"ConnectionStrings": {
  "DefaultConnection": "Server=YOUR_HOST;Port=1409;Database=BnfErpPortal;User Id=YOUR_USER;Password=YOUR_PW;SslMode=None;AllowPublicKeyRetrieval=True;CharSet=utf8mb4;"
}
```

### 5.3 Backend 실행

로컬 분리 모드(프론트 dev 서버 사용)라면 먼저 포트를 `5000`으로 맞추는 것을 권장합니다.

```jsonc
"App": {
  "Urls": "http://0.0.0.0:5000/"
}
```

실행:

```bash
cd backend
dotnet restore
dotnet build
dotnet run
```

또는:

```cmd
start_backend.bat
```

### 5.4 Frontend 실행

```bash
cd frontend
npm install
npm run dev
```

또는:

```cmd
start_frontend.bat
```

### 5.5 프론트/백엔드 동시 실행 (개발)

```cmd
start_all.bat
```

---

## 6. 배포

### 6.1 단일 서버 배포 (Windows, 통합 실행)

`publish_single_server.bat`는 다음을 자동 수행합니다.

1. 프론트엔드 빌드
2. 백엔드 `dotnet publish` (self-contained `win-x64`)
3. 프론트 빌드 결과를 `publish/wwwroot`에 복사

실행:

```cmd
publish_single_server.bat
```

결과물 실행:

```cmd
cd publish
BnfErpPortal.exe
```

### 6.2 Windows 서비스 등록

서비스 등록 스크립트는 `publish/BnfErpPortal.exe`를 기준으로 동작합니다.

```cmd
install_service.bat
```

- 서비스 이름: `BnFErpPortal`
- 관리자 권한으로 실행 필요

보조 스크립트:

- `check_service_status.bat`
- `uninstall_service.bat`

### 6.3 Docker / Linux 배포

방법 A: Windows에서 이미지 빌드 + tar 추출

```cmd
publish_docker.bat
```

Linux 서버:

```bash
docker load -i publish_docker/bnf-erp-portal_latest.tar
docker compose up -d
```

방법 B: 서버에서 바로 compose 빌드/실행

```bash
docker compose up -d --build
```

주의:

- `docker-compose.yml`의 `ConnectionStrings__DefaultConnection`은 실제 환경 값으로 반드시 변경해야 합니다.
- 기본 매핑 포트는 `3000:3000`입니다.

---

## 7. 주요 설정 (`backend/appsettings.json`)

핵심 키:

- `ConnectionStrings:DefaultConnection`: MySQL 연결 문자열
- `Jwt:*`: 토큰 서명키/발급자/유효기간
- `FileStorage:*`: 업로드 경로, 허용 확장자, 최대 용량
- `Email:*`: SMTP 기본값
- `App:Urls`: Kestrel 바인딩 URL/포트

파일 업로드:

- 절대경로/상대경로 모두 지원
- 운영에서는 업로드 디렉터리 권한(서비스 계정 쓰기/읽기)을 반드시 부여해야 합니다.

---

## 8. 권한/라우트 요약

### 8.1 역할(Role)

- `ADMIN`
- `MANAGER`
- `ENGINEER`
- `CUSTOMER`

### 8.2 정책(Policy)

- `AdminOnly` -> 현재 `ADMIN`, `MANAGER`, `ENGINEER`
- `AdminOrManager` -> 현재 `ADMIN`, `MANAGER`, `ENGINEER`
- `InternalStaff` -> 현재 `ADMIN`, `MANAGER`, `ENGINEER`

참고: 현재 세 정책의 허용 역할이 동일하게 설정되어 있습니다. (필요 시 `backend/Program.cs`에서 분리 가능)

### 8.3 주요 API 경로

- 인증: `/api/auth/*`
- 요청: `/api/requests/*`
- 내부업무: `/api/tasks/*`
- 공지: `/api/notices/*`
- 알림: `/api/notifications/*`
- 대시보드: `/api/dashboard/*`
- 관리자 리소스: `/api/companies`, `/api/users`, `/api/registration-codes`, `/api/email-templates`, `/api/email-settings`, `/api/auditlogs`
- 헬스체크: `/api/health`
- SignalR Hub: `/hubs/notifications`

---

## 9. 서버 경량화 적용 기술 (CPU/RAM 중심)

아래 내용은 **현재 코드에 실제 반영된 항목**을 기준으로, 어떤 기능 개선이 생기는지까지 한눈에 보도록 정리한 것입니다.

### 9.1 한눈에 보는 경량화 맵

| 적용 기술 | 기능적인 개선(체감) | CPU/RAM 관점 효과 | 적용 위치 |
|---|---|---|---|
| `AddDbContextPool` | API 동시 호출 시 DbContext 생성/해제 오버헤드 감소 | 메모리 할당/GC 압력 완화, 처리량 안정화 | `backend/Program.cs` |
| `AsNoTracking()` | 목록/조회 API 응답이 더 가볍고 안정적 | Change Tracker 비용 제거로 CPU/RAM 감소 | `RequestsController`, `TasksController`, `NoticesController`, `UsersController`, `CompaniesController` |
| DTO 프로젝션 + `Skip/Take` | 리스트 화면(요청/업무/공지/로그)에서 필요한 데이터만 전달 | 과조회/과전송 방지, 쿼리/메모리 사용량 감소 | `RequestsController`, `TasksController`, `NoticesController`, `AuditLogsController` |
| 통계 `GroupBy` 집계 | 대시보드/통계 API 호출 시 집계 응답 일관성 향상 | 다중 카운트 호출을 1회 집계로 단순화 | `RequestsController`, `DashboardController` |
| MySQL 인덱스 설계 | 상태/회사/사용자 기준 조회 및 통계 성능 개선 | 풀스캔 가능성 감소, 디스크 I/O/CPU 완화 | `database/create_database_mysql.sql` |
| 엑셀 추출 상한 `Take(1000)` + 최소 컬럼 추출 | 대용량 데이터 추출 시 서버다운 위험 감소 | 메모리 폭증 방지, CPU 처리량 예측 가능 | `RequestsController`, `TasksController` |
| `RegexOptions.Compiled` 재사용 | 엑셀 생성 중 본문 HTML 정리 처리 속도 안정 | 반복 정규식 컴파일 비용 절감 | `RequestsController`, `TasksController` |
| 파일 다운로드 `PhysicalFile(..., enableRangeProcessing: true)` | 첨부파일 다운로드/재개 다운로드 안정성 향상 | 전체 파일 메모리 적재 회피(스트리밍) | `AttachmentsController`, `TaskAttachmentsController`, `NoticesController` |
| 이메일 `Channel` 큐 + 백그라운드 발송 | 요청 처리 API가 메일 발송 대기 없이 빠르게 응답 | 요청 스레드 점유 감소, 피크 시 완충 | `EmailQueueService`, `EmailService`, `Program.cs` |
| SMTP 설정 `IMemoryCache` | 메일 발송 시 설정 조회 지연 감소 | 반복 DB 조회 감소 | `EmailService` |
| RefreshToken 정리 백그라운드 | 장기 운영 시 토큰 테이블 비대화 방지 | DB 저장공간/쿼리 비용 증가 억제 | `RefreshTokenCleanupService`, `Program.cs` |
| Rate Limiter (`1분 30회`) | 로그인/토큰 API 악성 폭주 방어 | 급격한 CPU 스파이크 완화 | `Program.cs`, `AuthController` |
| 정적 리소스 캐시 정책 분리 | 화면 진입(HTML)은 최신 유지, JS/CSS/이미지는 재다운로드 최소화 | 네트워크/서버 전송량 절감 | `Program.cs` |
| CORS preflight 캐싱(24h) | 브라우저의 반복 OPTIONS 요청 감소 | 불필요한 요청 처리 CPU 절감 | `Program.cs` |
| 응답 압축(Brotli/Gzip) | 네트워크 전송량 감소로 체감 응답 개선(특히 WAN) | 대역폭 절감, 단 압축 CPU 비용 존재 | `Program.cs` |
| JSON null 필드 제외 | 불필요 필드 없는 응답으로 프론트 처리 단순화 | 응답 페이로드 감소 | `Program.cs` |
| `ServerGarbageCollection=false` | 중소규모/제한 리소스 서버에서 메모리 풋프린트 관리에 유리 | 메모리 사용량 중심 프로파일(고부하 시 재평가 필요) | `backend/BnfErpPortal.csproj` |

### 9.2 기능 흐름별 개선 포인트

#### A. 목록 화면(요청/업무/공지/로그)

- 어떤 개선이 있나:
  - 필요한 컬럼만 조회해서 리스트를 구성하고, 페이지 단위로 분할 조회합니다.
  - 읽기 전용 조회는 추적을 끄고(`AsNoTracking`) 수행합니다.
- 사용자 체감:
  - 목록 이동/필터링 시 불필요한 지연과 변동 폭이 줄어듭니다.
- 서버 관점:
  - 메모리 점유와 GC 부담, DB/네트워크 부하를 동시에 낮춥니다.

#### B. 대시보드/통계

- 어떤 개선이 있나:
  - 상태별 집계를 DB의 `GroupBy`로 한 번에 계산합니다.
- 사용자 체감:
  - 통계 카드/요약 값이 더 안정적으로 빠르게 로드됩니다.
- 서버 관점:
  - 같은 데이터에 대한 반복 카운트 쿼리를 줄여 CPU/DB 호출 수를 절감합니다.

#### C. 엑셀 다운로드

- 어떤 개선이 있나:
  - 최대 건수를 제한하고(`Take(1000)`), 필요한 컬럼만 추출합니다.
  - HTML 정리용 정규식을 컴파일해 재사용합니다.
- 사용자 체감:
  - 대량 다운로드 시 실패율/타임아웃 가능성을 낮춥니다.
- 서버 관점:
  - RAM 급증 가능성을 제어하고, 반복 문자열 처리 비용을 낮춥니다.

#### D. 첨부파일 다운로드

- 어떤 개선이 있나:
  - 파일을 메모리에 통째로 올리지 않고 물리 파일 스트리밍으로 반환합니다.
  - Range 요청을 지원해 이어받기/부분 다운로드가 가능합니다.
- 사용자 체감:
  - 큰 파일 다운로드 중 네트워크 변동에 대한 복원력이 좋아집니다.
- 서버 관점:
  - 동시 다운로드 상황에서 메모리 급증 위험을 줄입니다.

#### E. 이메일/인증 백그라운드 처리

- 어떤 개선이 있나:
  - 메일은 요청 흐름에서 큐에 적재만 하고 즉시 반환합니다.
  - SMTP 설정은 캐싱하고, RefreshToken은 주기적으로 정리합니다.
  - 인증 핵심 API는 호출 빈도 제한을 둡니다.
- 사용자 체감:
  - 요청 등록/상태변경 API가 메일 처리 대기 없이 응답됩니다.
- 서버 관점:
  - 피크 시간대에도 요청 처리 스레드가 메일 I/O로 묶이지 않아 CPU/RAM 안정성이 높아집니다.

### 9.3 운영 시 튜닝 포인트

- 응답 압축:
  - 대역폭 절감 효과는 크지만 CPU 비용이 있으므로, 트래픽 패턴에 따라 압축 레벨/대상 MIME 조정 검토
- GC 설정:
  - `ServerGarbageCollection=false`는 메모리 풋프린트 중심 설정이므로, 고동시성 환경에서는 재평가 권장
- Rate Limiter:
  - 현재 `1분 30회`는 보수적 기본값입니다. 사용자 규모/공격 패턴에 맞춰 조정 권장
- 엑셀 상한:
  - 현재 1000건 제한은 안정성 중심 값입니다. 인프라 여건에 맞춰 단계적 상향 테스트 가능

### 9.4 운영 메모

- Refresh Token은 HttpOnly 쿠키로 관리
- 백엔드에서 SPA 정적파일(`wwwroot`) 직접 서빙
- Health Check 엔드포인트: `/api/health`

---

## 10. 보안/운영 체크리스트

- `appsettings.json`의 DB 계정/비밀번호/JWT Secret 값을 운영용으로 교체
- 기본 데모 계정 비밀번호 변경 또는 계정 비활성화/삭제
- HTTPS(리버스 프록시 포함) 적용
- 방화벽/보안그룹에서 필요한 포트만 개방
- 업로드 디렉터리 접근 권한 최소화

---

## 11. 데모 계정 (기본 시드)

- 관리자
  - 이메일: `admin@bnfsoft.com`
  - 비밀번호: `********`
- 고객
  - 이메일: `demo@testcompany.com`
  - 비밀번호: `********`

운영 반영 전 반드시 변경하세요.

---

## 12. 라이선스

© 2026 비앤에프소프트. All rights reserved.
