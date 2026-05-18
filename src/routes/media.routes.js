const express = require('express');
const {
  getAllMedia,
  getPhotos,
  getVideos,
  getMediaById,
  createMedia,
  updateMedia,
  deleteMedia,
} = require('../controllers/media.controller');
const protect = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/', getAllMedia);
router.get('/photos', getPhotos);
router.get('/videos', getVideos);
router.get('/:id', getMediaById);
router.post('/', protect, authorizeRoles('admin'), createMedia);
router.put('/:id', protect, authorizeRoles('admin'), updateMedia);
router.delete('/:id', protect, authorizeRoles('admin'), deleteMedia);

module.exports = router;
