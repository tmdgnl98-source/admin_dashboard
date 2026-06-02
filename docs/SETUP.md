# 로컬 개발 셋업

## 사전 요구사항

- Node.js 20 이상
- PostgreSQL 16 (아래 OS별 셋업 참고)

---

## OS별 Postgres 셋업

### macOS

**A. Homebrew (Docker 미설치 환경 추천)**

```bash
brew install postgresql@16
brew services start postgresql@16
createdb chargev
```

**B. Docker Desktop**

```bash
npm run db:up        # docker-compose.yml 기반
```

### Windows

**A. PostgreSQL 공식 인스톨러 (가장 간단)**

1. https://www.postgresql.org/download/windows/ 에서 인스톨러 다운로드
2. 설치 시:
   - superuser는 기본값 `postgres`
   - 비밀번호 설정 (예: `postgres`) - 기억해둘 것
   - "Stack Builder" 같은 부가 도구는 선택사항
   - "Add to PATH" 체크 권장 (psql 명령 사용을 위해)
3. PowerShell 또는 Command Prompt 에서 DB 생성:

```powershell
createdb -U postgres chargev
# 비밀번호 프롬프트 뜨면 설치 시 입력한 비번
```

또는 pgAdmin GUI에서 `chargev` DB 생성.

**B. Docker Desktop for Windows**

1. https://www.docker.com/products/docker-desktop/ 설치
2. 실행 (WSL2 backend 권장)
3. PowerShell 에서:

```powershell
npm run db:up
```

**C. WSL2 + Ubuntu**

WSL2 안에서 Linux Postgres 사용:

```bash
sudo apt update
sudo apt install postgresql-16
sudo service postgresql start
sudo -u postgres createdb chargev
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'dev';"
```

### Linux

```bash
sudo apt install postgresql-16     # Ubuntu/Debian
# 또는
sudo dnf install postgresql-server # Fedora/RHEL

sudo systemctl start postgresql
sudo -u postgres createdb chargev
```

---

## 첫 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 파일 생성
cp .env.example .env                    # macOS, Linux, Git Bash
# Windows PowerShell:
# Copy-Item .env.example .env
# Windows Command Prompt:
# copy .env.example .env

# 3. .env 의 DATABASE_URL 을 환경에 맞게 수정
#    Homebrew (macOS):     postgresql://<유저명>@localhost:5432/chargev?schema=public
#    Docker (compose 기본): postgresql://postgres:dev@localhost:5432/chargev?schema=public
#    Windows 공식 인스톨러:  postgresql://postgres:<설치시_비번>@localhost:5432/chargev?schema=public

# 4. DB 마이그레이션 + Prisma 클라이언트 생성
npm run db:migrate
# (첫 실행 시 마이그레이션 이름 물어보면 'init' 입력)

# 5. 시드 데이터 주입
npm run db:seed

# 6. 개발 서버 시작
npm run dev
```

브라우저에서 http://localhost:3000

---

## 시드 계정

| 역할 | 이메일 | 비밀번호 |
|---|---|---|
| 본사 운영팀 (`main_admin`) | `admin@chargev.local` | `Admin1234!@` |
| 일반 직원 (`normal_admin`) | `staff@chargev.local` | `Staff1234!@` |
| 파트너 (`partner_admin`) | `partner@example.com` | `Partner1234!@` |
| 테스트 | `test@test.com` | `Test1234!@` |
| 테스트 | `qq@qq.q` | `qwe123!@#` |

`/login` 에서 위 계정으로 로그인.

---

## 자주 쓰는 명령

```bash
npm run db:studio    # Prisma Studio (DB GUI), http://localhost:5555
npm run db:reset     # DB 초기화 + 마이그레이션 + 시드 재실행 (데이터 삭제됨)
npm run db:down      # Docker Postgres 컨테이너 중지
```

---

## 운영 전환 시 변경 포인트

1. `.env`의 `DATABASE_URL` → 사내 AWS DB 주소
2. `ADAPTER_AUTH=mock` → `nice` (NICE 본인인증 연결)
3. `ADAPTER_STATION=mock` → `company-api` (회사 충전소 DB API)
4. `ADAPTER_CONTRACT=mock` → `salesforce`
5. `ADAPTER_STORAGE=mock` → `nas` 또는 `s3`
6. `ADAPTER_NOTIFICATION=console` → `bizmessage` (카카오 알림톡)
7. `ADAPTER_NOTICE=mock` → `company-cms` (사내 공지 시스템)
8. `SESSION_SECRET`, `TOTP_ENCRYPTION_KEY` 운영용 키로 교체

각 어댑터의 실제 구현체는 `lib/adapters/<name>/` 안에 추가하고
`index.ts`의 factory switch에 케이스만 추가하면 됨. 호출부 변경 0건.

---

## 트러블슈팅

**Q. 로그인 시 500 에러**
A. DB가 안 떠있거나 마이그레이션이 안 됐을 가능성. `psql -d chargev` 또는 `npm run db:studio`로 연결 확인.

**Q. `prisma migrate dev` 가 권한 오류**
A. Postgres가 실행 중인지, `.env`의 `DATABASE_URL`이 맞는지 확인.
- macOS Homebrew: `brew services list` 로 상태 확인
- Docker: `docker ps` 로 컨테이너 확인 후 `npm run db:up`
- Windows 공식: 서비스 관리자에서 `postgresql-x64-16` 실행 상태 확인

**Q. Windows 에서 `npm run db:seed` 가 EACCES**
A. PowerShell을 관리자 권한으로 실행하거나, `npx tsx prisma/seed.ts` 직접 실행.

**Q. 로그인 후 무한 리다이렉트**
A. 쿠키 충돌 가능성. 브라우저 쿠키 삭제 후 재시도.

**Q. 시드 재실행 시 "unique constraint" 오류**
A. seed는 upsert로 짜여있어 중복 안전. 그래도 문제면 `npm run db:reset`.

**Q. Windows 에서 `cp` 명령을 못 찾음**
A. PowerShell이면 `Copy-Item`, Command Prompt면 `copy` 사용. 또는 Git Bash 설치 후 사용.

**Q. 파비콘이 안 바뀜**
A. 브라우저 캐시 문제. `Cmd+Shift+R` (macOS) 또는 `Ctrl+F5` (Windows) 로 하드 리프레시.
