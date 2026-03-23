/**
 * Personal OS — Role-Based Permission Config
 *
 * Maps each role to the set of operations allowed per module.
 * Operations: C=Create, R=Read, U=Update, D=Delete
 *
 * To add a new module: add one key to each role's object.
 * To add a new role: add a new top-level key.
 */

const PERMISSIONS = {
  owner: {
    users:    'CRUD',
    goals:    'CRUD',
    projects: 'CRUD',
    tasks:    'CRUD',
    notes:    'CRUD',
    calendar: 'CRUD',
    finance:  'CRUD',
    settings: 'CRUD',
    reports:  'CRUD',
    audit:    'R',
  },
  admin: {
    users:    'RU',       // can view and edit users, not create/delete
    goals:    'CRUD',
    projects: 'CRUD',
    tasks:    'CRUD',
    notes:    'CRUD',
    calendar: 'CRUD',
    finance:  'CRUD',
    settings: 'RU',
    reports:  'R',
    audit:    'R',
  },
  member: {
    users:    '',          // no access
    goals:    'CRU',
    projects: 'CRU',
    tasks:    'CRUD',
    notes:    'CRUD',
    calendar: 'CRU',
    finance:  'R',
    settings: '',
    reports:  '',
    audit:    '',
  },
};

/**
 * Check if a role has the required permission on a module.
 * @param {string} role - 'owner' | 'admin' | 'member'
 * @param {string} module - e.g. 'goals'
 * @param {string} operation - 'C' | 'R' | 'U' | 'D'
 * @returns {boolean}
 */
function hasPermission(role, module, operation) {
  const rolePerms = PERMISSIONS[role];
  if (!rolePerms) return false;
  const allowed = rolePerms[module] || '';
  return allowed.includes(operation);
}

/**
 * Check if a role can manage users (create, modify, assign roles).
 */
function canManageUsers(role) {
  return role === 'owner';
}

module.exports = { PERMISSIONS, hasPermission, canManageUsers };
