const express = require('express');
const {
  createMember,
  createMyMember,
  getMembers,
  getMemberById,
  getMyMember,
  updateMember,
  approveMember,
  rejectMember,
  deleteMember,
} = require('../controllers/member.controller');
const protect = require('../middlewares/auth.middleware');
const optionalAuth = require('../middlewares/optionalAuth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/', optionalAuth, getMembers);
router.get('/me', protect, getMyMember);
router.post('/me', protect, createMyMember);
router.put('/:id/approve', protect, authorizeRoles('admin'), approveMember);
router.put('/:id/reject', protect, authorizeRoles('admin'), rejectMember);
router.get('/:id', optionalAuth, getMemberById);
router.post('/', protect, authorizeRoles('admin'), createMember);
router.put('/:id', protect, updateMember);
router.delete('/:id', protect, authorizeRoles('admin'), deleteMember);

module.exports = router;
