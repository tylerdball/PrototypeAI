import os
import sqlite3
from contextlib import contextmanager
from dotenv import load_dotenv

load_dotenv()
DB_PATH = os.getenv("DB_PATH", "./observability.db")


def init_db():
    with get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS datasets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                owner_team TEXT,
                owner_person TEXT,
                domain TEXT,
                source_system TEXT,
                format TEXT,
                update_frequency TEXT,
                tags TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS slos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
                slo_type TEXT NOT NULL,
                description TEXT,
                target_value REAL NOT NULL,
                current_value REAL,
                unit TEXT DEFAULT '%',
                status TEXT DEFAULT 'unknown',
                last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS pipelines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dataset_id INTEGER REFERENCES datasets(id) ON DELETE SET NULL,
                name TEXT NOT NULL,
                owner_team TEXT,
                schedule TEXT,
                status TEXT DEFAULT 'unknown',
                last_run_at TIMESTAMP,
                avg_duration_mins REAL,
                success_rate_7d REAL,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()
