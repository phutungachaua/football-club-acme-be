const { Readable } = require('stream');
const cloudinary = require('../config/cloudinary');

const uploadBufferToCloudinary = (file, folder, resourceType) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result);
      }
    );

    Readable.from(file.buffer).pipe(uploadStream);
  });
};

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 400,
        message: 'Vui lòng chọn file để upload',
      });
    }

    const folder = req.body.folder || 'football-acme';
    const resourceType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    const result = await uploadBufferToCloudinary(req.file, folder, resourceType);

    res.status(200).json({
      status: 200,
      message: 'Upload file thành công',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type,
        format: result.format,
        bytes: result.bytes,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

module.exports = {
  uploadFile,
};
