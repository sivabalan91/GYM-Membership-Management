const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/membershipController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/plans', ctrl.listPlans);
router.post('/plans', authorize('admin'), ctrl.createPlan);

router.post('/', authorize('admin'), ctrl.createMembership);
router.get('/member/:memberId', ctrl.getMemberMemberships);
router.post('/:id/cancel', ctrl.cancelMembership);

module.exports = router;
