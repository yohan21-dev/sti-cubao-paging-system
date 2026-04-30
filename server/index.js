require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
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

app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/pages', pageRoutes);

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
