/**
 * server.js – WalletWise API entry point
 */

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const referenceDataRoutes = require('./routes/referenceDataRoutes');
const incomeRoutes = require('./routes/incomeRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const balanceRoutes = require('./routes/balanceRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// ── Cron jobs ─────────────────────────────────────────────────────────────────
require('./jobs/dailyBalanceSnapshot');

const app = express();

// ── Global Middleware ─────────────────────────────────────────────────────────
app.use(express.json());
app.use(cors());

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'WalletWise API is running 🚀', status: 'ok' });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', referenceDataRoutes);
app.use('/api', incomeRoutes);
app.use('/api', expenseRoutes);
app.use('/api', balanceRoutes);
app.use('/api', dashboardRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`WalletWise server running on port ${PORT}`);
});
