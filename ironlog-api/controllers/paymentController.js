const pool = require('../config/db');

// NOTE: This is a gateway-agnostic skeleton. Plug in Razorpay or Stripe
// inside createPaymentOrder() / verifyPayment() — both follow the same
// "create order on server, confirm via webhook/signature" pattern.

// GET /api/payments/member/:memberId
async function getMemberPayments(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM payments WHERE member_id = ? ORDER BY created_at DESC`,
      [req.params.memberId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch payments' });
  }
}

// POST /api/payments/:id/order
// Creates a gateway order for a pending payment. Replace the stubbed
// `gatewayOrder` block with a real Razorpay/Stripe SDK call.
async function createPaymentOrder(req, res) {
  try {
    const [[payment]] = await pool.query('SELECT * FROM payments WHERE id = ?', [req.params.id]);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status === 'paid') return res.status(400).json({ error: 'Payment already completed' });

    // ---- Replace with real gateway call, e.g.:
    // const order = await razorpay.orders.create({ amount: payment.amount * 100, currency: 'INR' });
    const gatewayOrder = {
      id: `order_stub_${payment.id}_${Date.now()}`,
      amount: payment.amount,
      currency: payment.currency
    };

    await pool.query(`UPDATE payments SET gateway = ?, gateway_ref = ? WHERE id = ?`, [
      'razorpay_stub', gatewayOrder.id, payment.id
    ]);

    res.json({ order: gatewayOrder });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create payment order' });
  }
}

// POST /api/payments/:id/verify
// Called after the client completes checkout with the gateway SDK.
// In production, verify the signature the gateway returns before marking paid.
async function verifyPayment(req, res) {
  try {
    const { gateway_payment_id, signature } = req.body;

    // ---- Replace with real signature verification, e.g. Razorpay's
    // crypto.createHmac('sha256', KEY_SECRET).update(order_id + "|" + payment_id).digest('hex')

    const [result] = await pool.query(
      `UPDATE payments SET status = 'paid', gateway_ref = COALESCE(?, gateway_ref) WHERE id = ?`,
      [gateway_payment_id || null, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Payment not found' });

    res.json({ message: 'Payment confirmed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not verify payment' });
  }
}

// GET /api/payments/revenue?branch_id=&from=&to=
// Admin analytics — total revenue in a date range.
async function getRevenueSummary(req, res) {
  try {
    const { branch_id, from, to } = req.query;
    let sql = `
      SELECT DATE_FORMAT(p.created_at, '%Y-%m') AS month, SUM(p.amount) AS revenue, COUNT(*) AS payments
      FROM payments p
      JOIN users u ON u.id = p.member_id
      WHERE p.status = 'paid'`;
    const params = [];
    if (branch_id) { sql += ' AND u.branch_id = ?'; params.push(branch_id); }
    if (from) { sql += ' AND p.created_at >= ?'; params.push(from); }
    if (to) { sql += ' AND p.created_at <= ?'; params.push(to); }
    sql += ' GROUP BY month ORDER BY month ASC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch revenue summary' });
  }
}

module.exports = { getMemberPayments, createPaymentOrder, verifyPayment, getRevenueSummary };
