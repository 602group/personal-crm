const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { v4: uuidv4 }    = require('uuid');

router.use(authMiddleware);

const now = () => new Date().toISOString();

// ── Generate smart notifications (overdue tasks, today's tasks, upcoming events) ──
function generateNotifications(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const nextWeek  = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const ts = now();

  // Overdue tasks — not already in notifications
  const overdueTasks = db.prepare(`
    SELECT id, title FROM tasks
    WHERE owner_id=? AND status NOT IN ('completed','archived')
    AND due_date IS NOT NULL AND due_date < ?
  `).all(userId, today);

  for (const t of overdueTasks) {
    const exists = db.prepare(`SELECT id FROM notifications WHERE recipient_id=? AND related_record_id=? AND type='task_overdue' AND status='unread'`).get(userId, t.id);
    if (!exists) {
      db.prepare(`INSERT INTO notifications (id,title,message,type,related_module,related_record_id,status,recipient_id,created_at)
        VALUES (?,?,?,'task_overdue','tasks',?,'unread',?,?)`)
        .run(uuidv4(), `Overdue: ${t.title}`, `Task "${t.title}" is past its due date.`, t.id, userId, ts);
    }
  }

  // Tasks due today
  const todayTasks = db.prepare(`
    SELECT id, title FROM tasks
    WHERE owner_id=? AND status NOT IN ('completed','archived') AND due_date=?
  `).all(userId, today);

  for (const t of todayTasks) {
    const exists = db.prepare(`SELECT id FROM notifications WHERE recipient_id=? AND related_record_id=? AND type='task_due' AND status='unread'`).get(userId, t.id);
    if (!exists) {
      db.prepare(`INSERT INTO notifications (id,title,message,type,related_module,related_record_id,status,recipient_id,created_at)
        VALUES (?,?,?,'task_due','tasks',?,'unread',?,?)`)
        .run(uuidv4(), `Due Today: ${t.title}`, `Task "${t.title}" is due today.`, t.id, userId, ts);
    }
  }

  // Upcoming events (next 7 days)
  const events = db.prepare(`
    SELECT id, title, start_at FROM calendar_events
    WHERE owner_id=? AND start_at>=? AND start_at<=?
    ORDER BY start_at ASC LIMIT 5
  `).all(userId, today + 'T00:00', nextWeek + 'T23:59');

  for (const e of events) {
    const exists = db.prepare(`SELECT id FROM notifications WHERE recipient_id=? AND related_record_id=? AND type='event_reminder' AND status='unread'`).get(userId, e.id);
    if (!exists) {
      const dateLabel = e.start_at.slice(0, 10) === today ? 'today' : `on ${e.start_at.slice(0,10)}`;
      db.prepare(`INSERT INTO notifications (id,title,message,type,related_module,related_record_id,status,recipient_id,created_at)
        VALUES (?,?,?,'event_reminder','calendar_events',?,'unread',?,?)`)
        .run(uuidv4(), `Event: ${e.title}`, `"${e.title}" is scheduled ${dateLabel}.`, e.id, userId, ts);
    }
  }

  // Goal deadlines approaching (within 7 days)
  const goals = db.prepare(`
    SELECT id, title FROM goals
    WHERE owner_id=? AND status NOT IN ('completed','archived')
    AND target_date IS NOT NULL AND target_date>=? AND target_date<=?
  `).all(userId, today, nextWeek);

  for (const g of goals) {
    const exists = db.prepare(`SELECT id FROM notifications WHERE recipient_id=? AND related_record_id=? AND type='goal_deadline' AND status='unread'`).get(userId, g.id);
    if (!exists) {
      db.prepare(`INSERT INTO notifications (id,title,message,type,related_module,related_record_id,status,recipient_id,created_at)
        VALUES (?,?,?,'goal_deadline','goals',?,'unread',?,?)`)
        .run(uuidv4(), `Goal Deadline: ${g.title}`, `Goal "${g.title}" has a deadline coming up.`, g.id, userId, ts);
    }
  }
}

// ── LIST  GET /api/v1/notifications?status=unread&limit=20 ──
router.get('/', (req, res) => {
  const userId = req.user.id;
  generateNotifications(userId);

  const status = req.query.status || 'unread';
  const limit  = Math.min(Number(req.query.limit) || 30, 100);

  const where  = ['recipient_id=?'];
  const params = [userId];
  if (status !== 'all') { where.push('status=?'); params.push(status); }

  const items = db.prepare(`
    SELECT * FROM notifications WHERE ${where.join(' AND ')}
    ORDER BY created_at DESC LIMIT ${limit}
  `).all(...params);

  const unreadCount = db.prepare(`SELECT COUNT(*) AS c FROM notifications WHERE recipient_id=? AND status='unread'`).get(userId).c;

  res.json({ notifications: items, unreadCount });
});

// ── MARK ALL READ  PATCH /api/v1/notifications/read-all ──
router.patch('/read-all', (req, res) => {
  db.prepare(`UPDATE notifications SET status='read', read_at=? WHERE recipient_id=? AND status='unread'`)
    .run(now(), req.user.id);
  res.json({ success: true });
});

// ── MARK READ  PATCH /api/v1/notifications/:id/read ──
router.patch('/:id/read', (req, res) => {
  db.prepare(`UPDATE notifications SET status='read', read_at=? WHERE id=? AND recipient_id=?`)
    .run(now(), req.params.id, req.user.id);
  res.json({ success: true });
});

module.exports = router;
