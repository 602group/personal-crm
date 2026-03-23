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
  const tasks = db.prepare(`SELECT * FROM epic_tasks WHERE owner_id=? ORDER BY created_at DESC`).all(req.user.id);
  res.json({ tasks });
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
