const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../db/connection');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('Username is required.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', [username]);

      if (rows.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      const user = rows[0];
      const passwordMatch = await bcrypt.compare(password, user.password_hash);

      if (!passwordMatch) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: { id: user.id, username: user.username, role: user.role },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// POST /api/auth/register — admin only
router.post(
  '/register',
  auth,
  [
    body('username').trim().notEmpty().withMessage('Username is required.'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters.'),
    body('role')
      .optional()
      .isIn(['admin', 'staff'])
      .withMessage('Role must be admin or staff.'),
  ],
  async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden. Admin access only.' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, role = 'staff' } = req.body;

    try {
      const [existing] = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [username]);
      if (existing.length > 0) {
        return res.status(409).json({ message: 'Username already exists.' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const [result] = await pool.query(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        [username, passwordHash, role]
      );

      res.status(201).json({ id: result.insertId, username, role });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

module.exports = router;
