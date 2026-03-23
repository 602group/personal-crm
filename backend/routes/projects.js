const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.use(authMiddleware);

const now = () => new Date().toISOString();

// ═══════════════════════════════════════════════════════════
// LIST  GET /api/v1/projects
// ═══════════════════════════════════════════════════════════
router.get('/', (req, res) => {
  const userId = req.user.id;
  const { status, category, priority, sort = 'created_at', dir = 'desc', search } = req.query;

  const allowed = { created_at:1, updated_at:1, target_date:1, start_date:1, title:1, progress:1 };
  const sortCol = allowed[sort] ? sort : 'created_at';
  const sortDir = dir === 'asc' ? 'ASC' : 'DESC';

  let where  = ['p.owner_id = ?'];
  let params = [userId];

  if (status)   { where.push('p.status = ?');   params.push(status); }
  if (category) { where.push('p.category = ?'); params.push(category); }
  if (priority) { where.push('p.priority = ?'); params.push(priority); }
  if (search)   { where.push('p.title LIKE ?'); params.push(`%${search}%`); }

  const projects = db.prepare(`
    SELECT p.*,
           COUNT(DISTINCT t.id)  AS task_count,
           COUNT(DISTINCT n.id)  AS note_count,
           COUNT(DISTINCT gp.goal_id) AS goal_count
    FROM projects p
    LEFT JOIN tasks t  ON t.project_id = p.id AND t.status NOT IN ('completed','archived')
    LEFT JOIN notes n  ON n.project_id = p.id AND n.status = 'active'
    LEFT JOIN goal_projects gp ON gp.project_id = p.id
    WHERE ${where.join(' AND ')}
    GROUP BY p.id
    ORDER BY p.${sortCol} ${sortDir}
  `).all(...params);

  res.json({ projects, total: projects.length });
});

// ═══════════════════════════════════════════════════════════
// GET SINGLE  GET /api/v1/projects/:id
// ═══════════════════════════════════════════════════════════
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND owner_id = ?').get(id, userId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const tasks = db.prepare(`
    SELECT id, title, status, priority, due_date
    FROM tasks
    WHERE project_id = ?
    ORDER BY
      CASE status WHEN 'completed' THEN 1 WHEN 'archived' THEN 2 ELSE 0 END,
      CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      due_date ASC NULLS LAST
  `).all(id);

  const notes = db.prepare(`
    SELECT id, title, category, updated_at, content
    FROM notes
    WHERE project_id = ? AND status = 'active'
    ORDER BY updated_at DESC
    LIMIT 10
  `).all(id);

  const goals = db.prepare(`
    SELECT g.id, g.title, g.status, g.progress, g.category
    FROM goals g
    JOIN goal_projects gp ON gp.goal_id = g.id
    WHERE gp.project_id = ?
    ORDER BY g.title
  `).all(id);

  // Task completion stats
  const total     = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const taskStats = { total, completed, pct: total ? Math.round((completed / total) * 100) : 0 };

  res.json({ project, tasks, notes, goals, taskStats });
});

// ═══════════════════════════════════════════════════════════
// CREATE  POST /api/v1/projects
// ═══════════════════════════════════════════════════════════
router.post('/', (req, res) => {
  const userId = req.user.id;
  const {
    title, description = '', category = 'business', status = 'planning',
    priority = 'medium', start_date, target_date, progress = 0,
  } = req.body;

  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

  const id = uuidv4();
  const ts = now();

  db.prepare(`
    INSERT INTO projects
      (id, title, description, category, status, priority, start_date, target_date, progress, owner_id, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(id, title.trim(), description, category, status, priority,
         start_date || null, target_date || null,
         Math.min(100, Math.max(0, Number(progress) || 0)), userId, ts, ts);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  res.status(201).json({ project });
});

// ═══════════════════════════════════════════════════════════
// UPDATE  PATCH /api/v1/projects/:id
// ═══════════════════════════════════════════════════════════
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND owner_id = ?').get(id, userId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const fields = ['title','description','category','status','priority','start_date','target_date','progress'];
  const updates = [];
  const params  = [];

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      let val = req.body[field];
      if (field === 'progress') val = Math.min(100, Math.max(0, Number(val) || 0));
      params.push(val === '' ? null : val);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });

  const ts = now();
  updates.push('updated_at = ?'); params.push(ts);
  if (req.body.status === 'completed' && project.status !== 'completed') {
    updates.push('completed_at = ?'); params.push(ts);
    if (req.body.progress === undefined) { updates.push('progress = ?'); params.push(100); }
  }
  if (req.body.status === 'archived' && project.status !== 'archived') {
    updates.push('archived_at = ?'); params.push(ts);
  }

  params.push(id);
  db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  res.json({ project: updated });
});

// ═══════════════════════════════════════════════════════════
// DELETE  DELETE /api/v1/projects/:id
// ═══════════════════════════════════════════════════════════
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND owner_id = ?').get(id, userId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  res.json({ success: true });
});

module.exports = router;
