const express = require('express');
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

const router = express.Router();

const SORT_FIELDS = {
  full_name: 'cm.full_name',
  position: 'cm.position',
  email: 'cm.email',
  created_at: 'cm.created_at',
};

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { search = '', is_active, sort = 'full_name', order = 'asc' } = req.query;

  const sortColumn = SORT_FIELDS[sort] || SORT_FIELDS.full_name;
  const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  let sql = `
    SELECT cm.*, u.login AS user_login
    FROM commission_members cm
    LEFT JOIN users u ON cm.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (search.trim()) {
    sql += ` AND (cm.full_name LIKE ? OR cm.position LIKE ? OR cm.email LIKE ? OR cm.phone LIKE ?)`;
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }

  if (is_active === '1' || is_active === '0') {
    sql += ' AND cm.is_active = ?';
    params.push(Number(is_active));
  }

  sql += ` ORDER BY ${sortColumn} ${sortOrder}`;

  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT cm.*, u.login AS user_login
     FROM commission_members cm
     LEFT JOIN users u ON cm.user_id = u.id
     WHERE cm.id = ?`,
    [req.params.id]
  );

  if (rows.length === 0) {
    return res.status(404).json({ message: 'Члена комісії не знайдено' });
  }

  res.json(rows[0]);
});

router.post('/', requireRole('admin', 'secretary'), async (req, res) => {
  const { full_name, position, phone, email, is_active, user_id } = req.body;

  if (!full_name?.trim() || !position?.trim()) {
    return res.status(400).json({ message: 'Заповніть ПІБ та посаду' });
  }

  const [result] = await pool.query(
    `INSERT INTO commission_members (full_name, position, phone, email, is_active, user_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      full_name.trim(),
      position.trim(),
      phone?.trim() || null,
      email?.trim() || null,
      is_active === false || is_active === 0 ? 0 : 1,
      user_id || null,
    ]
  );

  await logAction(
    req.user.id,
    'create',
    'commission_members',
    result.insertId,
    `Додано члена комісії: ${full_name.trim()}`
  );

  const [rows] = await pool.query('SELECT * FROM commission_members WHERE id = ?', [result.insertId]);
  res.status(201).json(rows[0]);
});

router.put('/:id', requireRole('admin', 'secretary'), async (req, res) => {
  const { full_name, position, phone, email, is_active, user_id } = req.body;

  if (!full_name?.trim() || !position?.trim()) {
    return res.status(400).json({ message: 'Заповніть ПІБ та посаду' });
  }

  const [existing] = await pool.query('SELECT id FROM commission_members WHERE id = ?', [req.params.id]);
  if (existing.length === 0) {
    return res.status(404).json({ message: 'Члена комісії не знайдено' });
  }

  await pool.query(
    `UPDATE commission_members
     SET full_name = ?, position = ?, phone = ?, email = ?, is_active = ?, user_id = ?
     WHERE id = ?`,
    [
      full_name.trim(),
      position.trim(),
      phone?.trim() || null,
      email?.trim() || null,
      is_active === false || is_active === 0 ? 0 : 1,
      user_id || null,
      req.params.id,
    ]
  );

  await logAction(
    req.user.id,
    'update',
    'commission_members',
    Number(req.params.id),
    `Оновлено члена комісії: ${full_name.trim()}`
  );

  const [rows] = await pool.query('SELECT * FROM commission_members WHERE id = ?', [req.params.id]);
  res.json(rows[0]);
});

router.delete('/:id', requireRole('admin', 'secretary'), async (req, res) => {
  const [existing] = await pool.query('SELECT full_name FROM commission_members WHERE id = ?', [req.params.id]);
  if (existing.length === 0) {
    return res.status(404).json({ message: 'Члена комісії не знайдено' });
  }

  await pool.query('DELETE FROM commission_members WHERE id = ?', [req.params.id]);

  await logAction(
    req.user.id,
    'delete',
    'commission_members',
    Number(req.params.id),
    `Видалено члена комісії: ${existing[0].full_name}`
  );

  res.json({ message: 'Видалено' });
});

module.exports = router;
