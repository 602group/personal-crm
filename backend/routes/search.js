const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// ══════════════════════════════════════════════════════════
// GET /api/v1/search?q=...&types=goals,projects,tasks,notes,events,finance
// Returns up to 8 results per type, ordered by relevance (most recent first)
// ══════════════════════════════════════════════════════════
router.get('/', (req, res) => {
  const userId = req.user.id;
  const q = (req.query.q || '').trim();
  if (!q || q.length < 2) return res.json({ results: [], total: 0, query: q });

  const typeFilter = req.query.types ? req.query.types.split(',') : null;
  const like = `%${q}%`;
  const results = [];

  function search(type, sql, params) {
    if (typeFilter && !typeFilter.includes(type)) return;
    try {
      const rows = db.prepare(sql).all(...params);
      rows.forEach(r => results.push({ type, ...r }));
    } catch (e) { /* graceful */ }
  }

  // Goals
  search('goal', `
    SELECT id, title, status, category AS meta, updated_at
    FROM goals WHERE owner_id=? AND (title LIKE ? OR description LIKE ?)
    ORDER BY updated_at DESC LIMIT 8
  `, [userId, like, like]);

  // Projects
  search('project', `
    SELECT id, title, status, category AS meta, updated_at
    FROM projects WHERE owner_id=? AND (title LIKE ? OR description LIKE ?)
    ORDER BY updated_at DESC LIMIT 8
  `, [userId, like, like]);

  // Tasks
  search('task', `
    SELECT id, title, status, priority AS meta, updated_at
    FROM tasks WHERE owner_id=? AND (title LIKE ? OR description LIKE ?)
    ORDER BY updated_at DESC LIMIT 8
  `, [userId, like, like]);

  // Notes
  search('note', `
    SELECT id, title, category AS meta, updated_at
    FROM notes WHERE owner_id=? AND status='active' AND (title LIKE ? OR content LIKE ?)
    ORDER BY updated_at DESC LIMIT 8
  `, [userId, like, like]);

  // Calendar events
  search('event', `
    SELECT id, title, category AS meta, start_at AS updated_at
    FROM calendar_events WHERE owner_id=? AND (title LIKE ? OR description LIKE ?)
    ORDER BY start_at ASC LIMIT 8
  `, [userId, like, like]);

  // Income
  search('income', `
    SELECT id, title, category AS meta, date AS updated_at,
           printf('$%.2f', amount) AS subtitle
    FROM income_records WHERE owner_id=? AND (title LIKE ? OR description LIKE ?)
    ORDER BY date DESC LIMIT 5
  `, [userId, like, like]);

  // Expenses
  search('expense', `
    SELECT id, title, category AS meta, date AS updated_at,
           printf('$%.2f', amount) AS subtitle
    FROM expense_records WHERE owner_id=? AND (title LIKE ? OR description LIKE ?)
    ORDER BY date DESC LIMIT 5
  `, [userId, like, like]);

  // Sort all by updated_at desc
  results.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  res.json({ results, total: results.length, query: q });
});

module.exports = router;
