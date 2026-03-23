const express = require('express');
const router = express.Router();
const db = require('../db/database');
const bcrypt = require('bcryptjs');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

const PROFILE_FIELDS = 'id, email, name, role, avatar_url, bio, last_login_at, created_at, updated_at';

// GET /api/v1/profile
router.get('/', (req, res) => {
  const user = db.prepare(`SELECT ${PROFILE_FIELDS} FROM users WHERE id = ?`).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// PATCH /api/v1/profile — update name, avatar_url, bio
router.patch('/', (req, res) => {
  const { name, avatar_url, bio } = req.body;

  if (name !== undefined && !name.trim()) {
    return res.status(400).json({ error: 'Name cannot be empty' });
  }

  db.prepare(`
    UPDATE users SET
      name = COALESCE(?, name),
      avatar_url = ?,
      bio = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name?.trim() || null,
    avatar_url !== undefined ? (avatar_url || null) : db.prepare('SELECT avatar_url FROM users WHERE id = ?').get(req.user.id)?.avatar_url,
    bio !== undefined ? (bio || null) : db.prepare('SELECT bio FROM users WHERE id = ?').get(req.user.id)?.bio,
    req.user.id
  );

  const updated = db.prepare(`SELECT ${PROFILE_FIELDS} FROM users WHERE id = ?`).get(req.user.id);
  res.json(updated);
});

// PATCH /api/v1/profile/password — change own password
router.patch('/password', (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'current_password and new_password are required' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(current_password, user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const password_hash = bcrypt.hashSync(new_password, 12);
  db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(password_hash, req.user.id);

  // Invalidate all sessions (force re-login everywhere)
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.user.id);

  res.json({ message: 'Password changed successfully. Please log in again.' });
});

module.exports = router;
