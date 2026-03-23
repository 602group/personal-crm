const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { v4: uuidv4 }     = require('uuid');

router.use(authMiddleware);
const now = () => new Date().toISOString();

// ═════════════════════════════════════════════════════════
// EPIC TASKS
// ═════════════════════════════════════════════════════════

router.get('/tasks', (req, res) => {
  const userId = req.user.id;
  const {
    status, priority, project_id,
    view, sort = 'due_date', dir = 'asc', search,
  } = req.query;

  const allowed = { due_date: 1, created_at: 1, updated_at: 1, priority: 1, title: 1 };
  const sortCol = allowed[sort] ? sort : 'due_date';
  const sortExpr = sortCol === 'priority'
    ? `CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END`
    : `t.${sortCol}`;
  const sortDir = dir === 'desc' ? 'DESC' : 'ASC';

  let where = ['t.owner_id = ?'];
  let params = [userId];

  if (view === 'completed') {
    where.push(`t.status = 'done'`);
  } else {
    // Default: exclude completed unless explicitly filtered
    if (!status) where.push(`t.status != 'done'`);
  }

  if (status && !view)  { where.push('t.status = ?');     params.push(status); }
  if (priority)         { where.push('t.priority = ?');   params.push(priority); }
  if (project_id)       { where.push('t.project_id = ?'); params.push(project_id); }
  if (search)           { where.push('t.title LIKE ?');   params.push(`%${search}%`); }

  const tasks = db.prepare(`
    SELECT t.*, p.title AS project_title
    FROM epic_tasks t
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE ${where.join(' AND ')}
    ORDER BY ${sortExpr} ${sortDir} NULLS LAST, t.created_at ASC
  `).all(...params);

  res.json({ tasks, total: tasks.length });
});

router.post('/tasks', (req, res) => {
  const { title, description, status='todo', priority='medium', due_date, project_id } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const id = uuidv4(), ts = now();
  db.prepare(`
    INSERT INTO epic_tasks (id, owner_id, title, description, status, priority, due_date, project_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.user.id, title, description||null, status, priority, due_date||null, project_id||null, ts, ts);
  res.status(201).json({ task: db.prepare('SELECT * FROM epic_tasks WHERE id=?').get(id) });
});

router.patch('/tasks/:id', (req, res) => {
  const { id } = req.params;
  const task = db.prepare('SELECT id FROM epic_tasks WHERE id=? AND owner_id=?').get(id, req.user.id);
  if (!task) return res.status(404).json({ error: 'Not found' });

  const fields = ['title', 'description', 'status', 'priority', 'due_date', 'project_id'];
  const upd = [], p = [];
  for (const f of fields) { if (req.body[f] !== undefined) { upd.push(`${f}=?`); p.push(req.body[f]); } }
  if (upd.length) {
    upd.push('updated_at=?'); p.push(now(), id);
    db.prepare(`UPDATE epic_tasks SET ${upd.join(', ')} WHERE id=?`).run(...p);
  }
  res.json({ task: db.prepare('SELECT * FROM epic_tasks WHERE id=?').get(id) });
});

router.delete('/tasks/:id', (req, res) => {
  const { id } = req.params;
  const info = db.prepare('DELETE FROM epic_tasks WHERE id=? AND owner_id=?').run(id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});


// ═════════════════════════════════════════════════════════
// EPIC LINKS
// ═════════════════════════════════════════════════════════

router.get('/links', (req, res) => {
  const links = db.prepare(`SELECT * FROM epic_links WHERE owner_id=? ORDER BY created_at DESC`).all(req.user.id);
  res.json({ links });
});

router.post('/links', (req, res) => {
  const { title, url, category } = req.body;
  if (!title || !url) return res.status(400).json({ error: 'Title and URL are required' });
  let finalUrl = url;
  if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
    finalUrl = 'https://' + finalUrl;
  }
  const id = uuidv4(), ts = now();
  db.prepare(`
    INSERT INTO epic_links (id, owner_id, title, url, category, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.user.id, title, finalUrl, category||null, ts, ts);
  res.status(201).json({ link: db.prepare('SELECT * FROM epic_links WHERE id=?').get(id) });
});

router.patch('/links/:id', (req, res) => {
  const { id } = req.params;
  const link = db.prepare('SELECT id FROM epic_links WHERE id=? AND owner_id=?').get(id, req.user.id);
  if (!link) return res.status(404).json({ error: 'Not found' });

  const fields = ['title', 'url', 'category'];
  const upd = [], p = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      let val = req.body[f];
      if (f === 'url' && val && !val.startsWith('http://') && !val.startsWith('https://')) { val = 'https://' + val; }
      upd.push(`${f}=?`); p.push(val);
    }
  }
  if (upd.length) {
    upd.push('updated_at=?'); p.push(now(), id);
    db.prepare(`UPDATE epic_links SET ${upd.join(', ')} WHERE id=?`).run(...p);
  }
  res.json({ link: db.prepare('SELECT * FROM epic_links WHERE id=?').get(id) });
});

router.delete('/links/:id', (req, res) => {
  const { id } = req.params;
  const info = db.prepare('DELETE FROM epic_links WHERE id=? AND owner_id=?').run(id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
