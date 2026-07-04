const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/progressController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/', ctrl.logProgress);
router.get('/member/:memberId', ctrl.getMemberProgress);

module.exports = router;
