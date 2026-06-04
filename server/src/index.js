require('dotenv').config();
const express = require('express');
const cors = require('cors');

const pool = require('./db');
const authRoutes = require('./routes/auth');

const PORT = process.env.PORT || 5000;

const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

app.use('/api/auth', authRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Маршрут не знайдено' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Внутрішня помилка сервера' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
