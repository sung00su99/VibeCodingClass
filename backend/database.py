import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "vibe_coding.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS Vibe_Coding_Class_Info (
            ID      INTEGER PRIMARY KEY AUTOINCREMENT,
            SEQNO   TEXT,
            DEPT    TEXT,
            NAME    TEXT NOT NULL,
            TITLE   TEXT,
            PHONE   TEXT,
            EMAIL   TEXT NOT NULL,
            CLASSYN TEXT DEFAULT '',
            REMARKS TEXT
        )
    """)
    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
    print("DB 초기화 완료:", DB_PATH)
