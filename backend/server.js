require('dotenv').config();
require('./db/migrate'); // Run migrations on every startup

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const apiRouter = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─── Security ───────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));

// ─── Logging ────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Body Parsing ───────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── API Routes ─────────────────────────────────────────────
app.use('/api/v1', apiRouter);

// ─── 404 Handler ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ─── Global Error Handler ───────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// ─── Start Server ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Personal OS API running at http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   CORS allowed: ${FRONTEND_URL}\n`);
});

module.exports = app;
