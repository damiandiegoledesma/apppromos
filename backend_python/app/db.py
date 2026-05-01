import sqlite3
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "apppromos.db"

def get_connection():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS carniza_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question TEXT NOT NULL UNIQUE,
                answer TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        conn.commit()

def get_cached_answer(question: str):
    normalized = normalize_question(question)
    with get_connection() as conn:
        row = conn.execute("SELECT answer FROM carniza_cache WHERE question = ? LIMIT 1", (normalized,)).fetchone()
    return row["answer"] if row else None

def save_cached_answer(question: str, answer: str):
    normalized = normalize_question(question)
    with get_connection() as conn:
        conn.execute("INSERT OR REPLACE INTO carniza_cache (question, answer, created_at) VALUES (?, ?, ?)", (normalized, answer, datetime.now().isoformat()))
        conn.commit()

def normalize_question(question: str):
    return " ".join(str(question).lower().strip().split())
