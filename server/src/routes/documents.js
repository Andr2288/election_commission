const express = require('express');
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

const router = express.Router();

const SORT_FIELDS = {
  document_number: 'd.document_number',
  title: 'd.title',
  document_date: 'd.document_date',
  created_at: 'd.created_at',
};

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { search = '', type, meeting_id, sort = 'document_date', order = 'desc' } = req.query;
  const sortColumn = SORT_FIELDS[sort] || SORT_FIELDS.document_date;
  const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let sql = `
    SELECT d.*, m.title AS meeting_title, u.full_name AS created_by_name
    FROM commission_documents d
    LEFT JOIN meetings m ON d.meeting_id = m.id
    JOIN users u ON d.created_by = u.id
    WHERE 1=1
  `;
  const params = [];

  if (search.trim()) {
    sql += ' AND (d.document_number LIKE ? OR d.title LIKE ? OR d.content LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  if (type && ['resolution', 'decision'].includes(type)) {
    sql += ' AND d.type = ?';
    params.push(type);
  }

  if (meeting_id) {
    sql += ' AND d.meeting_id = ?';
    params.push(meeting_id);
  }

  sql += ` ORDER BY ${sortColumn} ${sortOrder}`;
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT d.*, m.title AS meeting_title, u.full_name AS created_by_name
     FROM commission_documents d
     LEFT JOIN meetings m ON d.meeting_id = m.id
     JOIN users u ON d.created_by = u.id
     WHERE d.id = ?`,
    [req.params.id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Документ не знайдено' });
  }
  res.json(rows[0]);
});

router.post('/', requireRole('admin', 'secretary'), async (req, res) => {
  const { meeting_id, type, document_number, title, content, document_date } = req.body;
  if (!type || !document_number?.trim() || !title?.trim() || !content?.trim() || !document_date) {
    return res.status(400).json({ message: 'Заповніть обовʼязкові поля документа' });
  }
  if (!['resolution', 'decision'].includes(type)) {
    return res.status(400).json({ message: 'Невірний тип документа' });
  }

  const [result] = await pool.query(
    `INSERT INTO commission_documents (meeting_id, type, document_number, title, content, document_date, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      meeting_id || null,
      type,
      document_number.trim(),
      title.trim(),
      content.trim(),
      document_date,
      req.user.id,
    ]
  );

  const typeLabel = type === 'resolution' ? 'Постанова' : 'Рішення';
  await logAction(
    req.user.id,
    'create',
    'commission_documents',
    result.insertId,
    `Створено ${typeLabel} ${document_number.trim()}`
  );

  const [rows] = await pool.query('SELECT * FROM commission_documents WHERE id = ?', [result.insertId]);
  res.status(201).json(rows[0]);
});

router.put('/:id', requireRole('admin', 'secretary'), async (req, res) => {
  const { meeting_id, type, document_number, title, content, document_date } = req.body;
  if (!type || !document_number?.trim() || !title?.trim() || !content?.trim() || !document_date) {
    return res.status(400).json({ message: 'Заповніть обовʼязкові поля документа' });
  }

  const [existing] = await pool.query('SELECT id FROM commission_documents WHERE id = ?', [req.params.id]);
  if (existing.length === 0) {
    return res.status(404).json({ message: 'Документ не знайдено' });
  }

  await pool.query(
    `UPDATE commission_documents
     SET meeting_id = ?, type = ?, document_number = ?, title = ?, content = ?, document_date = ?
     WHERE id = ?`,
    [
      meeting_id || null,
      type,
      document_number.trim(),
      title.trim(),
      content.trim(),
      document_date,
      req.params.id,
    ]
  );

  await logAction(
    req.user.id,
    'update',
    'commission_documents',
    Number(req.params.id),
    `Оновлено документ ${document_number.trim()}`
  );

  const [rows] = await pool.query('SELECT * FROM commission_documents WHERE id = ?', [req.params.id]);
  res.json(rows[0]);
});

router.delete('/:id', requireRole('admin', 'secretary'), async (req, res) => {
  const [existing] = await pool.query('SELECT document_number FROM commission_documents WHERE id = ?', [
    req.params.id,
  ]);
  if (existing.length === 0) {
    return res.status(404).json({ message: 'Документ не знайдено' });
  }

  await pool.query('DELETE FROM commission_documents WHERE id = ?', [req.params.id]);
  await logAction(
    req.user.id,
    'delete',
    'commission_documents',
    Number(req.params.id),
    `Видалено документ ${existing[0].document_number}`
  );
  res.json({ message: 'Видалено' });
});

module.exports = router;
