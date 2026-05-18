const express = require('express');
const { uploadFile } = require('../controllers/upload.controller');
const protect = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const uploadSingleFile = require('../middlewares/upload.middleware');

const router = express.Router();

router.post('/', protect, uploadSingleFile, uploadFile);

module.exports = router;
