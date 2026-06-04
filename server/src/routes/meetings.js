const express = require('express');
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

const router = express.Router();

const SORT_FIELDS = {
  title: 'm.title',
  meeting_date: 'm.meeting_date',
  status: 'm.status',
  created_at: 'm.created_at',
};

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { search = '', status, sort = 'meeting_date', order = 'desc' } = req.query;
  const sortColumn = SORT_FIELDS[sort] || SORT_FIELDS.meeting_date;
  const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let sql = `
    SELECT m.*, u.full_name AS created_by_name,
      (SELECT COUNT(*) FROM protocols p WHERE p.meeting_id = m.id) AS protocols_count,
      (SELECT COUNT(*) FROM commission_documents d WHERE d.meeting_id = m.id) AS documents_count
    FROM meetings m
    JOIN users u ON m.created_by = u.id
    WHERE 1=1
  `;
  const params = [];

  if (search.trim()) {
    sql += ' AND (m.title LIKE ? OR m.location LIKE ? OR m.description LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  if (status && ['planned', 'held', 'cancelled'].includes(status)) {
    sql += ' AND m.status = ?';
    params.push(status);
  }

  sql += ` ORDER BY ${sortColumn} ${sortOrder}`;
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT m.*, u.full_name AS created_by_name
     FROM meetings m
     JOIN users u ON m.created_by = u.id
     WHERE m.id = ?`,
    [req.params.id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Засідання не знайдено' });
  }
  res.json(rows[0]);
});

router.post('/', requireRole('admin', 'secretary'), async (req, res) => {
  const { title, meeting_date, location, status, description } = req.body;
  if (!title?.trim() || !meeting_date) {
    return res.status(400).json({ message: 'Заповніть назву та дату засідання' });
  }

  const meetingStatus = ['planned', 'held', 'cancelled'].includes(status) ? status : 'planned';

  const [result] = await pool.query(
    `INSERT INTO meetings (title, meeting_date, location, status, description, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      title.trim(),
      meeting_date,
      location?.trim() || null,
      meetingStatus,
      description?.trim() || null,
      req.user.id,
    ]
  );

  await logAction(req.user.id, 'create', 'meetings', result.insertId, `Створено засідання: ${title.trim()}`);

  const [rows] = await pool.query('SELECT * FROM meetings WHERE id = ?', [result.insertId]);
  res.status(201).json(rows[0]);
});

router.put('/:id', requireRole('admin', 'secretary'), async (req, res) => {
  const { title, meeting_date, location, status, description } = req.body;
  if (!title?.trim() || !meeting_date) {
    return res.status(400).json({ message: 'Заповніть назву та дату засідання' });
  }

  const [existing] = await pool.query('SELECT id FROM meetings WHERE id = ?', [req.params.id]);
  if (existing.length === 0) {
    return res.status(404).json({ message: 'Засідання не знайдено' });
  }

  const meetingStatus = ['planned', 'held', 'cancelled'].includes(status) ? status : 'planned';

  await pool.query(
    `UPDATE meetings SET title = ?, meeting_date = ?, location = ?, status = ?, description = ?
     WHERE id = ?`,
    [title.trim(), meeting_date, location?.trim() || null, meetingStatus, description?.trim() || null, req.params.id]
  );

  await logAction(req.user.id, 'update', 'meetings', Number(req.params.id), `Оновлено засідання: ${title.trim()}`);

  const [rows] = await pool.query('SELECT * FROM meetings WHERE id = ?', [req.params.id]);
  res.json(rows[0]);
});

router.delete('/:id', requireRole('admin', 'secretary'), async (req, res) => {
  const [existing] = await pool.query('SELECT title FROM meetings WHERE id = ?', [req.params.id]);
  if (existing.length === 0) {
    return res.status(404).json({ message: 'Засідання не знайдено' });
  }

  await pool.query('DELETE FROM meetings WHERE id = ?', [req.params.id]);
  await logAction(req.user.id, 'delete', 'meetings', Number(req.params.id), `Видалено засідання: ${existing[0].title}`);
  res.json({ message: 'Видалено' });
});

module.exports = router;
