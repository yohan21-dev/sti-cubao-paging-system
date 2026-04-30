require('dotenv').config();

// Fail fast if critical env vars are missing
const REQUIRED_ENV = ['JWT_SECRET'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[Config] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const express = require('express');
const http = require('http');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const pool = require('./db/connection');
const { initSocket } = require('./socket/handlers');

const authRoutes = require('./routes/auth');
const departmentRoutes = require('./routes/departments');
const teacherRoutes = require('./routes/teachers');
const pageRoutes = require('./routes/pages');

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

app.set('io', io);

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

// Strict rate limit for auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again later.' },
});

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again later.' },
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/departments', apiLimiter, departmentRoutes);
app.use('/api/teachers', apiLimiter, teacherRoutes);
app.use('/api/pages', apiLimiter, pageRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

initSocket(io);

const PORT = parseInt(process.env.PORT, 10) || 5000;

server.listen(PORT, async () => {
  console.log(`[Server] STI Cubao Paging System running on port ${PORT}`);

  try {
    const connection = await pool.getConnection();
    console.log('[DB] MySQL connected successfully');
    connection.release();
  } catch (err) {
    console.error('[DB] Failed to connect to MySQL:', err.message);
  }
});
