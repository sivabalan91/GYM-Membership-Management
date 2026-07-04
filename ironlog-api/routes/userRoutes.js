const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', authorize('admin', 'trainer'), ctrl.listUsers);
router.get('/:id', ctrl.getUser); // members can fetch their own profile by id
router.post('/', authorize('admin'), ctrl.createUser);
router.put('/:id', authorize('admin'), ctrl.updateUser);
router.delete('/:id', authorize('admin'), ctrl.deleteUser);

router.post('/:trainerId/assign-member', authorize('admin'), ctrl.assignMember);
router.get('/:trainerId/members', authorize('admin', 'trainer'), ctrl.getTrainerMembers);

module.exports = router;
