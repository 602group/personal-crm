const express = require('express');
const router = express.Router();
const db = require('../db/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getRefreshExpiresAt,
} = require('../utils/jwt');
const { authMiddleware } = require('../middleware/auth');

// POST /api/v1/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email.toLowerCase().trim());

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const payload = { id: user.id, email: user.email, name: user.name, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ id: user.id });

  // Store refresh token session
  db.prepare(`
    INSERT INTO sessions (id, user_id, refresh_token, user_agent, ip_address, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    uuidv4(),
    user.id,
    refreshToken,
    req.headers['user-agent'] || null,
    req.ip || null,
    getRefreshExpiresAt()
  );

  // Track last login
  db.prepare(`UPDATE users SET last_login_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(user.id);

  res.json({ accessToken, refreshToken, user: payload });
});

// POST /api/v1/auth/logout
router.post('/logout', (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    db.prepare('DELETE FROM sessions WHERE refresh_token = ?').run(refreshToken);
  }
  res.json({ message: 'Logged out successfully' });
});

// POST /api/v1/auth/refresh
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  try {
    const payload = verifyRefreshToken(refreshToken);
    const session = db.prepare(`
      SELECT * FROM sessions WHERE refresh_token = ? AND expires_at > datetime('now')
    `).get(refreshToken);
    if (!session) return res.status(401).json({ error: 'Invalid or expired refresh token' });

    const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(payload.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const newPayload = { id: user.id, email: user.email, name: user.name, role: user.role };
    const accessToken = signAccessToken(newPayload);
    res.json({ accessToken, user: newPayload });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// GET /api/v1/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare(
    'SELECT id, email, name, role, avatar_url, bio, last_login_at, created_at FROM users WHERE id = ?'
  ).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// POST /api/v1/auth/forgot-password
// Since there's no email server in Phase 2, return the token directly in the response.
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const user = db.prepare('SELECT id FROM users WHERE email = ? AND is_active = 1').get(email.toLowerCase().trim());

  // Always return 200 to avoid user enumeration
  if (!user) {
    return res.json({ message: 'If that email exists, a reset token has been generated.' });
  }

  // Invalidate any existing tokens for this user
  db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(user.id);

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  db.prepare(`
    INSERT INTO password_resets (id, user_id, token, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(uuidv4(), user.id, token, expiresAt);

  res.json({
    message: 'Password reset token generated.',
    resetToken: token,
    expiresAt,
    note: 'Use this token with POST /api/v1/auth/reset-password',
  });
});

// POST /api/v1/auth/reset-password
router.post('/reset-password', (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const reset = db.prepare(`
    SELECT * FROM password_resets
    WHERE token = ? AND expires_at > datetime('now') AND used_at IS NULL
  `).get(token);

  if (!reset) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  const password_hash = bcrypt.hashSync(password, 12);
  db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(password_hash, reset.user_id);
  db.prepare(`UPDATE password_resets SET used_at = datetime('now') WHERE id = ?`).run(reset.id);

  // Invalidate all sessions for this user
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(reset.user_id);

  res.json({ message: 'Password reset successfully. Please log in again.' });
});

module.exports = router;
