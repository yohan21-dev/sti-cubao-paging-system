const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const db      = require('../db');
const auth    = require('../middleware/auth');

// GET /api/admin/users
router.get('/users', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, username, full_name, created_at FROM admin_users ORDER BY created_at'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/users
router.post('/users', auth, async (req, res) => {
  const { username, password, full_name } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });
  try {
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO admin_users (username, password, full_name) VALUES (?,?,?)',
      [username.trim(), hashed, full_name?.trim() || null]
    );
    res.json({ id: result.insertId, username, full_name: full_name || null });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(400).json({ error: 'Username already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/users/:id/password
router.put('/users/:id/password', auth, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });
  try {
    const hashed = await bcrypt.hash(password, 10);
    await db.query('UPDATE admin_users SET password=? WHERE id=?', [hashed, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', auth, async (req, res) => {
  if (parseInt(req.params.id) === req.user.id)
    return res.status(400).json({ error: 'Cannot delete your own account' });
  try {
    await db.query('DELETE FROM admin_users WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
