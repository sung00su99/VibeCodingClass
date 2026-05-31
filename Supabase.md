# Supabase 마이그레이션 계획

현재 구조(Flask + SQLite + 로컬 실행)를 Supabase + GitHub Pages로 전환하는 작업 계획입니다.

---

## 전체 구조 변화

```
[현재]
브라우저 → Flask(localhost:5000) → SQLite

[전환 후]
브라우저 → GitHub Pages (HTML/CSS/JS)
         → Supabase REST API (멤버 목록 조회)
         → Supabase Edge Function (이메일 인증 + 참석 등록)
```

---

## 작업 순서

### STEP 1 — 사용자가 할 일: Supabase 프로젝트 생성

1. [https://supabase.com](https://supabase.com) 접속 → 회원가입 (GitHub 계정으로 가능)
2. `New Project` 클릭
   - Organization: 본인 계정
   - Project name: `VibeCodingClass` (원하는 이름)
   - Database Password: 기억하기 쉬운 비밀번호 설정
   - Region: `Northeast Asia (Seoul)` 선택
3. 프로젝트 생성 완료 후 **아래 두 값을 메모**
   - `Settings → API → Project URL` (예: `https://xxxx.supabase.co`)
   - `Settings → API → anon public key`
   - `Settings → API → service_role key` (절대 외부 노출 금지)

---

### STEP 2 — Claude가 할 일: Supabase 테이블 생성 SQL 작성

현재 SQLite 스키마를 PostgreSQL용으로 변환한 SQL을 작성합니다.

```sql
-- 예시 (실제 작업 시 Claude가 최종본 작성)
CREATE TABLE vibe_coding_class_info (
  id        SERIAL PRIMARY KEY,
  seqno     TEXT,
  dept      TEXT,
  name      TEXT NOT NULL,
  title     TEXT,
  phone     TEXT,
  email     TEXT NOT NULL,
  classyn   TEXT DEFAULT '',
  remarks   TEXT
);
```

---

### STEP 3 — 사용자가 할 일: 테이블 생성 + RLS 설정

1. Supabase 대시보드 → `SQL Editor` 열기
2. Claude가 작성한 SQL을 붙여넣고 실행 (`Run`)
3. RLS(Row Level Security) 정책 설정 (Claude가 SQL로 제공)
   - 멤버 목록 읽기: 누구나 가능 (anon key)
   - 참석 등록: Edge Function만 가능 (service_role key)

---

### STEP 4 — Claude가 할 일: 데이터 마이그레이션 스크립트 작성

기존 SQLite DB(`backend/vibe_coding.db`)의 데이터를 Supabase로 옮기는 Python 스크립트를 작성합니다.

- SQLite에서 전체 데이터 읽기
- Supabase REST API로 INSERT
- 실행 한 번으로 완료되는 스크립트

---

### STEP 5 — 사용자가 할 일: 마이그레이션 스크립트 실행

```bash
# Claude가 작성한 스크립트 실행
cd backend
python3 migrate_to_supabase.py
```

- Supabase 대시보드 → `Table Editor`에서 데이터 들어왔는지 확인

---

### STEP 6 — Claude가 할 일: Edge Function 작성

참석 등록 시 이메일 인증 로직을 Edge Function(Deno)으로 작성합니다.

- `POST` 요청으로 `{ id, email, classyn }` 수신
- DB의 EMAIL과 대소문자 무시 비교
- 불일치 시 에러 반환
- 일치 시 CLASSYN 업데이트

---

### STEP 7 — 사용자가 할 일: Supabase CLI 설치 + Edge Function 배포

```bash
# Supabase CLI 설치 (Windows PowerShell)
winget install Supabase.CLI

# 또는 npm으로 설치
npm install -g supabase

# 로그인
supabase login

# Edge Function 배포 (Claude가 작성한 파일 기준)
supabase functions deploy attendance --project-ref <프로젝트-ref>
```

- 프로젝트 ref: Supabase 대시보드 URL에서 확인 (`https://supabase.com/dashboard/project/<ref>`)

---

### STEP 8 — Claude가 할 일: 프론트엔드 수정

**`frontend/js/main.js` 변경**
- `API_BASE = "http://localhost:5000/api"` → Supabase URL로 교체
- `GET /api/members` → Supabase REST API 호출로 변경
- `POST /api/attendance` → Supabase Edge Function URL로 변경

**`frontend/index.html` 변경**
- 이미지 경로 수정 (`../img/micube.jpg` → `img/micube.jpg`)

**폴더 구조 정리**
- `img/` 폴더를 `frontend/` 안으로 이동
- GitHub Pages 서빙을 위해 `frontend/` → `docs/`로 이름 변경

---

### STEP 9 — 사용자가 할 일: GitHub Pages 설정

1. GitHub 저장소 → `Settings` → `Pages`
2. Source: `Deploy from a branch`
3. Branch: `main` / Folder: `/docs`
4. `Save` 클릭
5. 잠시 후 `https://sung00su99.github.io/VibeCodingClass/` 접속 확인

---

### STEP 10 — 사용자가 할 일: 변경사항 GitHub Push

```bash
git add .
git commit -m "Supabase 마이그레이션"
git push origin main
```

---

## 최종 파일 구조 (전환 후)

```
VibeCodingClass/
├── docs/                        # (현 frontend/ → 이름 변경, GitHub Pages 서빙)
│   ├── index.html
│   ├── img/
│   │   └── micube.jpg           # (현 루트 img/ → 이동)
│   ├── css/style.css
│   ├── js/main.js               # API 호출 전면 수정
│   └── popup/attendance.html
├── supabase/
│   └── functions/
│       └── attendance/
│           └── index.ts         # Edge Function (Claude 작성)
├── backend/
│   └── migrate_to_supabase.py   # 마이그레이션 스크립트 (Claude 작성, 1회 실행 후 불필요)
└── Supabase.md                  # 이 파일
```

> `backend/app.py`, `backend/database.py`, `backend/vibe_coding.db`는 마이그레이션 완료 후 삭제 가능

---

## 비용

| 항목 | 비용 |
|------|------|
| Supabase 무료 플랜 | $0 (DB 500MB, Edge Function 500만 호출/월) |
| GitHub Pages | $0 |
| **합계** | **$0** |

---

## 주의사항

- `service_role key`는 절대 프론트엔드 코드에 넣지 말 것 (Edge Function 서버에서만 사용)
- Supabase 무료 플랜은 **1주일 비활성 시 프로젝트 일시 정지** → 주기적 접속 필요
- 마이그레이션 전 `backend/vibe_coding.db` 백업 권장
