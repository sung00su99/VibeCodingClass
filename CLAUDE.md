# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vibe Coding 정보 공유 세션 참석 확인 웹앱. 부서원이 이름 카드를 클릭하고 이메일 인증 후 참석 여부(Y/N)를 셀프 등록한다. 외부 참석자는 좌측 패널에서 이름/이메일 입력 후 기타 부서로 등록한다.

**현재 스택:** GitHub Pages (정적 프론트엔드) + Supabase (PostgreSQL DB + Edge Function)

## Architecture

```
VibeCodingClass/
├── docs/                          # GitHub Pages 서빙 루트 (/docs 폴더)
│   ├── index.html                 # 메인 페이지 (좌측 패널 + 통계 바 + 멤버 그리드)
│   ├── css/style.css              # 전체 스타일 (MICUBE 브랜드 #004d45, #00a99d)
│   ├── js/main.js                 # 멤버 로드, 그리드 렌더, 팝업, 참석/기타 등록
│   ├── popup/attendance.html      # 팝업 단독 페이지 (window.open 용)
│   └── img/micube.jpg             # 헤더 로고
├── supabase/
│   └── functions/attendance/
│       └── index.ts               # Deno Edge Function — 참석 등록/기타 추가/삭제
├── backend/                       # 마이그레이션 완료 후 불필요 (레거시 보관)
│   ├── migrate_to_supabase.py     # 1회성 SQLite→Supabase 마이그레이션 스크립트
│   ├── import_excel.py            # 엑셀→SQLite 임포트 (한/영 헤더 지원)
│   └── vibe_coding.db             # 원본 SQLite DB (백업용)
└── excel/
    └── vibecoding_class.xlsx      # 원본 데이터
```

## Live URLs

| 서비스 | URL |
|--------|-----|
| 프론트엔드 | `https://sung00su99.github.io/VibeCodingClass/` |
| Supabase 프로젝트 | `https://ktqkjvdzqxdkicvmlzni.supabase.co` |
| Edge Function | `https://ktqkjvdzqxdkicvmlzni.supabase.co/functions/v1/attendance` |

## Commands

### 프론트엔드 로컬 확인 (WSL)
```bash
powershell.exe -Command "Start-Process '$(wslpath -w /home/sung00su99/work/VibeCodingClass/docs/index.html)'"
```
로컬 파일은 Supabase API를 직접 호출하므로 별도 서버 불필요.

### 헤드리스 브라우저 스크린샷 (WSL)
```bash
WINPATH=$(wslpath -w /tmp/screenshot.png)
powershell.exe -Command "& 'C:\Program Files\Google\Chrome\Application\chrome.exe' --headless --disable-gpu --screenshot='$WINPATH' --window-size=1400,900 'https://sung00su99.github.io/VibeCodingClass/'"
```

### Edge Function 배포
대시보드에서 직접 배포: `https://supabase.com/dashboard/project/ktqkjvdzqxdkicvmlzni/functions`  
`supabase/functions/attendance/index.ts` 내용을 붙여넣고 Deploy.

### 데이터 마이그레이션 (재실행 시)
```bash
export SUPABASE_SERVICE_KEY=<service_role key>
cd backend && python3 migrate_to_supabase.py
```

## DB Schema

**Supabase 테이블:** `vibe_coding_class_info` (컬럼명 소문자)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | SERIAL PK | |
| seqno | TEXT | 정렬 기준 (0001~). 기타 부서는 '9999' |
| dept | TEXT | 부서명. 외부 참석자는 `기타` |
| name | TEXT NOT NULL | |
| title | TEXT | 직함 |
| phone | TEXT | |
| email | TEXT NOT NULL | 이메일 인증에 사용 |
| classyn | TEXT | `Y` / `N` / 빈값(미확인) |
| remarks | TEXT | |

## Edge Function — `attendance/index.ts`

단일 엔드포인트 `POST /functions/v1/attendance`에서 `action` 필드로 분기:

| action | 필수 필드 | 동작 |
|--------|-----------|------|
| (없음) | `id, email, classyn` | 이메일 인증 후 classyn 업데이트 |
| `"add"` | `name, email` | `dept='기타', classyn='Y'`로 신규 삽입 |
| `"delete"` | `id` | `dept='기타'`인 행만 삭제 (안전 제한) |

모든 DB 작업은 `SUPABASE_SERVICE_ROLE_KEY`(자동 주입)로 실행 → RLS 우회.  
요청 시 `Authorization: Bearer <anon_key>` 헤더 필수.

## Key Behaviors

### 이메일 인증 흐름
1. 카드 클릭 → 팝업
2. 이메일 아이디 입력 후 `@` 키 → `@micube.co.kr` 자동완성
3. Edge Function이 DB 이메일과 `toLowerCase()` 비교
4. 인증 성공 시 `localStorage.setItem('vibeauth_{id}', email)` 저장
5. 재방문 시 이메일 자동입력 + 입력창 비활성화 (문성수 제외)

### 기타 부서 카드
- 팝업 없음, 항상 `참석(Y)` 뱃지
- 카드 하단 삭제 버튼 → `action: "delete"` 호출
- `renderGrid()`에서 `기타` 부서는 항상 마지막 섹션 렌더

### 프론트 렌더링 구조
- `#page-body`: 좌측 패널(`#left-panel`) + 메인(`#main-content`) flex 레이아웃
- `renderGrid()`: DEPT별 `.dept-section` → `.dept-header` + `.dept-cards` grid
- `callEdge(payload)`: Edge Function 호출 공통 헬퍼

### 정렬 규칙
- API `ORDER BY seqno` 반환
- 정보화1팀: 권우진 최상단, 이하 직함순
- 정보화2팀: 문성수·황혜림·김정주·이경환·우장일 고정, 이하 직함순

## UI 브랜드
- 메인 컬러: `#004d45`(다크 청록), `#00a99d`(청록)
- 폰트: Noto Sans KR
- 로고: `docs/img/micube.jpg` — 헤더 우측 상단

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->
