const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/connection');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/departments — public
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM departments ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    console.error('Get departments error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/departments — protected
router.post(
  '/',
  auth,
  [body('name').trim().notEmpty().withMessage('Department name is required.')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description } = req.body;

    try {
      const [existing] = await pool.query('SELECT id FROM departments WHERE LOWER(name) = LOWER(?)', [name]);
      if (existing.length > 0) {
        return res.status(409).json({ message: 'Department already exists.' });
      }

      const [result] = await pool.query(
        'INSERT INTO departments (name, description) VALUES (?, ?)',
        [name, description || null]
      );

      const [rows] = await pool.query('SELECT * FROM departments WHERE id = ?', [result.insertId]);
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error('Create department error:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// PUT /api/departments/:id — protected
router.put(
  '/:id',
  auth,
  [body('name').trim().notEmpty().withMessage('Department name is required.')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description } = req.body;

    try {
      const [existing] = await pool.query('SELECT id FROM departments WHERE id = ?', [id]);
      if (existing.length === 0) {
        return res.status(404).json({ message: 'Department not found.' });
      }

      await pool.query(
        'UPDATE departments SET name = ?, description = ? WHERE id = ?',
        [name, description || null, id]
      );

      const [rows] = await pool.query('SELECT * FROM departments WHERE id = ?', [id]);
      res.json(rows[0]);
    } catch (err) {
      console.error('Update department error:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// DELETE /api/departments/:id — protected
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await pool.query('SELECT id FROM departments WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Department not found.' });
    }

    await pool.query('DELETE FROM departments WHERE id = ?', [id]);
    res.json({ message: 'Department deleted.' });
  } catch (err) {
    console.error('Delete department error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
