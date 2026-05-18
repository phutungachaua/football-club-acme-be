const express = require('express');
const { register, login, getMe, updateMe } = require('../controllers/auth.controller');
const protect = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);

module.exports = router;
