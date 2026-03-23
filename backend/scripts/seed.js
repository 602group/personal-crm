#!/usr/bin/env node
/**
 * Seed Script — Creates the initial admin user.
 * Run once: node scripts/seed.js
 */

require('dotenv').config();
require('../db/migrate'); // ensure schema exists

const db = require('../db/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const email = (process.env.SEED_ADMIN_EMAIL || 'admin@personal.os').toLowerCase().trim();
const password = process.env.SEED_ADMIN_PASSWORD || 'changeme123';
const name = process.env.SEED_ADMIN_NAME || 'Admin';

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

if (existing) {
  console.log(`[seed] Admin user already exists: ${email}`);
  process.exit(0);
}

const password_hash = bcrypt.hashSync(password, 12);
const id = uuidv4();

db.prepare(`
  INSERT INTO users (id, email, password_hash, name, role)
  VALUES (?, ?, ?, ?, 'admin')
`).run(id, email, password_hash, name);

console.log(`[seed] Admin user created successfully!`);
console.log(`       Email:    ${email}`);
console.log(`       Password: ${password}`);
console.log(`       Role:     admin`);
console.log(`\n[seed] ⚠️  Change the default password in your .env file before deploying!`);
process.exit(0);
