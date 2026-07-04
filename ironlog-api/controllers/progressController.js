const pool = require('../config/db');

// POST /api/progress  { member_id, weight_kg, body_fat_pct, bmi, notes }
async function logProgress(req, res) {
  try {
    const { member_id, weight_kg, body_fat_pct, bmi, notes } = req.body;
    if (!member_id) return res.status(400).json({ error: 'member_id is required' });

    const [result] = await pool.query(
      `INSERT INTO progress_logs (member_id, weight_kg, body_fat_pct, bmi, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [member_id, weight_kg || null, body_fat_pct || null, bmi || null, notes || null]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not log progress' });
  }
}

// GET /api/progress/member/:memberId
async function getMemberProgress(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM progress_logs WHERE member_id = ? ORDER BY logged_at ASC`,
      [req.params.memberId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch progress logs' });
  }
}

module.exports = { logProgress, getMemberProgress };
