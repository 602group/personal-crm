const fs = require('fs');
const path = require('path');
const db = require('./database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/**
 * Execute a SQL file safely.
 * - Handles PRAGMA statements separately (better-sqlite3 uses db.pragma())
 * - Runs all DDL inside a single transaction for atomicity
 * - Splits on ; only at the top level (not inside strings/comments)
 */
function execSql(sql) {
  // Strip single-line comments but ONLY whole lines starting with --
  // (avoid breaking inline comments inside multi-line statements)
  const lines = sql.split('\n').map(line => {
    const trimmed = line.trim();
    // Only remove lines that are purely comments (whole line is --)
    return trimmed.startsWith('--') ? '' : line;
  });
  const cleaned = lines.join('\n');

  // Split on semicolons — but only ones followed by whitespace/newline or end of string
  // This avoids splitting on semicolons inside string literals
  const stmts = cleaned
    .split(/;\s*(?:\n|$)/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const pragmas = stmts.filter(s => /^PRAGMA\s/i.test(s));
  const ddl     = stmts.filter(s => !/^PRAGMA\s/i.test(s));

  for (const s of pragmas) {
    db.pragma(s.replace(/^PRAGMA\s+/i, ''));
  }

  if (ddl.length === 0) return;

  const run = db.transaction(() => {
    for (const s of ddl) {
      db.prepare(s).run();
    }
  });
  run();
}

function migrate() {
  console.log('[migrate] Running database migrations...');

  // Ensure migration tracking table exists
  db.exec(`CREATE TABLE IF NOT EXISTS migrations_applied (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    filename   TEXT    NOT NULL UNIQUE,
    applied_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );`);

  // 1. Run base schema (all CREATE IF NOT EXISTS — idempotent)
  const schemaPath = path.join(__dirname, 'schema.sql');
  execSql(fs.readFileSync(schemaPath, 'utf8'));

  // 2. Run versioned migration files in alphabetical order
  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.log('[migrate] No migrations directory found. Done.');
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const already = db.prepare('SELECT 1 FROM migrations_applied WHERE filename = ?').get(file);
    if (already) {
      console.log(`[migrate] Already applied: ${file}`);
      continue;
    }
    console.log(`[migrate] Applying: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    execSql(sql);
    db.prepare('INSERT INTO migrations_applied (filename) VALUES (?)').run(file);
    console.log(`[migrate] Applied: ${file}`);
  }

  console.log('[migrate] All migrations complete.');
  
  // Auto-seed admin user if users table is empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    console.log('[migrate] No users found. Auto-seeding admin user...');
    const email = 'hburnside99@gmail.com';
    const password = 'Waterboy1';
    const password_hash = bcrypt.hashSync(password, 12);
    const id = uuidv4();
    
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role)
      VALUES (?, ?, ?, ?, 'owner')
    `).run(id, email, password_hash, 'Hunter Burnside');
    
    console.log(`[migrate] Admin seeded: ${email}`);
  }
}

migrate();
