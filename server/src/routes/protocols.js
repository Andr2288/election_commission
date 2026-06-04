const express = require('express');
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

const router = express.Router();

const SORT_FIELDS = {
  protocol_number: 'p.protocol_number',
  created_at: 'p.created_at',
  meeting_date: 'm.meeting_date',
};

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { search = '', meeting_id, sort = 'created_at', order = 'desc' } = req.query;
  const sortColumn = SORT_FIELDS[sort] || SORT_FIELDS.created_at;
  const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let sql = `
    SELECT p.*, m.title AS meeting_title, m.meeting_date, u.full_name AS created_by_name
    FROM protocols p
    JOIN meetings m ON p.meeting_id = m.id
    JOIN users u ON p.created_by = u.id
    WHERE 1=1
  `;
  const params = [];

  if (search.trim()) {
    sql += ' AND (p.protocol_number LIKE ? OR p.content LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term);
  }

  if (meeting_id) {
    sql += ' AND p.meeting_id = ?';
    params.push(meeting_id);
  }

  sql += ` ORDER BY ${sortColumn} ${sortOrder}`;
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT p.*, m.title AS meeting_title, u.full_name AS created_by_name
     FROM protocols p
     JOIN meetings m ON p.meeting_id = m.id
     JOIN users u ON p.created_by = u.id
     WHERE p.id = ?`,
    [req.params.id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Протокол не знайдено' });
  }
  res.json(rows[0]);
});

router.post('/', requireRole('admin', 'secretary'), async (req, res) => {
  const { meeting_id, protocol_number, content } = req.body;
  if (!meeting_id || !protocol_number?.trim() || !content?.trim()) {
    return res.status(400).json({ message: 'Заповніть засідання, номер та зміст протоколу' });
  }

  const [result] = await pool.query(
    `INSERT INTO protocols (meeting_id, protocol_number, content, created_by)
     VALUES (?, ?, ?, ?)`,
    [meeting_id, protocol_number.trim(), content.trim(), req.user.id]
  );

  await logAction(
    req.user.id,
    'create',
    'protocols',
    result.insertId,
    `Створено протокол ${protocol_number.trim()}`
  );

  const [rows] = await pool.query('SELECT * FROM protocols WHERE id = ?', [result.insertId]);
  res.status(201).json(rows[0]);
});

router.put('/:id', requireRole('admin', 'secretary'), async (req, res) => {
  const { meeting_id, protocol_number, content } = req.body;
  if (!meeting_id || !protocol_number?.trim() || !content?.trim()) {
    return res.status(400).json({ message: 'Заповніть засідання, номер та зміст протоколу' });
  }

  const [existing] = await pool.query('SELECT id FROM protocols WHERE id = ?', [req.params.id]);
  if (existing.length === 0) {
    return res.status(404).json({ message: 'Протокол не знайдено' });
  }

  await pool.query(
    'UPDATE protocols SET meeting_id = ?, protocol_number = ?, content = ? WHERE id = ?',
    [meeting_id, protocol_number.trim(), content.trim(), req.params.id]
  );

  await logAction(
    req.user.id,
    'update',
    'protocols',
    Number(req.params.id),
    `Оновлено протокол ${protocol_number.trim()}`
  );

  const [rows] = await pool.query('SELECT * FROM protocols WHERE id = ?', [req.params.id]);
  res.json(rows[0]);
});

router.delete('/:id', requireRole('admin', 'secretary'), async (req, res) => {
  const [existing] = await pool.query('SELECT protocol_number FROM protocols WHERE id = ?', [req.params.id]);
  if (existing.length === 0) {
    return res.status(404).json({ message: 'Протокол не знайдено' });
  }

  await pool.query('DELETE FROM protocols WHERE id = ?', [req.params.id]);
  await logAction(
    req.user.id,
    'delete',
    'protocols',
    Number(req.params.id),
    `Видалено протокол ${existing[0].protocol_number}`
  );
  res.json({ message: 'Видалено' });
});

module.exports = router;
