require('dotenv').config();
const express   = require('express');
const http      = require('http');
const { Server } = require('socket.io');
const cors      = require('cors');
const path      = require('path');

const { settingsRouter } = require('./routes/settings');

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || '*', methods: ['GET','POST','PUT','DELETE'] },
  transports: ['websocket', 'polling'],
});

app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.set('io', io);  // ← THIS is the critical missing line

app.use('/api/auth',        require('./routes/auth'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/faculty',     require('./routes/faculty'));
app.use('/api/queue',       require('./routes/queue'));
app.use('/api/settings',    settingsRouter);
app.use('/api/admin',       require('./routes/admin'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

io.on('connection', (socket) => {
  console.log(`[socket] connected: ${socket.id}`);
  socket.on('join:faculty-room', () => socket.join('faculty-room'));
  socket.on('join:outside',      () => socket.join('outside'));
  socket.on('disconnect', () => console.log(`[socket] disconnected: ${socket.id}`));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));