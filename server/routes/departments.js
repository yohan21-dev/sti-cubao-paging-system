const express = require('express');
const router  = express.Router();
const db      = require('../db');
const auth    = require('../middleware/auth');

// GET /api/departments  — public, active only
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM departments WHERE active = 1 ORDER BY name'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/departments/all  — admin, all
router.get('/all', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM departments ORDER BY name');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/departments
router.post('/', auth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  try {
    const [result] = await db.query(
      'INSERT INTO departments (name) VALUES (?)', [name.trim()]
    );
    res.json({ id: result.insertId, name: name.trim(), active: 1 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/departments/:id
router.put('/:id', auth, async (req, res) => {
  const { name, active } = req.body;
  try {
    await db.query(
      'UPDATE departments SET name = ?, active = ? WHERE id = ?',
      [name, active, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/departments/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM departments WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
