const pool = require('../config/db');

// ---------- Classes ----------

// GET /api/classes?branch_id=&from=&to=
async function listClasses(req, res) {
  try {
    const { branch_id, from, to } = req.query;
    let sql = `
      SELECT c.*, u.name AS trainer_name,
        (SELECT COUNT(*) FROM bookings b WHERE b.class_id = c.id AND b.status = 'confirmed') AS booked_count
      FROM classes c JOIN users u ON u.id = c.trainer_id WHERE 1=1`;
    const params = [];
    if (branch_id) { sql += ' AND c.branch_id = ?'; params.push(branch_id); }
    if (from) { sql += ' AND c.start_time >= ?'; params.push(from); }
    if (to) { sql += ' AND c.start_time <= ?'; params.push(to); }
    sql += ' ORDER BY c.start_time ASC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch classes' });
  }
}

// POST /api/classes — admin/trainer
async function createClass(req, res) {
  try {
    const { branch_id, trainer_id, name, description, start_time, end_time, capacity } = req.body;
    if (!branch_id || !trainer_id || !name || !start_time || !end_time) {
      return res.status(400).json({ error: 'branch_id, trainer_id, name, start_time and end_time are required' });
    }
    const [result] = await pool.query(
      `INSERT INTO classes (branch_id, trainer_id, name, description, start_time, end_time, capacity)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [branch_id, trainer_id, name, description || null, start_time, end_time, capacity || 20]
    );
    res.status(201).json({ id: result.insertId, name, start_time, end_time });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create class' });
  }
}

// DELETE /api/classes/:id
async function deleteClass(req, res) {
  try {
    const [result] = await pool.query('DELETE FROM classes WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Class not found' });
    res.json({ message: 'Class cancelled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete class' });
  }
}

// ---------- Bookings ----------

// POST /api/bookings  { class_id, member_id }
// Confirms if capacity allows, otherwise waitlists.
async function createBooking(req, res) {
  const conn = await pool.getConnection();
  try {
    const { class_id, member_id } = req.body;
    if (!class_id || !member_id) {
      return res.status(400).json({ error: 'class_id and member_id are required' });
    }

    await conn.beginTransaction();

    const [[cls]] = await conn.query('SELECT * FROM classes WHERE id = ? FOR UPDATE', [class_id]);
    if (!cls) {
      await conn.rollback();
      return res.status(404).json({ error: 'Class not found' });
    }

    const [[{ count }]] = await conn.query(
      `SELECT COUNT(*) AS count FROM bookings WHERE class_id = ? AND status = 'confirmed'`,
      [class_id]
    );

    const status = count < cls.capacity ? 'confirmed' : 'waitlisted';

    const [result] = await conn.query(
      `INSERT INTO bookings (class_id, member_id, status) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status)`,
      [class_id, member_id, status]
    );

    await conn.commit();
    res.status(201).json({ booking_id: result.insertId, status });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Could not create booking' });
  } finally {
    conn.release();
  }
}

// POST /api/bookings/:id/cancel
// Cancels a booking and promotes the next waitlisted member, if any.
async function cancelBooking(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[booking]] = await conn.query('SELECT * FROM bookings WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!booking) {
      await conn.rollback();
      return res.status(404).json({ error: 'Booking not found' });
    }

    await conn.query(`UPDATE bookings SET status = 'cancelled' WHERE id = ?`, [req.params.id]);

    let promoted = null;
    if (booking.status === 'confirmed') {
      const [[nextWaitlisted]] = await conn.query(
        `SELECT * FROM bookings WHERE class_id = ? AND status = 'waitlisted'
         ORDER BY booked_at ASC LIMIT 1 FOR UPDATE`,
        [booking.class_id]
      );
      if (nextWaitlisted) {
        await conn.query(`UPDATE bookings SET status = 'confirmed' WHERE id = ?`, [nextWaitlisted.id]);
        promoted = nextWaitlisted.member_id;
      }
    }

    await conn.commit();
    res.json({ message: 'Booking cancelled', promoted_member_id: promoted });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Could not cancel booking' });
  } finally {
    conn.release();
  }
}

// GET /api/bookings/member/:memberId
async function getMemberBookings(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT b.id, b.status, c.name AS class_name, c.start_time, c.end_time, u.name AS trainer_name
       FROM bookings b
       JOIN classes c ON c.id = b.class_id
       JOIN users u ON u.id = c.trainer_id
       WHERE b.member_id = ? ORDER BY c.start_time ASC`,
      [req.params.memberId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch bookings' });
  }
}

module.exports = {
  listClasses, createClass, deleteClass,
  createBooking, cancelBooking, getMemberBookings
};
