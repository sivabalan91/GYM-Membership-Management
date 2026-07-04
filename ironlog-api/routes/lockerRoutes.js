const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/lockerController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', ctrl.listLockers);
router.post('/:id/assign', authorize('admin'), ctrl.assignLocker);
router.post('/:id/release', authorize('admin'), ctrl.releaseLocker);

module.exports = router;
