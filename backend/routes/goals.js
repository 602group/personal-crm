const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// All routes require authentication
router.use(authMiddleware);

// ── Helpers ─────────────────────────────────────────────────
const now = () => new Date().toISOString();

// ═══════════════════════════════════════════════════════════
// LIST  GET /api/v1/goals
// Query params: status, category, priority, sort, dir, search
// ═══════════════════════════════════════════════════════════
router.get('/', (req, res) => {
  const userId = req.user.id;
  const { status, category, priority, sort = 'created_at', dir = 'desc', search } = req.query;

  const allowed = { created_at:1, updated_at:1, target_date:1, title:1, progress:1 };
  const sortCol = allowed[sort] ? sort : 'created_at';
  const sortDir = dir === 'asc' ? 'ASC' : 'DESC';

  let where = ['g.owner_id = ?'];
  let params = [userId];

  if (status)   { where.push('g.status = ?');   params.push(status); }
  if (category) { where.push('g.category = ?'); params.push(category); }
  if (priority) { where.push('g.priority = ?'); params.push(priority); }
  if (search)   { where.push('g.title LIKE ?'); params.push(`%${search}%`); }

  const whereStr = where.join(' AND ');

  const goals = db.prepare(`
    SELECT g.*,
           COUNT(DISTINCT gp.project_id) AS project_count,
           COUNT(DISTINCT gt.task_id)    AS task_count,
           COUNT(DISTINCT n.id)          AS note_count
    FROM goals g
    LEFT JOIN goal_projects gp ON gp.goal_id = g.id
    LEFT JOIN goal_tasks    gt ON gt.goal_id = g.id
    LEFT JOIN notes         n  ON n.goal_id  = g.id AND n.status = 'active'
    WHERE ${whereStr}
    GROUP BY g.id
    ORDER BY g.${sortCol} ${sortDir}
  `).all(...params);

  res.json({ goals, total: goals.length });
});

// ═══════════════════════════════════════════════════════════
// GET SINGLE  GET /api/v1/goals/:id
// ═══════════════════════════════════════════════════════════
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const goal = db.prepare(`SELECT * FROM goals WHERE id = ? AND owner_id = ?`).get(id, userId);
  if (!goal) return res.status(404).json({ error: 'Goal not found' });

  // Linked projects
  const projects = db.prepare(`
    SELECT p.id, p.title, p.status, p.progress, p.category, p.target_date
    FROM projects p
    JOIN goal_projects gp ON gp.project_id = p.id
    WHERE gp.goal_id = ?
    ORDER BY p.title
  `).all(id);

  // Linked tasks
  const tasks = db.prepare(`
    SELECT t.id, t.title, t.status, t.priority, t.due_date
    FROM tasks t
    JOIN goal_tasks gt ON gt.task_id = t.id
    WHERE gt.goal_id = ?
    ORDER BY t.due_date ASC NULLS LAST, t.title
  `).all(id);

  // Linked notes
  const notes = db.prepare(`
    SELECT id, title, category, updated_at, content
    FROM notes
    WHERE goal_id = ? AND status = 'active'
    ORDER BY updated_at DESC
    LIMIT 10
  `).all(id);

  res.json({ goal, projects, tasks, notes });
});

// ═══════════════════════════════════════════════════════════
// CREATE  POST /api/v1/goals
// ═══════════════════════════════════════════════════════════
router.post('/', (req, res) => {
  const userId = req.user.id;
  const {
    title, description = '', category = 'personal', status = 'not_started',
    priority = 'medium', start_date, target_date, progress = 0,
  } = req.body;

  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

  const id = uuidv4();
  const ts = now();

  db.prepare(`
    INSERT INTO goals
      (id, title, description, category, status, priority, start_date, target_date, progress, owner_id, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(id, title.trim(), description, category, status, priority,
         start_date || null, target_date || null, Math.min(100, Math.max(0, Number(progress) || 0)),
         userId, ts, ts);

  const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
  res.status(201).json({ goal });
});

// ═══════════════════════════════════════════════════════════
// UPDATE  PATCH /api/v1/goals/:id
// ═══════════════════════════════════════════════════════════
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const goal = db.prepare('SELECT * FROM goals WHERE id = ? AND owner_id = ?').get(id, userId);
  if (!goal) return res.status(404).json({ error: 'Goal not found' });

  const fields = ['title', 'description', 'category', 'status', 'priority',
                  'start_date', 'target_date', 'progress'];
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

  // Handle completion/archive timestamps
  const ts = now();
  updates.push('updated_at = ?');
  params.push(ts);

  if (req.body.status === 'completed' && goal.status !== 'completed') {
    updates.push('completed_at = ?');
    params.push(ts);
    // Auto-set progress to 100 on completion
    if (req.body.progress === undefined) { updates.push('progress = ?'); params.push(100); }
  }
  if (req.body.status === 'archived' && goal.status !== 'archived') {
    updates.push('archived_at = ?');
    params.push(ts);
  }

  params.push(id);
  db.prepare(`UPDATE goals SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
  res.json({ goal: updated });
});

// ═══════════════════════════════════════════════════════════
// DELETE  DELETE /api/v1/goals/:id  (hard delete — use PATCH status=archived normally)
// ═══════════════════════════════════════════════════════════
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const goal = db.prepare('SELECT id FROM goals WHERE id = ? AND owner_id = ?').get(id, userId);
  if (!goal) return res.status(404).json({ error: 'Goal not found' });
  db.prepare('DELETE FROM goals WHERE id = ?').run(id);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════
// LINK / UNLINK PROJECTS
// POST   /api/v1/goals/:id/projects      { projectId }
// DELETE /api/v1/goals/:id/projects/:pid
// ═══════════════════════════════════════════════════════════
router.post('/:id/projects', (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { projectId } = req.body;
  if (!projectId) return res.status(400).json({ error: 'projectId required' });

  const goal    = db.prepare('SELECT id FROM goals    WHERE id=? AND owner_id=?').get(id, userId);
  const project = db.prepare('SELECT id FROM projects WHERE id=? AND owner_id=?').get(projectId, userId);
  if (!goal || !project) return res.status(404).json({ error: 'Goal or project not found' });

  db.prepare(`INSERT OR IGNORE INTO goal_projects (goal_id, project_id) VALUES (?,?)`)
    .run(id, projectId);
  res.json({ success: true });
});

router.delete('/:id/projects/:pid', (req, res) => {
  const { id, pid } = req.params;
  db.prepare('DELETE FROM goal_projects WHERE goal_id=? AND project_id=?').run(id, pid);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════
// LINK / UNLINK TASKS
// POST   /api/v1/goals/:id/tasks      { taskId }
// DELETE /api/v1/goals/:id/tasks/:tid
// ═══════════════════════════════════════════════════════════
router.post('/:id/tasks', (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { taskId } = req.body;
  if (!taskId) return res.status(400).json({ error: 'taskId required' });

  const goal = db.prepare('SELECT id FROM goals WHERE id=? AND owner_id=?').get(id, userId);
  const task = db.prepare('SELECT id FROM tasks WHERE id=? AND owner_id=?').get(taskId, userId);
  if (!goal || !task) return res.status(404).json({ error: 'Goal or task not found' });

  db.prepare(`INSERT OR IGNORE INTO goal_tasks (goal_id, task_id) VALUES (?,?)`).run(id, taskId);
  res.json({ success: true });
});

router.delete('/:id/tasks/:tid', (req, res) => {
  const { id, tid } = req.params;
  db.prepare('DELETE FROM goal_tasks WHERE goal_id=? AND task_id=?').run(id, tid);
  res.json({ success: true });
});

module.exports = router;
