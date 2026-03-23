const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

// GET /api/v1/dashboard
// Returns aggregated data for the Executive Dashboard.
router.get('/', authMiddleware, (req, res) => {
  const userId  = req.user.id;
  const today   = new Date().toISOString().slice(0, 10);          // YYYY-MM-DD
  const in7days = new Date(Date.now() + 7  * 86400000).toISOString().slice(0, 10);
  const in30days= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';                    // YYYY-MM-01

  try {
    // ── Today's Priorities: overdue + due today + high/critical with no due date ──
    const todaysPriorities = db.prepare(`
      SELECT id, title, status, priority, due_date, project_id
      FROM   tasks
      WHERE  owner_id = ?
        AND  status   NOT IN ('completed','archived')
        AND  (
          due_date <= ?           -- overdue or due today
          OR (due_date IS NULL AND priority IN ('high','critical'))
        )
      ORDER BY
        CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        due_date ASC NULLS LAST
      LIMIT 10
    `).all(userId, today);

    // ── Upcoming Tasks: due in next 7 days (excluding today's priorities) ──
    const upcomingTasks = db.prepare(`
      SELECT id, title, status, priority, due_date, project_id
      FROM   tasks
      WHERE  owner_id = ?
        AND  status   NOT IN ('completed','archived')
        AND  due_date >  ?
        AND  due_date <= ?
      ORDER BY due_date ASC, priority ASC
      LIMIT 10
    `).all(userId, today, in7days);

    // ── Active Goals ──
    const activeGoals = db.prepare(`
      SELECT id, title, category, status, priority, progress, target_date
      FROM   goals
      WHERE  owner_id = ?
        AND  status   = 'in_progress'
      ORDER BY target_date ASC NULLS LAST, priority ASC
      LIMIT 6
    `).all(userId);

    // ── Calendar Preview: next 14 days ──
    const calendarEvents = db.prepare(`
      SELECT id, title, category, start_at, end_at, is_all_day, location
      FROM   calendar_events
      WHERE  owner_id = ?
        AND  start_at >= ?
        AND  start_at <= ?
      ORDER BY start_at ASC
      LIMIT 8
    `).all(userId, today, in30days.slice(0, 7) + '-14');

    // ── Finance Snapshot: current month ──
    const incomeRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM   income_records
      WHERE  owner_id = ?
        AND  date     >= ?
        AND  date     <= ?
    `).get(userId, monthStart, today);

    const expenseRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM   expense_records
      WHERE  owner_id = ?
        AND  date     >= ?
        AND  date     <= ?
    `).get(userId, monthStart, today);

    // Top expense categories this month
    const expenseBreakdown = db.prepare(`
      SELECT category, COALESCE(SUM(amount), 0) AS total
      FROM   expense_records
      WHERE  owner_id = ?
        AND  date >= ?
        AND  date <= ?
      GROUP BY category
      ORDER BY total DESC
      LIMIT 4
    `).all(userId, monthStart, today);

    const finance = {
      income:           incomeRow.total,
      expenses:         expenseRow.total,
      net:              incomeRow.total - expenseRow.total,
      expenseBreakdown,
    };

    // ── Recent Notes ──
    const recentNotes = db.prepare(`
      SELECT id, title, category, updated_at, goal_id, project_id, task_id
      FROM   notes
      WHERE  owner_id = ?
        AND  status   = 'active'
      ORDER BY updated_at DESC
      LIMIT 6
    `).all(userId);

    // ── Counts for header stats ──
    const stats = {
      totalTasks: db.prepare(`
        SELECT count(*) AS c FROM tasks
        WHERE owner_id=? AND status NOT IN ('completed','archived')
      `).get(userId).c,

      overdueTasks: db.prepare(`
        SELECT count(*) AS c FROM tasks
        WHERE owner_id=? AND status NOT IN ('completed','archived') AND due_date < ?
      `).get(userId, today).c,

      activeGoals: db.prepare(`
        SELECT count(*) AS c FROM goals
        WHERE owner_id=? AND status='in_progress'
      `).get(userId).c,

      activeProjects: db.prepare(`
        SELECT count(*) AS c FROM projects
        WHERE owner_id=? AND status='active'
      `).get(userId).c,
    };

    res.json({
      todaysPriorities,
      upcomingTasks,
      activeGoals,
      calendarEvents,
      finance,
      recentNotes,
      stats,
      generatedAt: new Date().toISOString(),
    });

  } catch (err) {
    console.error('[dashboard] Error:', err);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

module.exports = router;
