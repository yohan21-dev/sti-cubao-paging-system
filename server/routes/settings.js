// ── Settings ──────────────────────────────────────────────────
const express  = require('express');
const sRouter  = express.Router();
const db       = require('../db');
const auth     = require('../middleware/auth');

sRouter.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM settings LIMIT 1');
    res.json(rows[0] || {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

sRouter.put('/', auth, async (req, res) => {
  const { sound_mode, tts_rate, auto_reset_seconds } = req.body;
  try {
    await db.query(
      'UPDATE settings SET sound_mode=?,tts_rate=?,auto_reset_seconds=?',
      [sound_mode, tts_rate, auto_reset_seconds]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = { settingsRouter: sRouter };
