const express = require('express');
const router = express.Router();
const db = require('../db/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware, requireRole } = require('../middleware/auth');

const SAFE_USER_FIELDS = 'id, email, name, role, avatar_url, bio, is_active, last_login_at, created_at, updated_at';

// All routes require authentication + owner or admin role
router.use(authMiddleware, requireRole('owner', 'admin'));

// GET /api/v1/users — list all users
router.get('/', (req, res) => {
  const users = db.prepare(`SELECT ${SAFE_USER_FIELDS} FROM users ORDER BY created_at DESC`).all();
  res.json(users);
});

// GET /api/v1/users/:id — get single user
router.get('/:id', (req, res) => {
  const user = db.prepare(`SELECT ${SAFE_USER_FIELDS} FROM users WHERE id = ?`).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// POST /api/v1/users — create user (owner only)
router.post('/', requireRole('owner'), (req, res) => {
  const { name, email, password, role = 'member' } = req.body;

  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  if (!['owner', 'admin', 'member'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) return res.status(409).json({ error: 'A user with that email already exists' });

  const id = uuidv4();
  const password_hash = bcrypt.hashSync(password, 12);

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, email.toLowerCase().trim(), password_hash, name.trim(), role);

  const created = db.prepare(`SELECT ${SAFE_USER_FIELDS} FROM users WHERE id = ?`).get(id);
  res.status(201).json(created);
});

// PATCH /api/v1/users/:id — update user (name, role, avatar_url)
router.patch('/:id', (req, res) => {
  const { name, role, avatar_url, bio } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Only owner can change roles or manage other owners
  if (role && req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Only owners can change user roles' });
  }
  if (role && !['owner', 'admin', 'member'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  db.prepare(`
    UPDATE users SET
      name = COALESCE(?, name),
      role = COALESCE(?, role),
      avatar_url = COALESCE(?, avatar_url),
      bio = COALESCE(?, bio),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(name?.trim() || null, role || null, avatar_url || null, bio || null, req.params.id);

  const updated = db.prepare(`SELECT ${SAFE_USER_FIELDS} FROM users WHERE id = ?`).get(req.params.id);
  res.json(updated);
});

// PATCH /api/v1/users/:id/deactivate
router.patch('/:id/deactivate', requireRole('owner'), (req, res) => {
  const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.id === req.user.id) return res.status(400).json({ error: 'Cannot deactivate your own account' });

  db.prepare(`UPDATE users SET is_active = 0, updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.params.id);
  res.json({ message: 'User deactivated' });
});

// PATCH /api/v1/users/:id/activate
router.patch('/:id/activate', requireRole('owner'), (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.prepare(`UPDATE users SET is_active = 1, updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
  res.json({ message: 'User activated' });
});

module.exports = router;
