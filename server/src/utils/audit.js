const pool = require('../db');

async function logAction(userId, action, entityType, entityId, details) {
  await pool.query(
    'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
    [userId, action, entityType, entityId, details]
  );
}

module.exports = { logAction };
