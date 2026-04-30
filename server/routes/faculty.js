const express = require('express');
const router  = express.Router();
const db      = require('../db');
const auth    = require('../middleware/auth');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// ── Multer setup ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/faculty');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `faculty_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// ── Helpers ───────────────────────────────────────────────────
const FACULTY_SELECT = `
  SELECT f.*,
         d.name AS department_name,
         (SELECT COUNT(*) FROM page_queue
          WHERE faculty_id = f.id AND status IN ('waiting','acknowledged')) AS queue_count
  FROM faculty f
  JOIN departments d ON f.department_id = d.id
`;

// GET /api/faculty/department/:deptId  — public
router.get('/department/:deptId', async (req, res) => {
  try {
    const [rows] = await db.query(
      FACULTY_SELECT + ' WHERE f.department_id = ? ORDER BY f.name',
      [req.params.deptId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/faculty/display  — public, all faculty for faculty-room display
router.get('/display', async (req, res) => {
  try {
    const [rows] = await db.query(
      FACULTY_SELECT + ' ORDER BY d.name, f.name'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/faculty  — admin
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      FACULTY_SELECT + ' ORDER BY d.name, f.name'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/faculty  — admin
router.post('/', auth, upload.single('photo'), async (req, res) => {
  const { department_id, name, designation } = req.body;
  if (!department_id || !name)
    return res.status(400).json({ error: 'Department and name required' });

  const photo = req.file ? `/uploads/faculty/${req.file.filename}` : null;
  try {
    const [result] = await db.query(
      'INSERT INTO faculty (department_id, name, designation, photo) VALUES (?, ?, ?, ?)',
      [department_id, name.trim(), designation || null, photo]
    );
    const [rows] = await db.query(FACULTY_SELECT + ' WHERE f.id = ?', [result.insertId]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/faculty/:id  — admin
router.put('/:id', auth, upload.single('photo'), async (req, res) => {
  const { department_id, name, designation, available } = req.body;
  try {
    if (req.file) {
      // Delete old photo if it exists
      const [old] = await db.query('SELECT photo FROM faculty WHERE id = ?', [req.params.id]);
      if (old[0]?.photo) {
        const oldPath = path.join(__dirname, '..', old[0].photo);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      await db.query(
        'UPDATE faculty SET department_id=?,name=?,designation=?,photo=?,available=? WHERE id=?',
        [department_id, name, designation || null, `/uploads/faculty/${req.file.filename}`, available ?? 1, req.params.id]
      );
    } else {
      await db.query(
        'UPDATE faculty SET department_id=?,name=?,designation=?,available=? WHERE id=?',
        [department_id, name, designation || null, available ?? 1, req.params.id]
      );
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/faculty/:id/dnd  — public (faculty room screen calls this)
router.put('/:id/dnd', async (req, res) => {
  const { dnd } = req.body;
  try {
    await db.query('UPDATE faculty SET dnd = ? WHERE id = ?', [dnd ? 1 : 0, req.params.id]);
    const io = req.app.get('io');
    io.emit('faculty:dnd-update', { facultyId: parseInt(req.params.id), dnd: !!dnd });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/faculty/:id  — admin
router.delete('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT photo FROM faculty WHERE id = ?', [req.params.id]);
    if (rows[0]?.photo) {
      const p = path.join(__dirname, '..', rows[0].photo);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    await db.query('DELETE FROM faculty WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
