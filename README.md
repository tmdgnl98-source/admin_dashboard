# chargev-admin

GS차지비 "차지비" 충전소 운영 관리자 콘솔.
내부 운영팀과 17,000 충전소 파트너가 함께 사용한다.

## 기술 스택

- **Next.js 16** (App Router, Turbopack)
- **React 19**
- **PostgreSQL** + **Prisma 6**
- **TypeScript**
- **Tailwind CSS v4** + **shadcn**
- **scrypt** 기반 세션 인증 (외부 라이브러리 없음)

외부 의존성(본인인증, 사내 충전소 DB, Salesforce, 사내 NAS 등)은 모두
[어댑터 패턴](lib/adapters/README.md)으로 추상화되어 있어,
운영 전환 시 구현체만 갈아끼우면 된다.

---

## 빠른 시작

### 사전 요구사항

- Node.js 20 이상
- PostgreSQL (아래 셋업 방법 중 택1)

### 1. 의존성 설치

```bash
npm install
```

### 2. PostgreSQL 준비

**옵션 A. macOS + Homebrew (Docker 미설치 환경)**

```bash
brew install postgresql@16
brew services start postgresql@16
createdb chargev
```

**옵션 B. Docker (macOS / Windows / Linux 공통)**

Docker Desktop 설치 후:

```bash
npm run db:up        # docker-compose.yml의 Postgres 컨테이너 기동
```

**옵션 C. Windows + PostgreSQL 공식 인스톨러**

1. https://www.postgresql.org/download/windows/ 에서 PostgreSQL 16 인스톨러 다운로드
2. 설치 시 superuser는 `postgres`, 비밀번호는 기억해둘 것 (예: `postgres`)
3. PowerShell 또는 Command Prompt 에서:

```powershell
# psql이 PATH에 있어야 함 (인스톨러 옵션에서 추가 가능)
createdb -U postgres chargev
```

대안으로 pgAdmin GUI에서 `chargev` DB 생성해도 됨.

### 3. 환경변수 설정

macOS / Linux:
```bash
cp .env.example .env
```

Windows (PowerShell):
```powershell
Copy-Item .env.example .env
```

Windows (Command Prompt):
```cmd
copy .env.example .env
```

생성된 `.env`의 `DATABASE_URL`을 환경에 맞게 수정한다.

| 환경 | 예시 |
|---|---|
| Homebrew (본인 macOS 유저) | `postgresql://<유저명>@localhost:5432/chargev?schema=public` |
| Docker (docker-compose 기본) | `postgresql://postgres:dev@localhost:5432/chargev?schema=public` |
| Windows 공식 인스톨러 | `postgresql://postgres:<설치시_비번>@localhost:5432/chargev?schema=public` |

### 4. DB 마이그레이션 + 시드

```bash
npm run db:migrate     # 첫 실행 시 마이그레이션 이름을 묻는다면 'init' 입력
npm run db:seed
```

### 5. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속, `/login`에서 아래 시드 계정으로 로그인.

---

## 시드 계정

| 역할 | 이메일 | 비밀번호 | 비고 |
|---|---|---|---|
| 본사 운영팀 (`main_admin`) | `admin@chargev.local` | `Admin1234!@` | 전체 권한 |
| 일반 직원 (`normal_admin`) | `staff@chargev.local` | `Staff1234!@` | 모니터링/CS |
| 파트너 (`partner_admin`) | `partner@example.com` | `Partner1234!@` | CS001, CS128 owner |
| 테스트 | `test@test.com` | `Test1234!@` | main_admin |
| 테스트 | `qq@qq.q` | `qwe123!@#` | main_admin |

---

## 주요 명령어

```bash
npm run dev          # 개발 서버 (Turbopack)
npm run build        # 프로덕션 빌드
npm run start        # 빌드 결과 서빙
npm run lint         # ESLint

npm run db:up        # Docker로 Postgres 기동
npm run db:down      # Docker Postgres 중지
npm run db:migrate   # Prisma 마이그레이션 (개발)
npm run db:reset     # DB 초기화 + 마이그레이션 + 시드 (데이터 삭제됨)
npm run db:seed      # 시드만 다시 실행
npm run db:studio    # Prisma Studio (DB GUI, http://localhost:5555)
```

