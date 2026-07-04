const pool = require('../config/db');

// GET /api/lockers?branch_id=
async function listLockers(req, res) {
  try {
    const { branch_id } = req.query;
    let sql = 'SELECT * FROM lockers WHERE 1=1';
    const params = [];
    if (branch_id) { sql += ' AND branch_id = ?'; params.push(branch_id); }
    sql += ' ORDER BY locker_number ASC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch lockers' });
  }
}

// POST /api/lockers/:id/assign  { member_id }
async function assignLocker(req, res) {
  try {
    const { member_id } = req.body;
    if (!member_id) return res.status(400).json({ error: 'member_id is required' });

    const [[locker]] = await pool.query('SELECT * FROM lockers WHERE id = ?', [req.params.id]);
    if (!locker) return res.status(404).json({ error: 'Locker not found' });
    if (locker.status !== 'available') return res.status(400).json({ error: 'Locker is not available' });

    await pool.query(
      `UPDATE lockers SET status = 'occupied', member_id = ?, assigned_at = NOW() WHERE id = ?`,
      [member_id, req.params.id]
    );
    res.json({ message: 'Locker assigned' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not assign locker' });
  }
}

// POST /api/lockers/:id/release
async function releaseLocker(req, res) {
  try {
    const [result] = await pool.query(
      `UPDATE lockers SET status = 'available', member_id = NULL, assigned_at = NULL WHERE id = ?`,
      [req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Locker not found' });
    res.json({ message: 'Locker released' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not release locker' });
  }
}

module.exports = { listLockers, assignLocker, releaseLocker };
