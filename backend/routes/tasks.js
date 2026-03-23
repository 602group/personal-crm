const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.use(authMiddleware);

const now = () => new Date().toISOString();
const todayISO = () => new Date().toISOString().slice(0, 10);

// ═══════════════════════════════════════════════════════════
// LIST  GET /api/v1/tasks
// Query: status, priority, project_id, goal_id, view(today|overdue|week|completed), sort, dir, search
// ═══════════════════════════════════════════════════════════
router.get('/', (req, res) => {
  const userId = req.user.id;
  const {
    status, priority, project_id, goal_id,
    view, sort = 'due_date', dir = 'asc', search,
  } = req.query;

  const allowed = { due_date:1, created_at:1, updated_at:1, priority:1, title:1 };
  const sortCol = allowed[sort] ? sort : 'due_date';
  // For priority sort use a CASE expression
  const sortExpr = sortCol === 'priority'
    ? `CASE t.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END`
    : `t.${sortCol}`;
  const sortDir = dir === 'desc' ? 'DESC' : 'ASC';

  let where  = ['t.owner_id = ?'];
  let params = [userId];

  // Special views
  const today = todayISO();
  if (view === 'today') {
    where.push(`(t.due_date = ? OR (t.due_date < ? AND t.status NOT IN ('completed','archived')))`);
    params.push(today, today);
  } else if (view === 'overdue') {
    where.push(`t.due_date < ? AND t.status NOT IN ('completed','archived')`);
    params.push(today);
  } else if (view === 'week') {
    const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().slice(0,10);
    where.push(`t.due_date BETWEEN ? AND ? AND t.status NOT IN ('completed','archived')`);
    params.push(today, weekEnd);
  } else if (view === 'completed') {
    where.push(`t.status = 'completed'`);
  } else {
    // Default: exclude completed and archived unless explicitly filtered
    if (!status) where.push(`t.status NOT IN ('completed', 'archived')`);
  }

  if (status && !view)  { where.push('t.status = ?');     params.push(status); }
  if (priority)         { where.push('t.priority = ?');   params.push(priority); }
  if (project_id)       { where.push('t.project_id = ?'); params.push(project_id); }
  if (search)           { where.push('t.title LIKE ?');   params.push(`%${search}%`); }

  let joinGoal = '';
  if (goal_id) {
    joinGoal = `JOIN goal_tasks gt ON gt.task_id = t.id AND gt.goal_id = ?`;
    params.unshift(goal_id); // needs to come before other params
    where = ['t.owner_id = ?', ...(where.slice(1))]; // keep owner filter
    params = [userId, goal_id, ...params.slice(2)];
  }

  // Simpler approach without goal_id join complexity:
  const tasks = db.prepare(`
    SELECT t.*,
           p.title AS project_title,
           (SELECT GROUP_CONCAT(g.title, ', ')
            FROM goals g JOIN goal_tasks gt ON gt.goal_id = g.id WHERE gt.task_id = t.id
            LIMIT 2) AS goal_titles
    FROM tasks t
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE ${where.join(' AND ')}
    ORDER BY ${sortExpr} ${sortDir} NULLS LAST, t.created_at ASC
  `).all(...params);

  // Count overdue for badges
  const overdueCount = db.prepare(
    `SELECT COUNT(*) AS cnt FROM tasks WHERE owner_id=? AND due_date < ? AND status NOT IN ('completed','archived')`
  ).get(userId, today)?.cnt || 0;
  const todayCount = db.prepare(
    `SELECT COUNT(*) AS cnt FROM tasks WHERE owner_id=? AND due_date=? AND status NOT IN ('completed','archived')`
  ).get(userId, today)?.cnt || 0;

  res.json({ tasks, total: tasks.length, overdueCount, todayCount });
});

// ═══════════════════════════════════════════════════════════
// GET SINGLE  GET /api/v1/tasks/:id
// ═══════════════════════════════════════════════════════════
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const task = db.prepare(`
    SELECT t.*, p.title AS project_title
    FROM tasks t
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE t.id = ? AND t.owner_id = ?
  `).get(id, userId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const goals = db.prepare(`
    SELECT g.id, g.title, g.status, g.category
    FROM goals g
    JOIN goal_tasks gt ON gt.goal_id = g.id
    WHERE gt.task_id = ?
  `).all(id);

  const notes = db.prepare(`
    SELECT id, title, category, updated_at
    FROM notes WHERE task_id = ? AND status = 'active'
    ORDER BY updated_at DESC LIMIT 10
  `).all(id);

  res.json({ task, goals, notes });
});

// ═══════════════════════════════════════════════════════════
// CREATE  POST /api/v1/tasks
// ═══════════════════════════════════════════════════════════
router.post('/', (req, res) => {
  const userId = req.user.id;
  const {
    title, description = '', status = 'todo', priority = 'medium',
    due_date, start_date, project_id, goal_id,
  } = req.body;

  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

  const id = uuidv4();
  const ts = now();

  db.prepare(`
    INSERT INTO tasks
      (id, title, description, status, priority, due_date, start_date, project_id, owner_id, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).run(id, title.trim(), description, status, priority,
         due_date || null, start_date || null, project_id || null, userId, ts, ts);

  // Link to goal if provided
  if (goal_id) {
    const goal = db.prepare('SELECT id FROM goals WHERE id=? AND owner_id=?').get(goal_id, userId);
    if (goal) db.prepare('INSERT OR IGNORE INTO goal_tasks (goal_id, task_id) VALUES (?,?)').run(goal_id, id);
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.status(201).json({ task });
});

// ═══════════════════════════════════════════════════════════
// UPDATE  PATCH /api/v1/tasks/:id
// ═══════════════════════════════════════════════════════════
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const task = db.prepare('SELECT * FROM tasks WHERE id=? AND owner_id=?').get(id, userId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const fields = ['title','description','status','priority','due_date','start_date','project_id'];
  const updates = [];
  const params  = [];

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field] === '' ? null : req.body[field]);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });

  const ts = now();
  updates.push('updated_at = ?'); params.push(ts);
  if (req.body.status === 'completed' && task.status !== 'completed') {
    updates.push('completed_at = ?'); params.push(ts);
  }
  if (req.body.status === 'archived' && task.status !== 'archived') {
    updates.push('archived_at = ?'); params.push(ts);
  }

  params.push(id);
  db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id=?`).run(...params);

  const updated = db.prepare('SELECT * FROM tasks WHERE id=?').get(id);
  res.json({ task: updated });
});

// ═══════════════════════════════════════════════════════════
// DELETE  DELETE /api/v1/tasks/:id
// ═══════════════════════════════════════════════════════════
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const task = db.prepare('SELECT id FROM tasks WHERE id=? AND owner_id=?').get(id, userId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  db.prepare('DELETE FROM tasks WHERE id=?').run(id);
  res.json({ success: true });
});

module.exports = router;
