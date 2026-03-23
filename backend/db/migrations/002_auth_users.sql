-- Migration 002 v2: Expand user roles, add profile columns, add password_resets table
-- Also refreshes sessions FK reference by recreating sessions table.

-- Step 1: Rename existing tables
ALTER TABLE users RENAME TO users_old;
ALTER TABLE sessions RENAME TO sessions_old;

-- Step 2: Recreate users with updated role constraint + new columns
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member')),
  avatar_url    TEXT,
  bio           TEXT,
  is_active     INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Step 3: Copy users, mapping old roles
INSERT INTO users (id, email, password_hash, name, role, avatar_url, is_active, created_at, updated_at)
SELECT
  id, email, password_hash, name,
  CASE role
    WHEN 'admin'  THEN 'owner'
    WHEN 'viewer' THEN 'member'
    ELSE role
  END,
  avatar_url, is_active, created_at, updated_at
FROM users_old;

-- Step 4: Recreate sessions pointing to new users table
CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL UNIQUE,
  user_agent    TEXT,
  ip_address    TEXT,
  expires_at    TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Step 5: Copy sessions (drop expired ones, copy valid ones)
INSERT INTO sessions (id, user_id, refresh_token, user_agent, ip_address, expires_at, created_at)
SELECT s.id, s.user_id, s.refresh_token, s.user_agent, s.ip_address, s.expires_at, s.created_at
FROM sessions_old s
WHERE s.user_id IN (SELECT id FROM users)
  AND s.expires_at > datetime('now');

-- Step 6: Drop old tables
DROP TABLE sessions_old;
DROP TABLE users_old;

-- Step 7: Re-create indexes
CREATE INDEX IF NOT EXISTS idx_users_email              ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id         ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token   ON sessions(refresh_token);

-- Step 8: Create password_resets table
CREATE TABLE IF NOT EXISTS password_resets (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token   ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
