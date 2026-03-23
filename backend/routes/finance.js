const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.use(authMiddleware);

const now = () => new Date().toISOString();

// ──────────────────────────────────────────────────────────
// SUMMARY  GET /api/v1/finance/summary?month=2026-03
// Returns: current month totals + last 6 months history
// ──────────────────────────────────────────────────────────
router.get('/summary', (req, res) => {
  const userId = req.user.id;
  const month  = req.query.month || new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const [year, mo] = month.split('-');

  const start = `${year}-${mo}-01`;
  const end   = new Date(Number(year), Number(mo), 0).toISOString().slice(0, 10); // last day of month

  const totalIncome = db.prepare(`
    SELECT COALESCE(SUM(amount),0) AS total
    FROM income_records WHERE owner_id=? AND date>=? AND date<=?
  `).get(userId, start, end).total;

  const totalExpense = db.prepare(`
    SELECT COALESCE(SUM(amount),0) AS total
    FROM expense_records WHERE owner_id=? AND date>=? AND date<=?
  `).get(userId, start, end).total;

  // Last 6 months bar chart data
  const history = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Number(year), Number(mo) - 1 - i, 1);
    const ym = d.toISOString().slice(0, 7);
    const mStart = `${ym}-01`;
    const mEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
    const inc = db.prepare(`SELECT COALESCE(SUM(amount),0) AS t FROM income_records  WHERE owner_id=? AND date>=? AND date<=?`).get(userId, mStart, mEnd).t;
    const exp = db.prepare(`SELECT COALESCE(SUM(amount),0) AS t FROM expense_records WHERE owner_id=? AND date>=? AND date<=?`).get(userId, mStart, mEnd).t;
    history.push({ month: ym, income: inc, expense: exp, net: inc - exp });
  }

  // Category breakdown for expenses this month
  const expByCategory = db.prepare(`
    SELECT category, COALESCE(SUM(amount),0) AS total
    FROM expense_records WHERE owner_id=? AND date>=? AND date<=?
    GROUP BY category ORDER BY total DESC
  `).all(userId, start, end);

  res.json({
    month, totalIncome, totalExpense, net: totalIncome - totalExpense,
    history, expByCategory,
  });
});

