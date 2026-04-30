const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/connection');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/pages — public (students use this)
router.post(
  '/',
  [
    body('teacher_id').isInt({ gt: 0 }).withMessage('Valid teacher ID is required.'),
    body('student_name').optional().trim(),
    body('message').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { teacher_id, student_name, message } = req.body;
    const io = req.app.get('io');

    try {
      const [teacher] = await pool.query(
        `SELECT t.*, d.name AS department_name
         FROM teachers t
         LEFT JOIN departments d ON t.department_id = d.id
         WHERE t.id = ?`,
        [teacher_id]
      );

      if (teacher.length === 0) {
        return res.status(404).json({ message: 'Teacher not found.' });
      }

      const [result] = await pool.query(
        'INSERT INTO pages (teacher_id, student_name, message, status) VALUES (?, ?, ?, ?)',
        [teacher_id, student_name || null, message || null, 'pending']
      );

      const [rows] = await pool.query(
        `SELECT p.*, t.first_name, t.last_name, d.name AS department_name
         FROM pages p
         JOIN teachers t ON p.teacher_id = t.id
         LEFT JOIN departments d ON t.department_id = d.id
         WHERE p.id = ?`,
        [result.insertId]
      );

      const pageData = rows[0];

      io.to('display').emit('new_page', pageData);

      res.status(201).json(pageData);
    } catch (err) {
      console.error('Create page error:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// GET /api/pages — protected, supports ?status= and ?teacher_id=
router.get('/', auth, async (req, res) => {
  const { status, teacher_id } = req.query;

  try {
    let query = `
      SELECT p.*, t.first_name, t.last_name, d.name AS department_name
      FROM pages p
      JOIN teachers t ON p.teacher_id = t.id
      LEFT JOIN departments d ON t.department_id = d.id
    `;
    const params = [];
    const conditions = [];

    if (status) {
      conditions.push('p.status = ?');
      params.push(status);
    }

    if (teacher_id) {
      conditions.push('p.teacher_id = ?');
      params.push(teacher_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY p.created_at DESC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Get pages error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// PATCH /api/pages/:id/resolve — protected
router.patch('/:id/resolve', auth, async (req, res) => {
  const { id } = req.params;
  const io = req.app.get('io');

  try {
    const [existing] = await pool.query('SELECT * FROM pages WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Page request not found.' });
    }

    await pool.query(
      'UPDATE pages SET status = ?, resolved_at = NOW() WHERE id = ?',
      ['resolved', id]
    );

    const [rows] = await pool.query(
      `SELECT p.*, t.first_name, t.last_name, d.name AS department_name
       FROM pages p
       JOIN teachers t ON p.teacher_id = t.id
       LEFT JOIN departments d ON t.department_id = d.id
       WHERE p.id = ?`,
      [id]
    );

    const pageData = rows[0];

    io.to('display').emit('page_resolved', pageData);

    res.json(pageData);
  } catch (err) {
    console.error('Resolve page error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE /api/pages/:id — protected
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await pool.query('SELECT id FROM pages WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Page request not found.' });
    }

    await pool.query('DELETE FROM pages WHERE id = ?', [id]);
    res.json({ message: 'Page request deleted.' });
  } catch (err) {
    console.error('Delete page error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
