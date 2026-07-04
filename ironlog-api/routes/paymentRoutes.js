const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/member/:memberId', ctrl.getMemberPayments);
router.post('/:id/order', ctrl.createPaymentOrder);
router.post('/:id/verify', ctrl.verifyPayment);
router.get('/revenue', authorize('admin'), ctrl.getRevenueSummary);

module.exports = router;
