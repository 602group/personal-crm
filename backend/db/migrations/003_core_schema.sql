-- =============================================================
-- Migration 003: Phase 1 Core Data Schema
-- Goals, Projects, Tasks, Notes, Calendar Events,
-- Income, Expenses, Notifications, Tags, Relationships
-- =============================================================

-- =============================================================
-- GOALS
-- Strategic objectives. The top of the hierarchy.
-- =============================================================
CREATE TABLE IF NOT EXISTS goals (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT,
  category     TEXT NOT NULL DEFAULT 'personal'
               CHECK(category IN ('personal','business','financial','health','learning','other')),
  status       TEXT NOT NULL DEFAULT 'not_started'
               CHECK(status IN ('not_started','in_progress','completed','on_hold','archived')),
  priority     TEXT NOT NULL DEFAULT 'medium'
               CHECK(priority IN ('low','medium','high')),
  start_date   TEXT,
  target_date  TEXT,
  progress     INTEGER NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100),
  owner_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  archived_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_goals_owner_id    ON goals(owner_id);
CREATE INDEX IF NOT EXISTS idx_goals_status      ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_target_date ON goals(target_date);

-- =============================================================
-- PROJECTS
-- Structured bodies of work. Support one or more goals.
-- =============================================================
CREATE TABLE IF NOT EXISTS projects (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT,
  category     TEXT NOT NULL DEFAULT 'personal'
               CHECK(category IN ('personal','business','creative','research','other')),
  status       TEXT NOT NULL DEFAULT 'planning'
               CHECK(status IN ('planning','active','paused','completed','archived')),
  priority     TEXT NOT NULL DEFAULT 'medium'
               CHECK(priority IN ('low','medium','high')),
  start_date   TEXT,
  target_date  TEXT,
  progress     INTEGER NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100),
  owner_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  archived_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_projects_owner_id    ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status      ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_target_date ON projects(target_date);

