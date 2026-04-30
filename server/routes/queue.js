const express = require('express');
const router  = express.Router();
const db      = require('../db');
const auth    = require('../middleware/auth');

const FULL_SELECT = `
  SELECT q.*,
         f.name        AS faculty_name,
         f.photo       AS faculty_photo,
         f.designation AS faculty_designation,
         f.dnd,
         d.name        AS department_name
  FROM page_queue q
  JOIN faculty f ON q.faculty_id = f.id
  JOIN departments d ON f.department_id = d.id
`;

// GET /api/queue/active  — faculty room display
router.get('/active', async (req, res) => {
  try {
    const [rows] = await db.query(
      FULL_SELECT +
      " WHERE q.status IN ('waiting','acknowledged') ORDER BY q.created_at ASC"
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/queue/logs  — admin
router.get('/logs', auth, async (req, res) => {
  const { date, faculty_id } = req.query;
  try {
    let sql = 'SELECT * FROM page_logs WHERE 1=1';
    const params = [];
    if (date)       { sql += ' AND DATE(created_at) = ?'; params.push(date); }
    if (faculty_id) { sql += ' AND faculty_id = ?';       params.push(faculty_id); }
    sql += ' ORDER BY created_at DESC LIMIT 500';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/queue/stats  — admin dashboard
router.get('/stats', auth, async (req, res) => {
  try {
    const [[{ total }]]   = await db.query("SELECT COUNT(*) AS total FROM page_logs WHERE DATE(created_at)=CURDATE()");
    const [[{ done }]]    = await db.query("SELECT COUNT(*) AS done  FROM page_logs WHERE DATE(created_at)=CURDATE() AND status='done'");
    const [[{ cancelled }]] = await db.query("SELECT COUNT(*) AS cancelled FROM page_logs WHERE DATE(created_at)=CURDATE() AND status='cancelled'");
    const [[{ waiting }]] = await db.query("SELECT COUNT(*) AS waiting FROM page_queue WHERE status IN ('waiting','acknowledged')");
    res.json({ total, done, cancelled, waiting });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/queue/:id  — get single entry (for polling on kiosk)
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(FULL_SELECT + ' WHERE q.id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    // Count position in queue
    const [[{ pos }]] = await db.query(
      "SELECT COUNT(*) AS pos FROM page_queue WHERE faculty_id=? AND status='waiting' AND id<=?",
      [rows[0].faculty_id, req.params.id]
    );
    res.json({ ...rows[0], position: pos });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/queue  — student creates a page request
router.post('/', async (req, res) => {
  const { faculty_id, student_name, student_id, purpose, note } = req.body;
  if (!faculty_id || !student_name || !purpose)
    return res.status(400).json({ error: 'faculty_id, student_name, purpose required' });

  try {
    // Check DND / availability
    const [[faculty]] = await db.query(
      'SELECT id, name, dnd, available FROM faculty WHERE id = ?', [faculty_id]
    );
    if (!faculty)       return res.status(404).json({ error: 'Faculty not found' });
    if (faculty.dnd)    return res.status(400).json({ error: 'Faculty is currently unavailable (Do Not Disturb)' });
    if (!faculty.available) return res.status(400).json({ error: 'Faculty is not available right now' });

    // Queue number = count of today's entries for this faculty + 1
    const [[{ n }]] = await db.query(
      "SELECT COUNT(*) AS n FROM page_queue WHERE faculty_id=? AND DATE(created_at)=CURDATE()",
      [faculty_id]
    );

    const [result] = await db.query(
      'INSERT INTO page_queue (faculty_id, student_name, student_id, purpose, note, queue_number) VALUES (?,?,?,?,?,?)',
      [faculty_id, student_name.trim(), student_id?.trim() || null, purpose, note?.trim() || null, n + 1]
    );

    const [rows] = await db.query(FULL_SELECT + ' WHERE q.id = ?', [result.insertId]);
    const entry  = rows[0];

    // Count position for this student
    const [[{ pos }]] = await db.query(
      "SELECT COUNT(*) AS pos FROM page_queue WHERE faculty_id=? AND status='waiting' AND id<=?",
      [faculty_id, result.insertId]
    );

    // Broadcast to faculty-room
    const io = req.app.get('io');
    io.to('faculty-room').emit('page:new', entry);

    res.json({ ...entry, position: pos });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/queue/:id/acknowledge
router.put('/:id/acknowledge', async (req, res) => {
  try {
    await db.query("UPDATE page_queue SET status='acknowledged' WHERE id=?", [req.params.id]);
    const io = req.app.get('io');
    io.emit('page:acknowledged', { id: parseInt(req.params.id) });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/queue/:id/done  — archive entry to logs
router.put('/:id/done', async (req, res) => {
  try {
    const [rows] = await db.query(FULL_SELECT + ' WHERE q.id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    const e = rows[0];
    await db.query("UPDATE page_queue SET status='done' WHERE id=?", [req.params.id]);
    await db.query(
      'INSERT INTO page_logs (faculty_id,faculty_name,department,student_name,student_id,purpose,status) VALUES (?,?,?,?,?,?,?)',
      [e.faculty_id, e.faculty_name, e.department_name, e.student_name, e.student_id, e.purpose, 'done']
    );

    const io = req.app.get('io');
    io.emit('page:done', { id: parseInt(req.params.id) });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/queue/:id/cancel  — cancelled from kiosk or faculty room
router.put('/:id/cancel', async (req, res) => {
  try {
    const [rows] = await db.query(FULL_SELECT + ' WHERE q.id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    const e = rows[0];
    await db.query("UPDATE page_queue SET status='cancelled' WHERE id=?", [req.params.id]);
    await db.query(
      'INSERT INTO page_logs (faculty_id,faculty_name,department,student_name,student_id,purpose,status) VALUES (?,?,?,?,?,?,?)',
      [e.faculty_id, e.faculty_name, e.department_name, e.student_name, e.student_id, e.purpose, 'cancelled']
    );

    const io = req.app.get('io');
    io.emit('page:cancelled', { id: parseInt(req.params.id) });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
