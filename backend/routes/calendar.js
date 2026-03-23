const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.use(authMiddleware);

const now = () => new Date().toISOString();

// ── helpers ──
function linkRow(row) { return row; }

// ═══════════════════════════════════════════════════════════
// LIST  GET /api/v1/calendar
// Query: start, end (ISO date strings), category, goal_id, project_id, task_id
// ═══════════════════════════════════════════════════════════
router.get('/', (req, res) => {
  const userId = req.user.id;
  const { start, end, category, goal_id, project_id, task_id, upcoming, limit } = req.query;

  const where  = ['e.owner_id = ?'];
  const params = [userId];

  if (start)      { where.push('e.start_at >= ?'); params.push(start); }
  if (end)        { where.push('e.start_at <= ?'); params.push(end); }
  if (category)   { where.push('e.category = ?');  params.push(category); }
  if (goal_id)    { where.push('e.goal_id = ?');   params.push(goal_id); }
  if (project_id) { where.push('e.project_id = ?'); params.push(project_id); }
  if (task_id)    { where.push('e.task_id = ?');   params.push(task_id); }

  if (upcoming === '1') {
    where.push("e.start_at >= datetime('now')");
  }

  const limitClause = Number(limit) > 0 ? `LIMIT ${Number(limit)}` : '';

  const events = db.prepare(`
    SELECT e.*,
           g.title AS goal_title,
           p.title AS project_title,
           t.title AS task_title
    FROM calendar_events e
    LEFT JOIN goals    g ON g.id = e.goal_id
    LEFT JOIN projects p ON p.id = e.project_id
    LEFT JOIN tasks    t ON t.id = e.task_id
    WHERE ${where.join(' AND ')}
    ORDER BY e.start_at ASC
    ${limitClause}
  `).all(...params);

  res.json({ events, total: events.length });
});

// ═══════════════════════════════════════════════════════════
// GET SINGLE  GET /api/v1/calendar/:id
// ═══════════════════════════════════════════════════════════
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const event = db.prepare(`
    SELECT e.*,
           g.title AS goal_title,
           p.title AS project_title,
           t.title AS task_title
    FROM calendar_events e
    LEFT JOIN goals    g ON g.id = e.goal_id
    LEFT JOIN projects p ON p.id = e.project_id
    LEFT JOIN tasks    t ON t.id = e.task_id
    WHERE e.id = ? AND e.owner_id = ?
  `).get(id, req.user.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json({ event });
});

// ═══════════════════════════════════════════════════════════
// CREATE  POST /api/v1/calendar
// ═══════════════════════════════════════════════════════════
router.post('/', (req, res) => {
  const userId = req.user.id;
  const {
    title, description = '', category = 'personal',
    start_at, end_at, is_all_day = 0, location = '',
    goal_id, project_id, task_id,
  } = req.body;

  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
  if (!start_at) return res.status(400).json({ error: 'Start date/time is required' });

  const id = uuidv4();
  const ts = now();

  db.prepare(`
    INSERT INTO calendar_events
      (id, title, description, category, start_at, end_at, is_all_day, location,
       goal_id, project_id, task_id, owner_id, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(id, title.trim(), description, category,
         start_at, end_at || null, is_all_day ? 1 : 0, location,
         goal_id || null, project_id || null, task_id || null, userId, ts, ts);

  const event = db.prepare('SELECT * FROM calendar_events WHERE id=?').get(id);
  res.status(201).json({ event });
});

// ═══════════════════════════════════════════════════════════
// UPDATE  PATCH /api/v1/calendar/:id
// ═══════════════════════════════════════════════════════════
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const event = db.prepare('SELECT * FROM calendar_events WHERE id=? AND owner_id=?').get(id, req.user.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const fields = ['title','description','category','start_at','end_at','is_all_day','location','goal_id','project_id','task_id'];
  const updates = [];
  const params  = [];

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      // Convert empty string to null for nullable FK fields
      const val = (f === 'goal_id' || f === 'project_id' || f === 'task_id') && req.body[f] === ''
        ? null : req.body[f];
      params.push(f === 'is_all_day' ? (req.body[f] ? 1 : 0) : val);
    }
  }

  if (updates.length) {
    updates.push('updated_at = ?'); params.push(now()); params.push(id);
    db.prepare(`UPDATE calendar_events SET ${updates.join(', ')} WHERE id=?`).run(...params);
  }

  const updated = db.prepare('SELECT * FROM calendar_events WHERE id=?').get(id);
  res.json({ event: updated });
});

// ═══════════════════════════════════════════════════════════
// DELETE  DELETE /api/v1/calendar/:id
// ═══════════════════════════════════════════════════════════
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const event = db.prepare('SELECT id FROM calendar_events WHERE id=? AND owner_id=?').get(id, req.user.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  db.prepare('DELETE FROM calendar_events WHERE id=?').run(id);
  res.json({ success: true });
});

module.exports = router;
