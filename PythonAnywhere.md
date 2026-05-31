# PythonAnywhere 배포 계획

현재 구조(Flask + SQLite + 로컬 실행)를 PythonAnywhere(백엔드) + GitHub Pages(프론트엔드)로 배포하는 작업 계획입니다.

---

## 전체 구조 변화

```
[현재]
브라우저 → Flask(localhost:5000) → SQLite(로컬)

[전환 후]
브라우저 → GitHub Pages (HTML/CSS/JS 정적 파일)
         → PythonAnywhere (Flask API + SQLite DB)
           https://<username>.pythonanywhere.com/api/members
           https://<username>.pythonanywhere.com/api/attendance
```

> Supabase 방식과 달리 **백엔드 코드 변경이 거의 없습니다.** Flask + SQLite 그대로 사용합니다.

---

## 작업 순서

### STEP 1 — 사용자가 할 일: PythonAnywhere 계정 생성

1. [https://www.pythonanywhere.com](https://www.pythonanywhere.com) 접속
2. `Start running Python online in less than a minute!` → `Create a Beginner account` 클릭
3. 회원가입 (무료 Beginner 플랜 선택)
4. **사용자명(username)을 메모** → 배포 도메인이 됨
   - 예: `sung00su` 로 가입하면 `https://sung00su.pythonanywhere.com`

---

### STEP 2 — 사용자가 할 일: 파일 업로드 (git clone 방식 추천)

PythonAnywhere 대시보드 → `Consoles` 탭 → `Bash` 클릭 → 아래 명령 실행

```bash
# GitHub 저장소에서 바로 클론
git clone https://github.com/sung00su99/VibeCodingClass.git
```

> 파일 탭에서 직접 업로드도 가능하지만 git clone이 훨씬 편합니다.
> 저장소가 Private이면 GitHub Personal Access Token이 필요합니다.

---

### STEP 3 — 사용자가 할 일: 가상환경 생성 + 패키지 설치

Bash 콘솔에서 계속 실행:

```bash
# 가상환경 생성 (Python 3.10)
mkvirtualenv vibe-env --python=python3.10

# 패키지 설치
pip install flask==3.0.3 flask-cors==4.0.1 openpyxl
```

---

### STEP 4 — 사용자가 할 일: Web App 생성

1. PythonAnywhere 대시보드 → `Web` 탭 → `Add a new web app` 클릭
2. 도메인 확인 (`<username>.pythonanywhere.com`) → `Next`
3. **`Manual configuration`** 선택 (Flask 자동 선택 X)
4. Python 버전 **3.10** 선택 → `Next`
5. Web app 생성 완료

---

### STEP 5 — Claude가 할 일: WSGI 설정 파일 내용 작성

PythonAnywhere는 WSGI 파일로 Flask 앱을 연결합니다. Claude가 아래 내용을 작성합니다.

```python
# /var/www/<username>_pythonanywhere_com_wsgi.py 에 붙여넣을 내용 (Claude가 최종본 작성)

import sys

path = '/home/<username>/VibeCodingClass/backend'
if path not in sys.path:
    sys.path.insert(0, path)

from app import app as application
```

---

### STEP 6 — 사용자가 할 일: WSGI 파일 편집 + 가상환경 연결

1. `Web` 탭 → `WSGI configuration file` 링크 클릭 (편집기 열림)
2. 기존 내용 전체 삭제 후 Claude가 작성한 내용 붙여넣기 → `Save`
3. 같은 `Web` 탭에서 **Virtualenv** 항목 찾기
   - `Enter path to a virtualenv` 클릭
   - `/home/<username>/.virtualenvs/vibe-env` 입력 → 확인
4. 페이지 상단 **`Reload`** 버튼 클릭

---

### STEP 7 — 사용자가 할 일: API 동작 확인

브라우저에서 직접 접속해서 확인:

```
https://<username>.pythonanywhere.com/api/members
```

멤버 목록이 JSON으로 나오면 백엔드 배포 성공입니다.

---

### STEP 8 — Claude가 할 일: 프론트엔드 수정

**`frontend/js/main.js` 수정**
```js
// 변경 전
const API_BASE = "http://localhost:5000/api";

// 변경 후
const API_BASE = "https://<username>.pythonanywhere.com/api";
```

**`frontend/index.html` 이미지 경로 수정**
```html
<!-- 변경 전 -->
<img src="../img/micube.jpg" alt="MICUBE SOLUTION" />

<!-- 변경 후 -->
<img src="img/micube.jpg" alt="MICUBE SOLUTION" />
```

**폴더 구조 정리 (GitHub Pages용)**
- `img/` 폴더를 `frontend/` 안으로 이동
- `frontend/` 폴더명을 `docs/`로 변경
  - GitHub Pages는 `root(/)` 또는 `/docs` 폴더만 서빙 소스로 지원

---

### STEP 9 — 사용자가 할 일: GitHub Pages 설정

1. GitHub 저장소 → `Settings` → `Pages`
2. Source: `Deploy from a branch`
3. Branch: `main` / Folder: `/docs`
4. `Save` 클릭

---

### STEP 10 — 사용자가 할 일: 변경사항 GitHub Push

```bash
git add .
git commit -m "PythonAnywhere 배포 설정"
git push origin main
```

잠시 후 `https://sung00su99.github.io/VibeCodingClass/` 접속하여 최종 확인.

---

## 최종 파일 구조 (전환 후)

```
VibeCodingClass/
├── docs/                        # (현 frontend/ → 이름 변경, GitHub Pages 서빙)
│   ├── index.html               # img 경로 수정
│   ├── img/
│   │   └── micube.jpg           # (현 루트 img/ → 이동)
│   ├── css/style.css
│   ├── js/main.js               # API_BASE URL만 변경
│   └── popup/attendance.html
├── backend/
│   ├── app.py                   # 변경 없음
│   ├── database.py              # 변경 없음
│   ├── import_excel.py          # 변경 없음
│   └── vibe_coding.db           # PythonAnywhere에도 동일하게 존재
└── PythonAnywhere.md            # 이 파일
```

> 백엔드 코드는 `app.py`, `database.py` 모두 **변경 없음**입니다.

---

## Supabase 방식과 비교

| 항목 | PythonAnywhere | Supabase |
|------|---------------|----------|
| 백엔드 코드 변경 | 거의 없음 | 전면 재작성 |
| DB 마이그레이션 | 불필요 (SQLite 그대로) | 필요 (PostgreSQL로 전환) |
| 작업 난이도 | 쉬움 | 보통 |
| 무료 플랜 제한 | CPU 100초/일, 3개월마다 수동 갱신 | 1주 비활성 시 일시 정지 |
| 콜드 스타트 | 없음 (항상 실행 중) | 없음 |

---

## 비용

| 항목 | 비용 |
|------|------|
| PythonAnywhere Beginner 플랜 | $0 |
| GitHub Pages | $0 |
| **합계** | **$0** |

---

## 주의사항

- 무료 플랜은 **3개월마다 Web 탭에서 수동으로 `Reload`** 해야 계속 유지됨 (이메일 알림 옴)
- 무료 플랜은 외부 인터넷 접속이 제한됨 (화이트리스트 도메인만 허용) → 이 앱은 외부 호출 없으므로 무관
- `vibe_coding.db` 파일은 PythonAnywhere 서버에 있으므로 로컬 DB와 별도로 관리됨
  - 로컬에서 엑셀 임포트 후 DB 파일을 PythonAnywhere에 다시 업로드해야 함
  - 또는 PythonAnywhere Bash 콘솔에서 직접 `import_excel.py` 실행 가능