---

## 디렉토리 구조

```
app/
  (auth)/              가입, 로그인, 비번찾기 (공개 페이지)
  (dashboard)/         보호 라우트 (로그인 필수)
    dashboard/         메인 대시보드
    stations/          충전소 관리
    accounts/          계정/권한 관리
    station-info/      충전소 정보, 충전기, 실시간, 이력
    settlement/        정산
    maintenance/       유지보수
    customer/          고객센터
    me/                내 프로필
  api/auth/            로그인, 로그아웃, /me API
  theme/               brand.css, semantic.css (디자인 토큰)

components/
  ui/                  shadcn 기반 공통 컴포넌트
  layout/              사이드바, 헤더, AuthHeader

lib/
  adapters/            외부 의존성 추상화 레이어
    auth/              본인인증 (mock → NICE)
    station/           충전소 데이터 (mock → 사내 API)
    contract/          계약 (mock → Salesforce)
    storage/           파일 (mock → 사내 NAS/S3)
    notification/      알림 (console → SMS/이메일/카카오톡)
    notice/            공지사항 (mock → 사내 CMS)
    db/                Prisma 싱글톤
  auth/                세션, 비밀번호, RBAC
  audit/               감사 로그

prisma/
  schema.prisma        DB 스키마
  seed.ts              초기 데이터
  migrations/          마이그레이션 이력

docs/
  PLAN.md              구축 플랜, 로드맵, SoT 매트릭스
  ERD.md               데이터 모델
  SETUP.md             상세 셋업 가이드
  admin.html           VoltHost 디자인 레퍼런스
```

---

## 환경변수 / 어댑터

`.env.example` 참고. 모든 외부 의존성은 어댑터 환경변수로 mock과 실제 구현체를 전환한다.

```env
DATABASE_URL=postgresql://...

ADAPTER_AUTH=mock              # mock / nice
ADAPTER_STATION=mock           # mock / company-api
ADAPTER_CONTRACT=mock          # mock / salesforce
ADAPTER_STORAGE=mock           # mock / nas / s3
ADAPTER_NOTIFICATION=console   # console / bizmessage
ADAPTER_NOTICE=mock            # mock / company-cms

SESSION_SECRET=...
TOTP_ENCRYPTION_KEY=...
```

운영 전환 시 변경 포인트는 [docs/SETUP.md](docs/SETUP.md)의 "운영 전환 시 변경 포인트" 섹션 참고.

---

## 참고 문서

| 문서 | 내용 |
|---|---|
| [docs/PLAN.md](docs/PLAN.md) | 전체 구축 플랜, Phase 0부터 5까지 로드맵, Source-of-Truth 매트릭스 |
| [docs/ERD.md](docs/ERD.md) | Phase 1, 2의 데이터 모델 + Mermaid 다이어그램 |
| [docs/SETUP.md](docs/SETUP.md) | 상세 셋업 가이드, 트러블슈팅 |
| [lib/adapters/README.md](lib/adapters/README.md) | 어댑터 패턴 설명, 추가 방법 |

---

## 트러블슈팅

**Q. 로그인 시 500 에러**
A. DB가 안 떠있거나 마이그레이션이 안 됐을 가능성. `psql -d chargev` 또는 `npm run db:studio`로 연결 확인. 안 되면 1번부터 다시.

**Q. `prisma migrate dev`가 실패**
A. `.env`의 `DATABASE_URL`이 맞는지, Postgres가 5432 포트에서 실행 중인지 (`lsof -i:5432`) 확인.

**Q. 시드 실행 시 `tsx EACCES`**
A. `npx tsx prisma/seed.ts` 직접 실행하거나, `npm run db:seed`를 다시.

**Q. 로그인 후 무한 리다이렉트**
A. 브라우저 쿠키 삭제 후 재시도.

**Q. 파비콘이 안 바뀜**
A. 브라우저 캐시 문제. `Cmd+Shift+R`로 하드 리프레시.
