const express = require('express');
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const { markOverdueAssignments, resolveStatusOnSave } = require('../utils/assignments');

const router = express.Router();

const SORT_FIELDS = {
  title: 'a.title',
  deadline: 'a.deadline',
  status: 'a.status',
  created_at: 'a.created_at',
  member_name: 'cm.full_name',
};

router.use(authMiddleware);

router.get('/', async (req, res) => {
  await markOverdueAssignments(pool);

  const { search = '', status, member_id, sort = 'deadline', order = 'asc' } = req.query;
  const sortColumn = SORT_FIELDS[sort] || SORT_FIELDS.deadline;
  const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  let sql = `
    SELECT a.*, cm.full_name AS member_name, u.full_name AS assigned_by_name
    FROM assignments a
    JOIN commission_members cm ON a.member_id = cm.id
    JOIN users u ON a.assigned_by = u.id
    WHERE 1=1
  `;
  const params = [];

  if (search.trim()) {
    sql += ' AND (a.title LIKE ? OR a.description LIKE ? OR cm.full_name LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  if (status && ['in_progress', 'completed', 'overdue'].includes(status)) {
    sql += ' AND a.status = ?';
    params.push(status);
  }

  if (member_id) {
    sql += ' AND a.member_id = ?';
    params.push(member_id);
  }

  sql += ` ORDER BY ${sortColumn} ${sortOrder}`;
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  await markOverdueAssignments(pool);

  const [rows] = await pool.query(
    `SELECT a.*, cm.full_name AS member_name, u.full_name AS assigned_by_name
     FROM assignments a
     JOIN commission_members cm ON a.member_id = cm.id
     JOIN users u ON a.assigned_by = u.id
     WHERE a.id = ?`,
    [req.params.id]
  );

  if (rows.length === 0) {
    return res.status(404).json({ message: 'Доручення не знайдено' });
  }

  res.json(rows[0]);
});

router.post('/', requireRole('admin', 'secretary'), async (req, res) => {
  const { member_id, title, description, deadline, status } = req.body;

  if (!member_id || !title?.trim() || !deadline) {
    return res.status(400).json({ message: 'Заповніть члена комісії, назву та термін' });
  }

  const finalStatus = resolveStatusOnSave(status || 'in_progress', deadline);
  const completedAt = finalStatus === 'completed' ? new Date() : null;

  const [result] = await pool.query(
    `INSERT INTO assignments (member_id, title, description, deadline, status, assigned_by, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      member_id,
      title.trim(),
      description?.trim() || null,
      deadline,
      finalStatus,
      req.user.id,
      completedAt,
    ]
  );

  await logAction(
    req.user.id,
    'create',
    'assignments',
    result.insertId,
    `Створено доручення: ${title.trim()}`
  );

  const [rows] = await pool.query('SELECT * FROM assignments WHERE id = ?', [result.insertId]);
  res.status(201).json(rows[0]);
});

router.put('/:id', requireRole('admin', 'secretary'), async (req, res) => {
  const { member_id, title, description, deadline, status } = req.body;

  if (!member_id || !title?.trim() || !deadline) {
    return res.status(400).json({ message: 'Заповніть члена комісії, назву та термін' });
  }

  const [existing] = await pool.query('SELECT id FROM assignments WHERE id = ?', [req.params.id]);
  if (existing.length === 0) {
    return res.status(404).json({ message: 'Доручення не знайдено' });
  }

  const finalStatus = resolveStatusOnSave(status, deadline);
  const completedAt = finalStatus === 'completed' ? new Date() : null;

  await pool.query(
    `UPDATE assignments
     SET member_id = ?, title = ?, description = ?, deadline = ?, status = ?, completed_at = ?
     WHERE id = ?`,
    [member_id, title.trim(), description?.trim() || null, deadline, finalStatus, completedAt, req.params.id]
  );

  await logAction(
    req.user.id,
    'update',
    'assignments',
    Number(req.params.id),
    `Оновлено доручення: ${title.trim()} (статус: ${finalStatus})`
  );

  const [rows] = await pool.query('SELECT * FROM assignments WHERE id = ?', [req.params.id]);
  res.json(rows[0]);
});

router.patch('/:id/status', requireRole('admin', 'secretary'), async (req, res) => {
  const { status } = req.body;

  if (!['in_progress', 'completed', 'overdue'].includes(status)) {
    return res.status(400).json({ message: 'Невірний статус' });
  }

  const [existing] = await pool.query('SELECT * FROM assignments WHERE id = ?', [req.params.id]);
  if (existing.length === 0) {
    return res.status(404).json({ message: 'Доручення не знайдено' });
  }

  const assignment = existing[0];
  let finalStatus = status;

  if (status === 'in_progress') {
    finalStatus = resolveStatusOnSave('in_progress', assignment.deadline);
  }

  const completedAt = finalStatus === 'completed' ? new Date() : null;

  await pool.query('UPDATE assignments SET status = ?, completed_at = ? WHERE id = ?', [
    finalStatus,
    completedAt,
    req.params.id,
  ]);

  const statusLabels = {
    in_progress: 'виконується',
    completed: 'виконано',
    overdue: 'прострочено',
  };

  await logAction(
    req.user.id,
    'update',
    'assignments',
    Number(req.params.id),
    `Змінено статус доручення на "${statusLabels[finalStatus]}"`
  );

  const [rows] = await pool.query('SELECT * FROM assignments WHERE id = ?', [req.params.id]);
  res.json(rows[0]);
});

router.delete('/:id', requireRole('admin', 'secretary'), async (req, res) => {
  const [existing] = await pool.query('SELECT title FROM assignments WHERE id = ?', [req.params.id]);
  if (existing.length === 0) {
    return res.status(404).json({ message: 'Доручення не знайдено' });
  }

  await pool.query('DELETE FROM assignments WHERE id = ?', [req.params.id]);
  await logAction(
    req.user.id,
    'delete',
    'assignments',
    Number(req.params.id),
    `Видалено доручення: ${existing[0].title}`
  );
  res.json({ message: 'Видалено' });
});

module.exports = router;
