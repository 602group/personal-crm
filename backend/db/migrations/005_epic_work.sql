-- Migration: Epic Work (Tasks and Links)
-- 005_epic_work.sql

CREATE TABLE IF NOT EXISTS epic_tasks (
  id          TEXT PRIMARY KEY,
  owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT DEFAULT 'todo', -- todo | in_progress | review | done
  priority    TEXT DEFAULT 'medium', -- low | medium | high | urgent
  due_date    TEXT,
  project_id  TEXT REFERENCES projects(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS epic_links (
  id          TEXT PRIMARY KEY,
  owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  url         TEXT NOT NULL,
  category    TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_epic_tasks_owner ON epic_tasks(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_epic_links_owner ON epic_links(owner_id, category);
