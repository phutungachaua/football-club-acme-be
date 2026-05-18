const multer = require('multer');

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
];

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('File không hợp lệ. Chỉ hỗ trợ JPG, PNG, WEBP, MP4 và MOV'));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter,
});

const uploadSingleFile = (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 400,
        message: 'File không được vượt quá 50MB',
      });
    }

    return res.status(400).json({
      status: 400,
      message: error.message || 'Upload file không hợp lệ',
    });
  });
};

module.exports = uploadSingleFile;
