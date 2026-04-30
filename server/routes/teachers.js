const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/connection');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/teachers — public, supports ?department_id=
router.get('/', async (req, res) => {
  const { department_id } = req.query;

  try {
    let query = `
      SELECT t.*, d.name AS department_name
      FROM teachers t
      LEFT JOIN departments d ON t.department_id = d.id
    `;
    const params = [];

    if (department_id) {
      query += ' WHERE t.department_id = ?';
      params.push(department_id);
    }

    query += ' ORDER BY t.last_name ASC, t.first_name ASC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Get teachers error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/teachers/:id — public
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT t.*, d.name AS department_name
       FROM teachers t
       LEFT JOIN departments d ON t.department_id = d.id
       WHERE t.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Teacher not found.' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Get teacher error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/teachers — protected
router.post(
  '/',
  auth,
  [
    body('first_name').trim().notEmpty().withMessage('First name is required.'),
    body('last_name').trim().notEmpty().withMessage('Last name is required.'),
    body('department_id').isInt({ gt: 0 }).withMessage('Valid department ID is required.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { first_name, last_name, department_id, email, status } = req.body;

    try {
      const [dept] = await pool.query('SELECT id FROM departments WHERE id = ?', [department_id]);
      if (dept.length === 0) {
        return res.status(400).json({ message: 'Department not found.' });
      }

      const [result] = await pool.query(
        'INSERT INTO teachers (first_name, last_name, department_id, email, status) VALUES (?, ?, ?, ?, ?)',
        [first_name, last_name, department_id, email || null, status || 'available']
      );

      const [rows] = await pool.query(
        `SELECT t.*, d.name AS department_name
         FROM teachers t
         LEFT JOIN departments d ON t.department_id = d.id
         WHERE t.id = ?`,
        [result.insertId]
      );

      res.status(201).json(rows[0]);
    } catch (err) {
      console.error('Create teacher error:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// PUT /api/teachers/:id — protected
router.put(
  '/:id',
  auth,
  [
    body('first_name').trim().notEmpty().withMessage('First name is required.'),
    body('last_name').trim().notEmpty().withMessage('Last name is required.'),
    body('department_id').isInt({ gt: 0 }).withMessage('Valid department ID is required.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { first_name, last_name, department_id, email, status } = req.body;

    try {
      const [existing] = await pool.query('SELECT id FROM teachers WHERE id = ?', [id]);
      if (existing.length === 0) {
        return res.status(404).json({ message: 'Teacher not found.' });
      }

      const [dept] = await pool.query('SELECT id FROM departments WHERE id = ?', [department_id]);
      if (dept.length === 0) {
        return res.status(400).json({ message: 'Department not found.' });
      }

      await pool.query(
        'UPDATE teachers SET first_name = ?, last_name = ?, department_id = ?, email = ?, status = ? WHERE id = ?',
        [first_name, last_name, department_id, email || null, status || 'available', id]
      );

      const [rows] = await pool.query(
        `SELECT t.*, d.name AS department_name
         FROM teachers t
         LEFT JOIN departments d ON t.department_id = d.id
         WHERE t.id = ?`,
        [id]
      );

      res.json(rows[0]);
    } catch (err) {
      console.error('Update teacher error:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// DELETE /api/teachers/:id — protected
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await pool.query('SELECT id FROM teachers WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Teacher not found.' });
    }

    await pool.query('DELETE FROM teachers WHERE id = ?', [id]);
    res.json({ message: 'Teacher deleted.' });
  } catch (err) {
    console.error('Delete teacher error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
