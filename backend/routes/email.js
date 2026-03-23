const express   = require('express');
const router    = express.Router();
const db        = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { v4: uuidv4 }     = require('uuid');
const { ImapFlow }        = require('imapflow');

router.use(authMiddleware);

const now = () => new Date().toISOString();

// ── Known provider IMAP defaults ──
const PRESETS = {
  gmail:   { imap_host: 'imap.gmail.com',         imap_port: 993, imap_secure: 1 },
  outlook: { imap_host: 'outlook.office365.com',  imap_port: 993, imap_secure: 1 },
  yahoo:   { imap_host: 'imap.mail.yahoo.com',    imap_port: 993, imap_secure: 1 },
  hotmail: { imap_host: 'outlook.office365.com',  imap_port: 993, imap_secure: 1 },
  aol:     { imap_host: 'imap.aol.com',           imap_port: 993, imap_secure: 1 },
  icloud:  { imap_host: 'imap.mail.me.com',       imap_port: 993, imap_secure: 1 },
  imap:    { imap_host: '', imap_port: 993, imap_secure: 1 },
};

// ── Build ImapFlow client ──
function makeClient(account) {
  return new ImapFlow({
    host: account.imap_host,
    port: account.imap_port,
    secure: !!account.imap_secure,
    auth: { user: account.username, pass: account.password },
    logger: false,       // suppress noisy logs
    disableAutoIdle: true,
    tls: { rejectUnauthorized: false },  // allow self-signed for corporate servers
  });
}

// ── Sync helper — fetches latest N messages from INBOX ──
async function syncAccount(account, limit = 50) {
  const client = makeClient(account);
  const messages = [];

  try {
    await client.connect();
    const mailbox = await client.mailboxOpen('INBOX');
    const total   = mailbox.exists;
    if (!total) { return messages; }

    // Fetch last `limit` messages by sequence
    const seqFrom = Math.max(1, total - limit + 1);
    const seqTo   = total;

    for await (const msg of client.fetch(`${seqFrom}:${seqTo}`, {
      uid: true, flags: true, envelope: true, bodyStructure: false,
      bodyParts: ['1'],   // plain text body part
      size: true,
    })) {
      const env  = msg.envelope || {};
      const from = env.from?.[0] || {};
      const bodyBuf = msg.bodyParts?.get('1');
      const bodyText = bodyBuf ? Buffer.from(bodyBuf).toString('utf-8').slice(0, 2000) : '';

      messages.push({
        uid:           String(msg.uid),
        message_id:    env.messageId || null,
        subject:       env.subject   || '(no subject)',
        from_address:  from.address  || '',
        from_name:     from.name     || from.address || '',
        to_addresses:  JSON.stringify((env.to || []).map(a => a.address).filter(Boolean)),
        date:          env.date      ? env.date.toISOString() : now(),
        body_preview:  bodyText.replace(/\s+/g, ' ').slice(0, 300),
        body_text:     bodyText,
        is_read:       msg.flags.has('\\Seen') ? 1 : 0,
        is_starred:    msg.flags.has('\\Flagged') ? 1 : 0,
        folder:        'INBOX',
        fetched_at:    now(),
      });
    }
  } finally {
    try { await client.logout(); } catch { /* ignore */ }
  }

  return messages;
}

// ═════════════════════════════════════════════════════════
// ACCOUNTS
// ═════════════════════════════════════════════════════════

// GET /api/v1/email/accounts
router.get('/accounts', (req, res) => {
  const accounts = db.prepare(`
    SELECT id, name, email, provider, imap_host, imap_port, imap_secure,
           username, status, error_message, last_sync_at, unread_count, color,
           created_at, updated_at
    FROM email_accounts WHERE owner_id=? ORDER BY created_at ASC
  `).all(req.user.id);
  res.json({ accounts });
});

