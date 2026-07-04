const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
require('dotenv').config();

// GET /api/attendance/qr/:memberId
// Generates a short-lived signed QR token the member shows at the front desk scanner.
async function generateQr(req, res) {
  try {
    const token = jwt.sign(
      { member_id: Number(req.params.memberId), purpose: 'checkin' },
      process.env.JWT_SECRET,
      { expiresIn: '2m' }
    );
    const qrImage = await QRCode.toDataURL(token);
    res.json({ token, qr_image: qrImage, expires_in_seconds: 120 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not generate QR code' });
  }
}

// POST /api/attendance/scan  { token, branch_id }
// Called by front-desk scanner device/app. Verifies the token and logs a check-in.
async function scanCheckIn(req, res) {
  try {
    const { token, branch_id } = req.body;
    if (!token || !branch_id) {
      return res.status(400).json({ error: 'token and branch_id are required' });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'QR code is invalid or expired' });
    }
    if (payload.purpose !== 'checkin') {
      return res.status(400).json({ error: 'Not a valid check-in code' });
    }

    // Prevent double check-in within the same open session
    const [[openSession]] = await pool.query(
      `SELECT id FROM attendance WHERE member_id = ? AND check_out IS NULL ORDER BY check_in DESC LIMIT 1`,
      [payload.member_id]
    );

    if (openSession) {
      await pool.query(`UPDATE attendance SET check_out = NOW() WHERE id = ?`, [openSession.id]);
      return res.json({ message: 'Checked out', member_id: payload.member_id });
    }

    await pool.query(
      `INSERT INTO attendance (member_id, branch_id) VALUES (?, ?)`,
      [payload.member_id, branch_id]
    );
    res.status(201).json({ message: 'Checked in', member_id: payload.member_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Check-in failed' });
  }
}

// GET /api/attendance/member/:memberId
async function getMemberAttendance(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM attendance WHERE member_id = ? ORDER BY check_in DESC LIMIT 50`,
      [req.params.memberId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch attendance' });
  }
}

// GET /api/attendance/branch/:branchId/today
async function getBranchAttendanceToday(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, u.name AS member_name FROM attendance a
       JOIN users u ON u.id = a.member_id
       WHERE a.branch_id = ? AND DATE(a.check_in) = CURDATE()
       ORDER BY a.check_in DESC`,
      [req.params.branchId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch today\'s attendance' });
  }
}

module.exports = { generateQr, scanCheckIn, getMemberAttendance, getBranchAttendanceToday };
