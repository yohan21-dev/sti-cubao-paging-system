// server/routes/students.js
// Connects to the separate sti_cubao database for student lookups.
// Public endpoint — no auth required (students use this on the kiosk).

const express    = require('express');
const router     = express.Router();
const studentDb  = require('../db_students');

// GET /api/students/:studentNumber
// Returns basic student info for the kiosk auto-fill.
// Deliberately returns only non-sensitive fields.
router.get('/:studentNumber', async (req, res) => {
  const sn = req.params.studentNumber.trim();

  // Basic sanity check — student numbers should be alphanumeric
  if (!/^[A-Za-z0-9\-]+$/.test(sn)) {
    return res.status(400).json({ error: 'Invalid student number format' });
  }

  try {
    const [rows] = await studentDb.query(
      `SELECT student_number, last_name, first_name, program, section
       FROM students
       WHERE student_number = ?
       LIMIT 1`,
      [sn]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Student number not found. Please check and try again.' });
    }

    const s = rows[0];
    res.json({
      student_number: s.student_number,
      // Return full name formatted
      full_name: `${s.first_name} ${s.last_name}`,
      first_name: s.first_name,
      last_name:  s.last_name,
      program:    s.program  || '',
      section:    s.section  || '',
    });
  } catch (err) {
    console.error('[students] DB error:', err.message);
    // If sti_cubao DB is unreachable, return a clear message
    if (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR') {
      return res.status(503).json({ error: 'Student database temporarily unavailable. Please enter details manually.' });
    }
    res.status(500).json({ error: 'Could not look up student. Please enter details manually.' });
  }
});

module.exports = router;