// POST /api/v1/email/test — verify credentials without saving
router.post('/test', async (req, res) => {
  const { provider='imap', imap_host, imap_port=993, imap_secure=1, username, password } = req.body;
  const preset = PRESETS[provider] || {};
  const host   = imap_host || preset.imap_host;
  if (!host || !username || !password) return res.status(400).json({ error: 'Missing required fields' });

  const client = new ImapFlow({
    host, port: imap_port, secure: !!imap_secure,
    auth: { user: username, pass: password }, logger: false,
    tls: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    await client.logout();
    res.json({ success: true, message: 'Connection successful!' });
  } catch (e) {
    res.status(400).json({ error: `Connection failed: ${e.message}` });
  }
});

// POST /api/v1/email/accounts — add account
router.post('/accounts', async (req, res) => {
  const userId = req.user.id;
  const { name, email, provider='imap', imap_host, imap_port=993, imap_secure=1, username, password, color='#6366f1' } = req.body;

  if (!name || !email || !username || !password) return res.status(400).json({ error: 'Name, email, username, and password are required' });

  const preset = PRESETS[provider] || {};
  const host   = imap_host || preset.imap_host;
  if (!host) return res.status(400).json({ error: 'IMAP host is required' });

  const id = uuidv4(); const ts = now();
  const acct = { id, owner_id:userId, name, email, provider, imap_host:host,
    imap_port: Number(imap_port), imap_secure: imap_secure?1:0,
    username, password, status:'syncing', color, created_at:ts, updated_at:ts };

  db.prepare(`INSERT INTO email_accounts
    (id,owner_id,name,email,provider,imap_host,imap_port,imap_secure,username,password,status,color,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,'syncing',?,?,?)`)
    .run(id,userId,name,email,provider,host,Number(imap_port),imap_secure?1:0,username,password,color,ts,ts);

  // Sync in background (don't await)
  syncAccount(acct).then(msgs => {
    const ins = db.prepare(`INSERT OR REPLACE INTO email_messages
      (id,account_id,uid,message_id,subject,from_address,from_name,to_addresses,date,body_preview,body_text,is_read,is_starred,folder,fetched_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    const insertMany = db.transaction(rows => { for (const r of rows) ins.run(uuidv4(),id,r.uid,r.message_id,r.subject,r.from_address,r.from_name,r.to_addresses,r.date,r.body_preview,r.body_text,r.is_read,r.is_starred,r.folder,r.fetched_at); });
    insertMany(msgs);
    const unread = msgs.filter(m=>!m.is_read).length;
    db.prepare(`UPDATE email_accounts SET status='active',last_sync_at=?,unread_count=?,updated_at=? WHERE id=?`).run(now(),unread,now(),id);
  }).catch(e => {
    db.prepare(`UPDATE email_accounts SET status='error',error_message=?,updated_at=? WHERE id=?`).run(e.message,now(),id);
  });

  res.status(201).json({ account: db.prepare('SELECT * FROM email_accounts WHERE id=?').get(id) });
});

// PATCH /api/v1/email/accounts/:id
router.patch('/accounts/:id', (req, res) => {
  const { id } = req.params;
  const acct = db.prepare('SELECT * FROM email_accounts WHERE id=? AND owner_id=?').get(id, req.user.id);
  if (!acct) return res.status(404).json({ error: 'Not found' });

  const fields = ['name','color','status'];
  const upd=[]; const p=[];
  for (const f of fields) if (req.body[f]!==undefined) { upd.push(`${f}=?`); p.push(req.body[f]); }
  if (upd.length) { upd.push('updated_at=?'); p.push(now(),id); db.prepare(`UPDATE email_accounts SET ${upd.join(',')} WHERE id=?`).run(...p); }
  res.json({ account: db.prepare('SELECT * FROM email_accounts WHERE id=?').get(id) });
});

// DELETE /api/v1/email/accounts/:id
router.delete('/accounts/:id', (req, res) => {
  const { id } = req.params;
  const acct = db.prepare('SELECT id FROM email_accounts WHERE id=? AND owner_id=?').get(id, req.user.id);
  if (!acct) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM email_messages WHERE account_id=?').run(id);
  db.prepare('DELETE FROM email_accounts WHERE id=?').run(id);
  res.json({ success: true });
});

// POST /api/v1/email/accounts/:id/sync — manual re-sync
router.post('/accounts/:id/sync', (req, res) => {
  const { id } = req.params;
  const acct = db.prepare('SELECT * FROM email_accounts WHERE id=? AND owner_id=?').get(id, req.user.id);
  if (!acct) return res.status(404).json({ error: 'Not found' });

  db.prepare(`UPDATE email_accounts SET status='syncing',updated_at=? WHERE id=?`).run(now(), id);
  res.json({ message: 'Sync started' });

  syncAccount(acct, 100).then(msgs => {
    const ins = db.prepare(`INSERT OR REPLACE INTO email_messages
      (id,account_id,uid,message_id,subject,from_address,from_name,to_addresses,date,body_preview,body_text,is_read,is_starred,folder,fetched_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    const insertMany = db.transaction(rows => { for (const r of rows) ins.run(uuidv4(),id,r.uid,r.message_id,r.subject,r.from_address,r.from_name,r.to_addresses,r.date,r.body_preview,r.body_text,r.is_read,r.is_starred,r.folder,r.fetched_at); });
    insertMany(msgs);
    const unread = db.prepare(`SELECT COUNT(*) AS c FROM email_messages WHERE account_id=? AND is_read=0`).get(id).c;
    db.prepare(`UPDATE email_accounts SET status='active',last_sync_at=?,unread_count=?,updated_at=? WHERE id=?`).run(now(),unread,now(),id);
  }).catch(e => {
    db.prepare(`UPDATE email_accounts SET status='error',error_message=?,updated_at=? WHERE id=?`).run(e.message,now(),id);
  });
});

// ═════════════════════════════════════════════════════════
// MESSAGES
// ═════════════════════════════════════════════════════════

// GET /api/v1/email/messages
router.get('/messages', (req, res) => {
  const userId = req.user.id;
  const { account_id, folder='INBOX', search, is_read, is_starred, limit=50, offset=0 } = req.query;

  // Verify account ownership
  const accountIds = account_id
    ? [account_id]
    : db.prepare(`SELECT id FROM email_accounts WHERE owner_id=?`).all(userId).map(a=>a.id);

  if (!accountIds.length) return res.json({ messages:[], total:0 });

  const placeholders = accountIds.map(()=>'?').join(',');
  const where = [`m.account_id IN (${placeholders})`];
  const params = [...accountIds];

  if (folder)     { where.push('m.folder=?');   params.push(folder); }
  if (is_read!==undefined && is_read!=='') { where.push('m.is_read=?'); params.push(Number(is_read)); }
  if (is_starred) { where.push('m.is_starred=1'); }
  if (search)     { where.push('(m.subject LIKE ? OR m.from_name LIKE ? OR m.from_address LIKE ? OR m.body_preview LIKE ?)'); params.push(`%${search}%`,`%${search}%`,`%${search}%`,`%${search}%`); }

  const total = db.prepare(`SELECT COUNT(*) AS c FROM email_messages m WHERE ${where.join(' AND ')}`).get(...params).c;
  const messages = db.prepare(`
    SELECT m.*, a.name AS account_name, a.color AS account_color, a.email AS account_email
    FROM email_messages m
    JOIN email_accounts a ON a.id = m.account_id
    WHERE ${where.join(' AND ')}
    ORDER BY m.date DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), Number(offset));

  res.json({ messages, total });
});

// GET /api/v1/email/messages/:id
router.get('/messages/:id', (req, res) => {
  const userId = req.user.id;
  const msg = db.prepare(`
    SELECT m.*, a.name AS account_name, a.color AS account_color, a.email AS account_email, a.owner_id
    FROM email_messages m JOIN email_accounts a ON a.id=m.account_id
    WHERE m.id=?
  `).get(req.params.id);
  if (!msg || msg.owner_id !== userId) return res.status(404).json({ error: 'Not found' });
  res.json({ message: msg });
});

// PATCH /api/v1/email/messages/:id/read
router.patch('/messages/:id/read', (req, res) => {
  const msg = db.prepare(`SELECT m.id, a.owner_id FROM email_messages m JOIN email_accounts a ON a.id=m.account_id WHERE m.id=?`).get(req.params.id);
  if (!msg || msg.owner_id !== req.user.id) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE email_messages SET is_read=1 WHERE id=?').run(req.params.id);
  // Update unread count
  const aid = db.prepare('SELECT account_id FROM email_messages WHERE id=?').get(req.params.id)?.account_id;
  if (aid) { const uc = db.prepare('SELECT COUNT(*) AS c FROM email_messages WHERE account_id=? AND is_read=0').get(aid).c; db.prepare('UPDATE email_accounts SET unread_count=? WHERE id=?').run(uc,aid); }
  res.json({ success: true });
});

// PATCH /api/v1/email/messages/:id/unread
router.patch('/messages/:id/unread', (req, res) => {
  const msg = db.prepare(`SELECT m.id, m.account_id, a.owner_id FROM email_messages m JOIN email_accounts a ON a.id=m.account_id WHERE m.id=?`).get(req.params.id);
  if (!msg || msg.owner_id !== req.user.id) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE email_messages SET is_read=0 WHERE id=?').run(req.params.id);
  const uc = db.prepare('SELECT COUNT(*) AS c FROM email_messages WHERE account_id=? AND is_read=0').get(msg.account_id).c;
  db.prepare('UPDATE email_accounts SET unread_count=? WHERE id=?').run(uc, msg.account_id);
  res.json({ success: true });
});

// PATCH /api/v1/email/messages/:id/star
router.patch('/messages/:id/star', (req, res) => {
  const msg = db.prepare(`SELECT m.id, m.is_starred, a.owner_id FROM email_messages m JOIN email_accounts a ON a.id=m.account_id WHERE m.id=?`).get(req.params.id);
  if (!msg || msg.owner_id !== req.user.id) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE email_messages SET is_starred=? WHERE id=?').run(msg.is_starred ? 0 : 1, req.params.id);
  res.json({ success: true, is_starred: !msg.is_starred });
});

// DELETE /api/v1/email/messages/:id
router.delete('/messages/:id', (req, res) => {
  const msg = db.prepare(`SELECT m.id, a.owner_id FROM email_messages m JOIN email_accounts a ON a.id=m.account_id WHERE m.id=?`).get(req.params.id);
  if (!msg || msg.owner_id !== req.user.id) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM email_messages WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
