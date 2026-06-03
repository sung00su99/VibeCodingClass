"""
SQLite → Supabase 데이터 마이그레이션 스크립트 (1회 실행용)

실행 전:
  SUPABASE_URL, SUPABASE_SERVICE_KEY 값을 실제 값으로 교체하세요.

실행:
  cd backend
  python3 migrate_to_supabase.py
"""

import sqlite3
import json
import urllib.request
import urllib.error
import os

# ── 설정 ──────────────────────────────────────────────────────────────
# 실행 전 환경변수를 설정하거나 아래 값을 직접 교체하세요.
# export SUPABASE_URL=https://xxxx.supabase.co
# export SUPABASE_SERVICE_KEY=<service_role key>
SUPABASE_URL     = os.environ.get("SUPABASE_URL", "https://ktqkjvdzqxdkicvmlzni.supabase.co")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
# ────────────────────────────────────────────────────────────────────

DB_PATH = os.path.join(os.path.dirname(__file__), "vibe_coding.db")
TABLE   = "vibe_coding_class_info"


def fetch_sqlite_rows():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = None
    cursor = conn.cursor()
    cursor.execute(
        "SELECT SEQNO, DEPT, NAME, TITLE, PHONE, EMAIL, CLASSYN, REMARKS "
        "FROM Vibe_Coding_Class_Info ORDER BY SEQNO"
    )
    cols = ["seqno", "dept", "name", "title", "phone", "email", "classyn", "remarks"]
    rows = [dict(zip(cols, row)) for row in cursor.fetchall()]
    conn.close()
    return rows


def insert_to_supabase(rows):
    url = f"{SUPABASE_URL}/rest/v1/{TABLE}"
    headers = {
        "Content-Type":  "application/json",
        "apikey":        SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Prefer":        "return=minimal",
    }
    body = json.dumps(rows).encode("utf-8")
    req  = urllib.request.Request(url, data=body, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req) as resp:
            print(f"성공: HTTP {resp.status} — {len(rows)}건 삽입 완료")
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        print(f"실패: HTTP {e.code}\n{error_body}")
        raise


def main():
    if not SUPABASE_SERVICE_KEY:
        print("오류: SUPABASE_SERVICE_KEY 환경변수를 설정하세요. (export SUPABASE_SERVICE_KEY=<service_role key>)")
        return

    print(f"SQLite에서 데이터 읽는 중... ({DB_PATH})")
    rows = fetch_sqlite_rows()
    print(f"총 {len(rows)}건 읽음")

    print(f"Supabase [{TABLE}] 테이블에 삽입 중...")
    insert_to_supabase(rows)


if __name__ == "__main__":
    main()
