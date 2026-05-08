// server/routes/schedules.js
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const auth    = require('../middleware/auth');

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// ── Helpers ───────────────────────────────────────────────────

/**
 * Returns the current schedule slot for a faculty member (if any).
 * Used internally and by the queue route to block paging during class.
 */
async function getCurrentSlot(facultyId) {
  // DAYOFWEEK() in MySQL: 1=Sunday ... 7=Saturday  → subtract 1
  const [rows] = await db.query(`
    SELECT * FROM faculty_schedules
    WHERE faculty_id = ?
      AND day_of_week = (DAYOFWEEK(NOW()) - 1)
      AND TIME(NOW()) BETWEEN time_start AND time_end
      AND is_active = 1
    LIMIT 1
  `, [facultyId]);
  return rows[0] || null;
}

/**
 * Returns all schedule slots for today for a faculty member.
 */
async function getTodaySlots(facultyId) {
  const [rows] = await db.query(`
    SELECT * FROM faculty_schedules
    WHERE faculty_id = ?
      AND day_of_week = (DAYOFWEEK(NOW()) - 1)
      AND is_active = 1
    ORDER BY time_start
  `, [facultyId]);
  return rows;
}

// Export helpers for use in queue route
module.exports.getCurrentSlot = getCurrentSlot;
module.exports.getTodaySlots  = getTodaySlots;

// ── GET /api/schedules/faculty/:id  — all schedules for a faculty ──
router.get('/faculty/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT fs.*, f.name AS faculty_name, d.name AS department_name
      FROM faculty_schedules fs
      JOIN faculty f ON fs.faculty_id = f.id
      JOIN departments d ON f.department_id = d.id
      WHERE fs.faculty_id = ?
      ORDER BY fs.day_of_week, fs.time_start
    `, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/schedules/faculty/:id/today  — today's slots (public) ──
router.get('/faculty/:id/today', async (req, res) => {
  try {
    const slots = await getTodaySlots(req.params.id);
    const current = await getCurrentSlot(req.params.id);
    res.json({ slots, current: current || null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/schedules/faculty/:id/current  — current slot (public) ──
router.get('/faculty/:id/current', async (req, res) => {
  try {
    const slot = await getCurrentSlot(req.params.id);
    res.json(slot || null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/schedules/all  — all faculty schedules (admin) ──
router.get('/all', auth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT fs.*, f.name AS faculty_name, d.name AS department_name
      FROM faculty_schedules fs
      JOIN faculty f ON fs.faculty_id = f.id
      JOIN departments d ON f.department_id = d.id
      WHERE fs.is_active = 1
      ORDER BY f.name, fs.day_of_week, fs.time_start
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/schedules  — create one schedule entry ──
router.post('/', auth, async (req, res) => {
  const {
    faculty_id, day_of_week, time_start, time_end,
    subject_code, subject_name, room, section, schedule_type,
  } = req.body;

  if (!faculty_id || day_of_week == null || !time_start || !time_end)
    return res.status(400).json({ error: 'faculty_id, day_of_week, time_start, time_end required' });
  if (time_start >= time_end)
    return res.status(400).json({ error: 'time_end must be after time_start' });

  try {
    const [result] = await db.query(`
      INSERT INTO faculty_schedules
        (faculty_id, day_of_week, time_start, time_end, subject_code, subject_name, room, section, schedule_type)
      VALUES (?,?,?,?,?,?,?,?,?)
    `, [faculty_id, day_of_week, time_start, time_end,
        subject_code || null, subject_name || null,
        room || null, section || null,
        schedule_type || 'lecture']);
    const [rows] = await db.query('SELECT * FROM faculty_schedules WHERE id = ?', [result.insertId]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/schedules/bulk  — import many schedule entries ──
router.post('/bulk', auth, async (req, res) => {
  const { schedules, replace_faculty_id } = req.body;
  if (!Array.isArray(schedules) || schedules.length === 0)
    return res.status(400).json({ error: 'schedules array required' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // If replace mode: delete existing schedules for specified faculty
    if (replace_faculty_id) {
      await conn.query('DELETE FROM faculty_schedules WHERE faculty_id = ?', [replace_faculty_id]);
    }

    const inserted = [];
    for (const s of schedules) {
      if (!s.faculty_id || s.day_of_week == null || !s.time_start || !s.time_end) continue;
      if (s.time_start >= s.time_end) continue;

      const [result] = await conn.query(`
        INSERT INTO faculty_schedules
          (faculty_id, day_of_week, time_start, time_end, subject_code, subject_name, room, section, schedule_type)
        VALUES (?,?,?,?,?,?,?,?,?)
      `, [s.faculty_id, s.day_of_week, s.time_start, s.time_end,
          s.subject_code || null, s.subject_name || null,
          s.room || null, s.section || null,
          s.schedule_type || 'lecture']);
      inserted.push(result.insertId);
    }

    await conn.commit();
    res.json({ inserted: inserted.length, ids: inserted });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ── PUT /api/schedules/:id  — update a schedule entry ──
router.put('/:id', auth, async (req, res) => {
  const {
    day_of_week, time_start, time_end,
    subject_code, subject_name, room, section, schedule_type, is_active,
  } = req.body;
  try {
    await db.query(`
      UPDATE faculty_schedules
      SET day_of_week=?, time_start=?, time_end=?,
          subject_code=?, subject_name=?, room=?, section=?,
          schedule_type=?, is_active=?
      WHERE id=?
    `, [day_of_week, time_start, time_end,
        subject_code || null, subject_name || null,
        room || null, section || null,
        schedule_type || 'lecture',
        is_active ?? 1,
        req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /api/schedules/:id ──
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM faculty_schedules WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /api/schedules/faculty/:id/all  — clear all schedules for a faculty ──
router.delete('/faculty/:id/all', auth, async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM faculty_schedules WHERE faculty_id = ?', [req.params.id]);
    res.json({ deleted: result.affectedRows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;