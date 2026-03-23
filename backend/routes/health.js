const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'personal-os-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
