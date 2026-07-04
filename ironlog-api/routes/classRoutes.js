const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/classController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', ctrl.listClasses);
router.post('/', authorize('admin', 'trainer'), ctrl.createClass);
router.delete('/:id', authorize('admin', 'trainer'), ctrl.deleteClass);

router.post('/bookings', ctrl.createBooking);
router.post('/bookings/:id/cancel', ctrl.cancelBooking);
router.get('/bookings/member/:memberId', ctrl.getMemberBookings);

module.exports = router;
