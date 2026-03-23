const express = require('express');
const router = express.Router();

router.use('/auth',      require('./auth'));
router.use('/health',    require('./health'));
router.use('/users',     require('./users'));
router.use('/profile',   require('./profile'));
router.use('/dashboard', require('./dashboard'));
router.use('/goals',     require('./goals'));
router.use('/projects',  require('./projects'));
router.use('/tasks',     require('./tasks'));
router.use('/notes',     require('./notes'));
router.use('/calendar',  require('./calendar'));
router.use('/finance',      require('./finance'));
router.use('/search',       require('./search'));
router.use('/notifications', require('./notifications'));
router.use('/email',         require('./email'));
router.use('/epic',          require('./epic'));

module.exports = router;
