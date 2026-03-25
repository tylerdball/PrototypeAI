import os
import sqlite3
from contextlib import contextmanager
from dotenv import load_dotenv

load_dotenv()
DB_PATH = os.getenv("DB_PATH", "./dnd_assistant.db")


def init_db():
    with get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS campaigns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                setting TEXT,
                party_size INTEGER DEFAULT 4,
                avg_level INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS npcs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                role TEXT,
                personality TEXT,
                backstory TEXT,
                secret TEXT,
                motivation TEXT,
                speech_pattern TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS encounters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                difficulty TEXT,
                monsters TEXT,
                tactics TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS session_notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
                session_number INTEGER,
                raw_notes TEXT,
                summary TEXT,
                plot_threads TEXT,
                npc_interactions TEXT,
                key_events TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS characters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                player_name TEXT,
                class TEXT,
                race TEXT,
                level INTEGER DEFAULT 1,
                str INTEGER, dex INTEGER, con INTEGER,
                int INTEGER, wis INTEGER, cha INTEGER,
                hp INTEGER, ac INTEGER,
                background TEXT,
                traits TEXT,
                equipment TEXT,
                spells TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS lore_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                category TEXT DEFAULT 'general',
                content TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
                filename TEXT NOT NULL,
                original_name TEXT,
                category TEXT DEFAULT 'general',
                caption TEXT,
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