-- =============================================================
-- GOAL ↔ PROJECT  (M:M)
-- A goal may span multiple projects; a project may serve multiple goals.
-- =============================================================
CREATE TABLE IF NOT EXISTS goal_projects (
  goal_id    TEXT NOT NULL REFERENCES goals(id)    ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (goal_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_goal_projects_project ON goal_projects(project_id);

-- =============================================================
-- TASKS
-- Core execution layer. Belong to projects; contribute to goals.
-- =============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id                   TEXT PRIMARY KEY,
  title                TEXT NOT NULL,
  description          TEXT,
  status               TEXT NOT NULL DEFAULT 'todo'
                       CHECK(status IN ('todo','in_progress','waiting','completed','archived')),
  priority             TEXT NOT NULL DEFAULT 'medium'
                       CHECK(priority IN ('low','medium','high','critical')),
  due_date             TEXT,
  start_date           TEXT,
  completed_at         TEXT,
  archived_at          TEXT,
  -- Primary project link (direct FK; most tasks live inside exactly one project)
  project_id           TEXT REFERENCES projects(id) ON DELETE SET NULL,
  owner_id             TEXT REFERENCES users(id)    ON DELETE SET NULL,
  -- Recurrence stubs (populated when recurring tasks feature is built)
  is_recurring         INTEGER NOT NULL DEFAULT 0,
  recurrence_rule      TEXT,     -- RFC 5545 RRULE string e.g. 'FREQ=WEEKLY;BYDAY=MO'
  recurrence_parent_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  -- Display ordering within a project or standalone list
  sort_order           INTEGER NOT NULL DEFAULT 0,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_owner_id   ON tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status     ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date   ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_priority   ON tasks(priority);

-- =============================================================
-- GOAL ↔ TASK  (M:M)
-- A task may contribute to multiple goals.
-- =============================================================
CREATE TABLE IF NOT EXISTS goal_tasks (
  goal_id    TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  task_id    TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (goal_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_goal_tasks_task ON goal_tasks(task_id);

-- =============================================================
-- NOTES
-- Knowledge and capture layer. Links optionally to goal/project/task.
-- =============================================================
CREATE TABLE IF NOT EXISTS notes (
  id          TEXT PRIMARY KEY,
  title       TEXT,
  content     TEXT,
  category    TEXT NOT NULL DEFAULT 'other'
              CHECK(category IN ('idea','meeting','journal','research','business','personal','strategy','other')),
  status      TEXT NOT NULL DEFAULT 'active'
              CHECK(status IN ('active','archived')),
  -- Optional context links (all nullable)
  goal_id     TEXT REFERENCES goals(id)    ON DELETE SET NULL,
  project_id  TEXT REFERENCES projects(id) ON DELETE SET NULL,
  task_id     TEXT REFERENCES tasks(id)    ON DELETE SET NULL,
  owner_id    TEXT REFERENCES users(id)    ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_notes_owner_id   ON notes(owner_id);
CREATE INDEX IF NOT EXISTS idx_notes_goal_id    ON notes(goal_id);
CREATE INDEX IF NOT EXISTS idx_notes_project_id ON notes(project_id);
CREATE INDEX IF NOT EXISTS idx_notes_task_id    ON notes(task_id);
CREATE INDEX IF NOT EXISTS idx_notes_status     ON notes(status);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);

-- =============================================================
-- CALENDAR EVENTS
-- Time-bound records with optional links to tasks/goals/projects.
-- =============================================================
CREATE TABLE IF NOT EXISTS calendar_events (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT NOT NULL DEFAULT 'personal'
              CHECK(category IN ('business','personal','meeting','health','travel','deadline','other')),
  start_at    TEXT NOT NULL,   -- ISO 8601 datetime or date
  end_at      TEXT,
  is_all_day  INTEGER NOT NULL DEFAULT 0,
  location    TEXT,
  -- Optional context links
  goal_id     TEXT REFERENCES goals(id)    ON DELETE SET NULL,
  project_id  TEXT REFERENCES projects(id) ON DELETE SET NULL,
  task_id     TEXT REFERENCES tasks(id)    ON DELETE SET NULL,
  owner_id    TEXT REFERENCES users(id)    ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_owner_id   ON calendar_events(owner_id);
CREATE INDEX IF NOT EXISTS idx_events_start_at   ON calendar_events(start_at);
CREATE INDEX IF NOT EXISTS idx_events_goal_id    ON calendar_events(goal_id);
CREATE INDEX IF NOT EXISTS idx_events_project_id ON calendar_events(project_id);
CREATE INDEX IF NOT EXISTS idx_events_task_id    ON calendar_events(task_id);

-- =============================================================
-- INCOME RECORDS
-- Money in. Simple for Phase 1; expansion-ready for reporting.
-- =============================================================
CREATE TABLE IF NOT EXISTS income_records (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  amount      REAL NOT NULL CHECK(amount >= 0),
  category    TEXT NOT NULL DEFAULT 'other'
              CHECK(category IN ('salary','business','investment','refund','other')),
  date        TEXT NOT NULL,  -- ISO date YYYY-MM-DD
  project_id  TEXT REFERENCES projects(id) ON DELETE SET NULL,
  owner_id    TEXT REFERENCES users(id)    ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_income_owner_id   ON income_records(owner_id);
CREATE INDEX IF NOT EXISTS idx_income_date       ON income_records(date);
CREATE INDEX IF NOT EXISTS idx_income_category   ON income_records(category);
CREATE INDEX IF NOT EXISTS idx_income_project_id ON income_records(project_id);

-- =============================================================
-- EXPENSE RECORDS
-- Money out. Receipt URL placeholder for future file attachments.
-- =============================================================
CREATE TABLE IF NOT EXISTS expense_records (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  amount      REAL NOT NULL CHECK(amount >= 0),
  category    TEXT NOT NULL DEFAULT 'other'
              CHECK(category IN ('housing','food','transportation','business','software','subscriptions','travel','health','other')),
  date        TEXT NOT NULL,  -- ISO date YYYY-MM-DD
  receipt_url TEXT,           -- placeholder for future file attachment
  project_id  TEXT REFERENCES projects(id) ON DELETE SET NULL,
  owner_id    TEXT REFERENCES users(id)    ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_expense_owner_id   ON expense_records(owner_id);
CREATE INDEX IF NOT EXISTS idx_expense_date       ON expense_records(date);
CREATE INDEX IF NOT EXISTS idx_expense_category   ON expense_records(category);
CREATE INDEX IF NOT EXISTS idx_expense_project_id ON expense_records(project_id);

-- =============================================================
-- NOTIFICATIONS
-- Stored notification records. Supports history, AI alerts, and future push.
-- related_record_id is a soft reference (no FK) for polymorphic linking.
-- =============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id                TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  message           TEXT,
  type              TEXT NOT NULL DEFAULT 'system'
                    CHECK(type IN ('reminder','warning','system','task_due','task_overdue','goal_deadline','event_reminder')),
  related_module    TEXT,  -- 'goals' | 'projects' | 'tasks' | 'notes' | 'calendar_events' | etc.
  related_record_id TEXT,  -- soft reference — the ID of the related record
  status            TEXT NOT NULL DEFAULT 'unread'
                    CHECK(status IN ('unread','read','archived')),
  recipient_id      TEXT REFERENCES users(id) ON DELETE CASCADE,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  read_at           TEXT
);

CREATE INDEX IF NOT EXISTS idx_notif_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notif_status    ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notif_type      ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notif_created   ON notifications(created_at);

-- =============================================================
-- TAGS
-- User-defined labels for flexible cross-module organization.
-- =============================================================
CREATE TABLE IF NOT EXISTS tags (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#6366f1',  -- hex color for UI badge
  owner_id   TEXT REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(name, owner_id)  -- tag names unique per user
);

CREATE INDEX IF NOT EXISTS idx_tags_owner ON tags(owner_id);

-- =============================================================
-- RECORD TAGS  (polymorphic junction)
-- Applies tags to goals, projects, tasks, notes, or events.
-- record_type: 'goal' | 'project' | 'task' | 'note' | 'event'
-- =============================================================
CREATE TABLE IF NOT EXISTS record_tags (
  id          TEXT PRIMARY KEY,
  tag_id      TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL
              CHECK(record_type IN ('goal','project','task','note','event')),
  record_id   TEXT NOT NULL,  -- ID of the tagged entity
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tag_id, record_type, record_id)
);

CREATE INDEX IF NOT EXISTS idx_record_tags_tag    ON record_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_record_tags_record ON record_tags(record_type, record_id);
