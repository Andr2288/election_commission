const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

function createToken(user) {
  return jwt.sign(
    { id: user.id, login: user.login, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

router.post('/register', async (req, res) => {
  const { login, password, full_name, role } = req.body;

  if (!login || !password || !full_name) {
    return res.status(400).json({ message: 'Заповніть логін, пароль та ПІБ' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Пароль має містити щонайменше 6 символів' });
  }

  const allowedRoles = ['admin', 'secretary', 'member'];
  const userRole = allowedRoles.includes(role) ? role : 'secretary';

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (login, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
      [login.trim(), passwordHash, full_name.trim(), userRole]
    );

    const user = { id: result.insertId, login: login.trim(), role: userRole, full_name: full_name.trim() };
    res.status(201).json({ token: createToken(user), user });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Користувач з таким логіном вже існує' });
    }
    throw error;
  }
});

router.post('/login', async (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ message: 'Введіть логін та пароль' });
  }

  const [rows] = await pool.query(
    'SELECT id, login, password_hash, full_name, role FROM users WHERE login = ?',
    [login.trim()]
  );

  if (rows.length === 0) {
    return res.status(401).json({ message: 'Невірний логін або пароль' });
  }

  const user = rows[0];
  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    return res.status(401).json({ message: 'Невірний логін або пароль' });
  }

  await pool.query(
    'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
    [user.id, 'login', 'users', user.id, `Користувач ${user.login} увійшов у систему`]
  );

  const { password_hash, ...safeUser } = user;
  res.json({ token: createToken(safeUser), user: safeUser });
});

router.get('/me', authMiddleware, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, login, full_name, role, created_at FROM users WHERE id = ?',
    [req.user.id]
  );

  if (rows.length === 0) {
    return res.status(404).json({ message: 'Користувача не знайдено' });
  }

  res.json(rows[0]);
});

module.exports = router;
