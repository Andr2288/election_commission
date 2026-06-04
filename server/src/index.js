require('dotenv').config();
const express = require('express');
const cors = require('cors');

const pool = require('./db');
const authRoutes = require('./routes/auth');
const commissionMembersRoutes = require('./routes/commissionMembers');
const meetingsRoutes = require('./routes/meetings');
const protocolsRoutes = require('./routes/protocols');
const documentsRoutes = require('./routes/documents');
const assignmentsRoutes = require('./routes/assignments');

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
app.use('/api/commission-members', commissionMembersRoutes);
app.use('/api/meetings', meetingsRoutes);
app.use('/api/protocols', protocolsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/assignments', assignmentsRoutes);

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
