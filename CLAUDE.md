# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vibe Coding 정보 공유 세션 참석 확인 웹앱. 부서원이 이름 카드를 클릭하고 이메일 인증 후 참석 여부(Y/N)를 셀프 등록한다.

## Commands

### 서버 실행
```bash
cd backend
python3 app.py          # Flask 개발 서버 (port 5000, debug=on)
```

### 엑셀 임포트 (DB 초기화 후 실행)
```bash
# DB 초기화
python3 -c "
from database import get_connection
conn = get_connection()
cursor = conn.cursor()
cursor.execute('DELETE FROM Vibe_Coding_Class_Info')
cursor.execute('DELETE FROM sqlite_sequence WHERE name=\"Vibe_Coding_Class_Info\"')
conn.commit(); conn.close()
"

# 임포트
cd backend
python3 import_excel.py ../excel/vibecoding_class.xlsx
```

### 의존성 설치
```bash
pip install -r backend/requirements.txt   # flask==3.0.3, flask-cors==4.0.1, openpyxl
```

### 프론트엔드 열기 (WSL 환경)
```bash
powershell.exe -Command "Start-Process '$(wslpath -w /home/sung00su99/work/VibeCodingClass/frontend/index.html)'"
```

## Architecture

```
VibeCodingClass/
├── backend/
│   ├── app.py            # Flask REST API (GET /api/members, POST /api/attendance)
│   ├── database.py       # SQLite 초기화, get_connection(), DB_PATH
│   ├── import_excel.py   # 엑셀 → DB 임포트 (한/영 헤더 모두 지원)
│   └── vibe_coding.db    # SQLite DB
├── frontend/
│   ├── index.html        # 메인 페이지 (헤더 + 통계 바 + 멤버 그리드)
│   ├── css/style.css     # 전체 스타일 (MICUBE 브랜드 청록 컬러 #004d45, #00a99d)
│   ├── js/main.js        # 멤버 로드, DEPT별 그리드 렌더, 팝업, 참석 등록
│   └── popup/attendance.html  # 팝업 단독 페이지 (window.open / iframe 용)
├── excel/
│   └── vibecoding_class.xlsx  # 원본 데이터 (vibecoding_class_temp.xlsx는 테스트용)
└── img/
    └── micube.jpg        # MICUBE SOLUTION 로고 (헤더 우측 상단)
```

## DB Schema

**테이블:** `Vibe_Coding_Class_Info`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| ID | INTEGER PK AUTOINCREMENT | |
| SEQNO | TEXT | 표시 순서 (0001~) — 정렬 기준 |
| DEPT | TEXT | 부서명 |
| NAME | TEXT NOT NULL | 이름 |
| TITLE | TEXT | 직함 (수석/수석보/책임/선임/사원) |
| PHONE | TEXT | 휴대폰 |
| EMAIL | TEXT NOT NULL | 인증에 사용되는 이메일 |
| CLASSYN | TEXT | 참석 유무 (Y/N/빈값=미확인) |
| REMARKS | TEXT | 비고 |

## Key Behaviors

### 정렬 규칙
- API는 `ORDER BY SEQNO` 반환
- 정보화1팀: 권우진 최상단 고정, 이하 직함순 (수석→수석보→책임→선임→사원)
- 정보화2팀: 문성수·황혜림·김정주·이경환·우장일 순서 고정, 이하 직함순
- SEQNO 재정렬 시 Python 스크립트로 UPDATE 처리 (ALTER TABLE 불필요)

### 이메일 인증 흐름
1. 카드 클릭 → 팝업 표시
2. 아이디 입력 후 `@` 키 → `@micube.co.kr` 자동완성 (keydown 이벤트)
3. POST `/api/attendance` → DB의 EMAIL과 대소문자 무시 비교
4. 불일치 시 "사용자 인증에 실패 했습니다" 반환

### 프론트 렌더링
- `main.js`의 `renderGrid()`가 DEPT별로 `.dept-section` 생성
- 각 섹션: `.dept-header`(팀명 배너) + `.dept-cards`(멤버 카드 grid)
- SEQNO는 카드 내 `.card-seqno`로 표시

### 엑셀 임포트 헤더 매핑
한국어/영어 헤더 모두 지원 (`import_excel.py`의 `COLUMN_MAP`).
NAME과 EMAIL이 없는 행은 자동 스킵.
SEQNO는 임포트 순서대로 자동 부여.

## UI 브랜드
- 메인 컬러: `#004d45`(다크 청록), `#00a99d`(청록)
- 폰트: Noto Sans KR
- 로고: `img/micube.jpg` — 헤더 우측 상단 흰 배경 박스에 표시
