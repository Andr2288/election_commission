async function markOverdueAssignments(pool) {
  await pool.query(
    `UPDATE assignments
     SET status = 'overdue'
     WHERE status = 'in_progress' AND deadline < CURDATE()`
  );
}

function resolveStatusOnSave(status, deadline) {
  if (status === 'completed') return 'completed';

  const today = new Date().toISOString().slice(0, 10);
  const deadlineStr = typeof deadline === 'string' ? deadline.slice(0, 10) : deadline;

  if (deadlineStr < today) return 'overdue';
  return 'in_progress';
}

module.exports = { markOverdueAssignments, resolveStatusOnSave };
