const { hasPermission } = require('../config/permissions');

/**
 * Middleware factory: checks if the authenticated user can perform
 * an operation on a module.
 *
 * Usage: router.get('/goals', authMiddleware, checkPermission('goals', 'R'), handler)
 */
function checkPermission(module, operation) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!hasPermission(req.user.role, module, operation)) {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to perform this action',
        required: `${operation} on ${module}`,
      });
    }
    next();
  };
}

module.exports = { checkPermission };
