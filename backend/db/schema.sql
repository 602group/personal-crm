-- Personal OS — Core Database Schema
-- All future module tables are added via separate migration files

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- =============================================================
-- USERS
-- The foundation for authentication and multi-user support.
-- role: 'admin' | 'member' | 'viewer'
-- =============================================================
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin', 'member', 'viewer')),
  avatar_url  TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =============================================================
-- SESSIONS (Refresh Tokens)
-- Tracks active refresh tokens so they can be invalidated.
-- =============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL UNIQUE,
  user_agent    TEXT,
  ip_address    TEXT,
  expires_at    TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =============================================================
-- AUDIT LOG
-- Immutable record of all significant user actions.
-- Future analytics and security auditing.
-- =============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  metadata    TEXT,  -- JSON string
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =============================================================
-- INDEXES
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id   ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity    ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
