const pool = require('../config/db');

// ---------- Plans ----------

// GET /api/plans
async function listPlans(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM membership_plans WHERE is_active = TRUE');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch plans' });
  }
}

// POST /api/plans — admin only
async function createPlan(req, res) {
  try {
    const { name, description, duration_days, price } = req.body;
    if (!name || !duration_days || !price) {
      return res.status(400).json({ error: 'name, duration_days and price are required' });
    }
    const [result] = await pool.query(
      `INSERT INTO membership_plans (name, description, duration_days, price) VALUES (?, ?, ?, ?)`,
      [name, description || null, duration_days, price]
    );
    res.status(201).json({ id: result.insertId, name, duration_days, price });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create plan' });
  }
}

// ---------- Memberships (subscriptions) ----------

// POST /api/memberships  { member_id, plan_id, start_date }
// Creates a membership and a corresponding pending payment.
async function createMembership(req, res) {
  const conn = await pool.getConnection();
  try {
    const { member_id, plan_id, start_date } = req.body;
    if (!member_id || !plan_id) {
      return res.status(400).json({ error: 'member_id and plan_id are required' });
    }

    const [[plan]] = await conn.query('SELECT * FROM membership_plans WHERE id = ?', [plan_id]);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const start = start_date ? new Date(start_date) : new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + plan.duration_days);

    await conn.beginTransaction();

    const [membershipResult] = await conn.query(
      `INSERT INTO memberships (member_id, plan_id, start_date, end_date, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [member_id, plan_id, start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]
    );

    const [paymentResult] = await conn.query(
      `INSERT INTO payments (member_id, membership_id, amount, status)
       VALUES (?, ?, ?, 'pending')`,
      [member_id, membershipResult.insertId, plan.price]
    );

    await conn.commit();
    res.status(201).json({
      membership_id: membershipResult.insertId,
      payment_id: paymentResult.insertId,
      amount_due: plan.price,
      end_date: end.toISOString().slice(0, 10)
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Could not create membership' });
  } finally {
    conn.release();
  }
}

// GET /api/memberships/member/:memberId
async function getMemberMemberships(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT m.*, p.name AS plan_name, p.price
       FROM memberships m JOIN membership_plans p ON p.id = m.plan_id
       WHERE m.member_id = ? ORDER BY m.start_date DESC`,
      [req.params.memberId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch memberships' });
  }
}

// POST /api/memberships/:id/cancel
// Cancels a membership and calculates a prorated refund for unused days.
async function cancelMembership(req, res) {
  try {
    const [[membership]] = await pool.query(
      `SELECT m.*, p.price FROM memberships m JOIN membership_plans p ON p.id = m.plan_id WHERE m.id = ?`,
      [req.params.id]
    );
    if (!membership) return res.status(404).json({ error: 'Membership not found' });
    if (membership.status !== 'active') {
      return res.status(400).json({ error: 'Only active memberships can be cancelled' });
    }

    const today = new Date();
    const start = new Date(membership.start_date);
    const end = new Date(membership.end_date);
    const totalDays = Math.max(1, Math.round((end - start) / 86400000));
    const usedDays = Math.min(totalDays, Math.max(0, Math.round((today - start) / 86400000)));
    const remainingDays = Math.max(0, totalDays - usedDays);
    const refund = Math.round((remainingDays / totalDays) * membership.price * 100) / 100;

    await pool.query(`UPDATE memberships SET status = 'cancelled' WHERE id = ?`, [req.params.id]);

    res.json({
      message: 'Membership cancelled',
      total_days: totalDays,
      used_days: usedDays,
      remaining_days: remainingDays,
      prorated_refund: refund
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not cancel membership' });
  }
}

module.exports = {
  listPlans, createPlan, createMembership, getMemberMemberships, cancelMembership
};