// ──────────────────────────────────────────────────────────
// INCOME  GET /api/v1/finance/income
// ──────────────────────────────────────────────────────────
router.get('/income', (req, res) => {
  const userId = req.user.id;
  const { category, start, end, sort = 'date', dir = 'desc', search, project_id } = req.query;

  const where = ['owner_id=?']; const params = [userId];
  if (category)   { where.push('category=?');  params.push(category); }
  if (start)      { where.push('date>=?');      params.push(start); }
  if (end)        { where.push('date<=?');      params.push(end); }
  if (project_id) { where.push('project_id=?'); params.push(project_id); }
  if (search)     { where.push('(title LIKE ? OR description LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

  const allowed = { date:1, amount:1, title:1, created_at:1 };
  const sortCol = allowed[sort] ? sort : 'date';
  const sortDir = dir === 'asc' ? 'ASC' : 'DESC';

  const records = db.prepare(`
    SELECT i.*, p.title AS project_title
    FROM income_records i
    LEFT JOIN projects p ON p.id = i.project_id
    WHERE ${where.join(' AND ')}
    ORDER BY i.${sortCol} ${sortDir}
  `).all(...params);

  const total = records.reduce((s, r) => s + r.amount, 0);
  res.json({ records, count: records.length, total });
});

// ──────────────────────────────────────────────────────────
// INCOME CRUD
// ──────────────────────────────────────────────────────────
router.post('/income', (req, res) => {
  const userId = req.user.id;
  const { title, description='', amount, category='other', date, project_id } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
  if (!amount || isNaN(amount) || Number(amount) < 0) return res.status(400).json({ error: 'Valid amount required' });
  if (!date) return res.status(400).json({ error: 'Date is required' });

  const id = uuidv4(); const ts = now();
  db.prepare(`INSERT INTO income_records (id,title,description,amount,category,date,project_id,owner_id,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(id, title.trim(), description, Number(amount), category, date, project_id||null, userId, ts, ts);
  res.status(201).json({ record: db.prepare('SELECT * FROM income_records WHERE id=?').get(id) });
});

router.patch('/income/:id', (req, res) => {
  const { id } = req.params;
  const r = db.prepare('SELECT * FROM income_records WHERE id=? AND owner_id=?').get(id, req.user.id);
  if (!r) return res.status(404).json({ error: 'Not found' });

  const fields = ['title','description','amount','category','date','project_id'];
  const upd = []; const p = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      upd.push(`${f}=?`);
      p.push(f==='amount' ? Number(req.body[f]) : (f==='project_id' && req.body[f]==='' ? null : req.body[f]));
    }
  }
  if (upd.length) { upd.push('updated_at=?'); p.push(now(), id); db.prepare(`UPDATE income_records SET ${upd.join(',')} WHERE id=?`).run(...p); }
  res.json({ record: db.prepare('SELECT * FROM income_records WHERE id=?').get(id) });
});

router.delete('/income/:id', (req, res) => {
  const r = db.prepare('SELECT id FROM income_records WHERE id=? AND owner_id=?').get(req.params.id, req.user.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM income_records WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ──────────────────────────────────────────────────────────
// EXPENSES  GET /api/v1/finance/expenses
// ──────────────────────────────────────────────────────────
router.get('/expenses', (req, res) => {
  const userId = req.user.id;
  const { category, start, end, sort = 'date', dir = 'desc', search, project_id } = req.query;

  const where = ['owner_id=?']; const params = [userId];
  if (category)   { where.push('category=?');  params.push(category); }
  if (start)      { where.push('date>=?');      params.push(start); }
  if (end)        { where.push('date<=?');      params.push(end); }
  if (project_id) { where.push('project_id=?'); params.push(project_id); }
  if (search)     { where.push('(title LIKE ? OR description LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

  const allowed = { date:1, amount:1, title:1, created_at:1 };
  const sortCol = allowed[sort] ? sort : 'date';
  const sortDir = dir === 'asc' ? 'ASC' : 'DESC';

  const records = db.prepare(`
    SELECT e.*, p.title AS project_title
    FROM expense_records e
    LEFT JOIN projects p ON p.id = e.project_id
    WHERE ${where.join(' AND ')}
    ORDER BY e.${sortCol} ${sortDir}
  `).all(...params);

  const total = records.reduce((s, r) => s + r.amount, 0);
  res.json({ records, count: records.length, total });
});

// ──────────────────────────────────────────────────────────
// EXPENSE CRUD
// ──────────────────────────────────────────────────────────
router.post('/expenses', (req, res) => {
  const userId = req.user.id;
  const { title, description='', amount, category='other', date, project_id, receipt_url } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
  if (!amount || isNaN(amount) || Number(amount) < 0) return res.status(400).json({ error: 'Valid amount required' });
  if (!date) return res.status(400).json({ error: 'Date is required' });

  const id = uuidv4(); const ts = now();
  db.prepare(`INSERT INTO expense_records (id,title,description,amount,category,date,receipt_url,project_id,owner_id,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, title.trim(), description, Number(amount), category, date, receipt_url||null, project_id||null, userId, ts, ts);
  res.status(201).json({ record: db.prepare('SELECT * FROM expense_records WHERE id=?').get(id) });
});

router.patch('/expenses/:id', (req, res) => {
  const { id } = req.params;
  const r = db.prepare('SELECT * FROM expense_records WHERE id=? AND owner_id=?').get(id, req.user.id);
  if (!r) return res.status(404).json({ error: 'Not found' });

  const fields = ['title','description','amount','category','date','project_id','receipt_url'];
  const upd = []; const p = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      upd.push(`${f}=?`);
      p.push(f==='amount' ? Number(req.body[f]) : (f==='project_id' && req.body[f]==='' ? null : req.body[f]));
    }
  }
  if (upd.length) { upd.push('updated_at=?'); p.push(now(), id); db.prepare(`UPDATE expense_records SET ${upd.join(',')} WHERE id=?`).run(...p); }
  res.json({ record: db.prepare('SELECT * FROM expense_records WHERE id=?').get(id) });
});

router.delete('/expenses/:id', (req, res) => {
  const r = db.prepare('SELECT id FROM expense_records WHERE id=? AND owner_id=?').get(req.params.id, req.user.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM expense_records WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
