const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.use(authMiddleware);

const now = () => new Date().toISOString();

// ═══════════════════════════════════════════════════════════
// LIST  GET /api/v1/notes
// Query: category, status, goal_id, project_id, task_id,
//        sort (updated_at|created_at|title), dir, search, limit
// ═══════════════════════════════════════════════════════════
router.get('/', (req, res) => {
  const userId = req.user.id;
  const {
    category, status = 'active', goal_id, project_id, task_id,
    sort = 'updated_at', dir = 'desc', search, limit,
  } = req.query;

  const allowed = { updated_at:1, created_at:1, title:1 };
  const sortCol = allowed[sort] ? sort : 'updated_at';
  const sortDir = dir === 'asc' ? 'ASC' : 'DESC';

  const where  = ['n.owner_id = ?'];
  const params = [userId];

  if (status)     { where.push('n.status = ?');     params.push(status); }
  if (category)   { where.push('n.category = ?');   params.push(category); }
  if (goal_id)    { where.push('n.goal_id = ?');    params.push(goal_id); }
  if (project_id) { where.push('n.project_id = ?'); params.push(project_id); }
  if (task_id)    { where.push('n.task_id = ?');    params.push(task_id); }
  if (search) {
    where.push('(n.title LIKE ? OR n.content LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const limitClause = Number(limit) > 0 ? `LIMIT ${Number(limit)}` : '';

  const notes = db.prepare(`
    SELECT n.*,
           g.title AS goal_title,
           p.title AS project_title,
           t.title AS task_title,
           (SELECT GROUP_CONCAT(tg.name, ', ')
            FROM tags tg
            JOIN record_tags rt ON rt.tag_id = tg.id
            WHERE rt.record_type = 'note' AND rt.record_id = n.id) AS tags
    FROM notes n
    LEFT JOIN goals    g ON g.id = n.goal_id
    LEFT JOIN projects p ON p.id = n.project_id
    LEFT JOIN tasks    t ON t.id = n.task_id
    WHERE ${where.join(' AND ')}
    ORDER BY n.${sortCol} ${sortDir}
    ${limitClause}
  `).all(...params);

  res.json({ notes, total: notes.length });
});

// ═══════════════════════════════════════════════════════════
// GET SINGLE  GET /api/v1/notes/:id
// ═══════════════════════════════════════════════════════════
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const note = db.prepare(`
    SELECT n.*,
           g.title AS goal_title,
           p.title AS project_title,
           t.title AS task_title
    FROM notes n
    LEFT JOIN goals    g ON g.id = n.goal_id
    LEFT JOIN projects p ON p.id = n.project_id
    LEFT JOIN tasks    t ON t.id = n.task_id
    WHERE n.id = ? AND n.owner_id = ?
  `).get(id, userId);
  if (!note) return res.status(404).json({ error: 'Note not found' });

  const tags = db.prepare(`
    SELECT tg.id, tg.name, tg.color
    FROM tags tg
    JOIN record_tags rt ON rt.tag_id = tg.id
    WHERE rt.record_type = 'note' AND rt.record_id = ?
    ORDER BY tg.name
  `).all(id);

  res.json({ note, tags });
});

// ═══════════════════════════════════════════════════════════
// CREATE  POST /api/v1/notes
// ═══════════════════════════════════════════════════════════
router.post('/', (req, res) => {
  const userId = req.user.id;
  const {
    title = '', content = '', category = 'other',
    goal_id, project_id, task_id, tags = [],
  } = req.body;

  const id = uuidv4();
  const ts = now();

  db.prepare(`
    INSERT INTO notes (id, title, content, category, status, goal_id, project_id, task_id, owner_id, created_at, updated_at)
    VALUES (?,?,?,?,'active',?,?,?,?,?,?)
  `).run(id, title.trim(), content, category,
         goal_id || null, project_id || null, task_id || null, userId, ts, ts);

  // Save tags
  if (Array.isArray(tags) && tags.length) {
    _syncTags(id, tags, userId);
  }

  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
  res.status(201).json({ note });
});

// ═══════════════════════════════════════════════════════════
// UPDATE  PATCH /api/v1/notes/:id
// ═══════════════════════════════════════════════════════════
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const note = db.prepare('SELECT * FROM notes WHERE id=? AND owner_id=?').get(id, userId);
  if (!note) return res.status(404).json({ error: 'Note not found' });

  const fields = ['title','content','category','status','goal_id','project_id','task_id'];
  const updates = [];
  const params  = [];

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field] === '' ? null : req.body[field]);
    }
  }

  const ts = now();
  updates.push('updated_at = ?'); params.push(ts);
  if (req.body.status === 'archived' && note.status !== 'archived') {
    updates.push('archived_at = ?'); params.push(ts);
  }

  if (updates.length > 1) {
    params.push(id);
    db.prepare(`UPDATE notes SET ${updates.join(', ')} WHERE id=?`).run(...params);
  }

  // Sync tags if provided
  if (Array.isArray(req.body.tags)) {
    _syncTags(id, req.body.tags, userId);
  }

  const updated = db.prepare('SELECT * FROM notes WHERE id=?').get(id);
  res.json({ note: updated });
});

// ═══════════════════════════════════════════════════════════
// DELETE  DELETE /api/v1/notes/:id
// ═══════════════════════════════════════════════════════════
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const note = db.prepare('SELECT id FROM notes WHERE id=? AND owner_id=?').get(id, userId);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  db.prepare('DELETE FROM notes WHERE id=?').run(id);
  res.json({ success: true });
});

// ── Helpers ──
function _syncTags(noteId, tagNames, userId) {
  // Remove existing record_tags for this note
  db.prepare(`DELETE FROM record_tags WHERE record_type='note' AND record_id=?`).run(noteId);

  for (const name of tagNames) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    // Upsert tag
    let tag = db.prepare('SELECT id FROM tags WHERE name=? AND owner_id=?').get(trimmed, userId);
    if (!tag) {
      const tagId = uuidv4();
      db.prepare('INSERT INTO tags (id, name, owner_id) VALUES (?,?,?)').run(tagId, trimmed, userId);
      tag = { id: tagId };
    }
    db.prepare(`INSERT OR IGNORE INTO record_tags (id, tag_id, record_type, record_id) VALUES (?,?,'note',?)`)
      .run(uuidv4(), tag.id, noteId);
  }
}

module.exports = router;
