const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// GET /api/users?role=member|trainer|admin&branch_id=
async function listUsers(req, res) {
  try {
    const { role, branch_id } = req.query;
    let sql = `SELECT id, name, email, role, phone, branch_id, status, created_at FROM users WHERE 1=1`;
    const params = [];
    if (role) { sql += ' AND role = ?'; params.push(role); }
    if (branch_id) { sql += ' AND branch_id = ?'; params.push(branch_id); }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch users' });
  }
}

// GET /api/users/:id
async function getUser(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, phone, branch_id, status, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch user' });
  }
}

// POST /api/users — admin creates trainer/admin/member accounts
async function createUser(req, res) {
  try {
    const { name, email, password, role, phone, branch_id } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password and role are required' });
    }
    if (!['admin', 'trainer', 'member'].includes(role)) {
      return res.status(400).json({ error: 'role must be admin, trainer or member' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(409).json({ error: 'Email already in use' });

    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, phone, branch_id) VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, password_hash, role, phone || null, branch_id || null]
    );
    res.status(201).json({ id: result.insertId, name, email, role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create user' });
  }
}

// PUT /api/users/:id
async function updateUser(req, res) {
  try {
    const { name, phone, branch_id, status } = req.body;
    const [result] = await pool.query(
      `UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone),
       branch_id = COALESCE(?, branch_id), status = COALESCE(?, status) WHERE id = ?`,
      [name, phone, branch_id, status, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update user' });
  }
}

// DELETE /api/users/:id
async function deleteUser(req, res) {
  try {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete user' });
  }
}

// ---------- Trainer assignment ----------

// POST /api/users/:trainerId/assign-member  { member_id }
async function assignMember(req, res) {
  try {
    const trainer_id = req.params.trainerId;
    const { member_id } = req.body;
    if (!member_id) return res.status(400).json({ error: 'member_id is required' });

    await pool.query(
      `INSERT IGNORE INTO trainer_assignments (trainer_id, member_id) VALUES (?, ?)`,
      [trainer_id, member_id]
    );
    res.status(201).json({ message: 'Member assigned to trainer' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not assign member' });
  }
}

// GET /api/users/:trainerId/members
async function getTrainerMembers(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone
       FROM trainer_assignments ta
       JOIN users u ON u.id = ta.member_id
       WHERE ta.trainer_id = ?`,
      [req.params.trainerId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch assigned members' });
  }
}

module.exports = {
  listUsers, getUser, createUser, updateUser, deleteUser,
  assignMember, getTrainerMembers
};
