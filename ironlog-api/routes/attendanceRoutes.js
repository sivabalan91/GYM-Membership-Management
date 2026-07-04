const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/attendanceController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/qr/:memberId', ctrl.generateQr);
router.post('/scan', authorize('admin', 'trainer'), ctrl.scanCheckIn);
router.get('/member/:memberId', ctrl.getMemberAttendance);
router.get('/branch/:branchId/today', authorize('admin', 'trainer'), ctrl.getBranchAttendanceToday);

module.exports = router;
