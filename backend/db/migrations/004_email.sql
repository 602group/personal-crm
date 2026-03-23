-- Migration: Email accounts and messages
-- 004_email.sql

CREATE TABLE IF NOT EXISTS email_accounts (
  id              TEXT PRIMARY KEY,
  owner_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  provider        TEXT DEFAULT 'imap',   -- gmail | outlook | imap | yahoo
  imap_host       TEXT NOT NULL,
  imap_port       INTEGER DEFAULT 993,
  imap_secure     INTEGER DEFAULT 1,     -- 1=TLS, 0=plain
  username        TEXT NOT NULL,
  password        TEXT NOT NULL,          -- stored as-is (local app, no external exposure)
  status          TEXT DEFAULT 'active', -- active | error | syncing | paused
  error_message   TEXT,
  last_sync_at    TEXT,
  unread_count    INTEGER DEFAULT 0,
  color           TEXT DEFAULT '#6366f1',
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_messages (
  id             TEXT PRIMARY KEY,
  account_id     TEXT NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  uid            TEXT NOT NULL,
  message_id     TEXT,
  subject        TEXT DEFAULT '(no subject)',
  from_address   TEXT,
  from_name      TEXT,
  to_addresses   TEXT,                   -- JSON array of strings
  date           TEXT,
  body_preview   TEXT,
  body_text      TEXT,
  body_html      TEXT,
  is_read        INTEGER DEFAULT 0,
  is_starred     INTEGER DEFAULT 0,
  is_draft       INTEGER DEFAULT 0,
  folder         TEXT DEFAULT 'INBOX',
  labels         TEXT,                   -- JSON array
  fetched_at     TEXT NOT NULL,
  UNIQUE(account_id, uid, folder)
);

CREATE INDEX IF NOT EXISTS idx_email_messages_account ON email_messages(account_id, folder, date DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_read    ON email_messages(account_id, is_read);
