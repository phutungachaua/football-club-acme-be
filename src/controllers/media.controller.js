const Media = require('../models/Media');

const validateMediaPayload = (payload, isCreate = false) => {
  if (isCreate && (!payload.type || !payload.title || !payload.url)) {
    return 'Vui lòng nhập đầy đủ type, title và url';
  }

  if (payload.type && !['photo', 'video'].includes(payload.type)) {
    return 'type phải là photo hoặc video';
  }

  if (payload.resourceType && !['image', 'video'].includes(payload.resourceType)) {
    return 'resourceType phải là image hoặc video';
  }

  if (payload.type === 'photo' && payload.resourceType && payload.resourceType !== 'image') {
    return 'resourceType của photo phải là image';
  }

  if (payload.type === 'video' && payload.resourceType && payload.resourceType !== 'video') {
    return 'resourceType của video phải là video';
  }

  return null;
};

const normalizeMediaPayload = (payload) => {
  const data = { ...payload };

  if (data.type === 'photo' && !data.resourceType) {
    data.resourceType = 'image';
  }

  if (data.type === 'video' && !data.resourceType) {
    data.resourceType = 'video';
  }

  return data;
};

const buildMediaFilter = (query) => {
  const filter = {};

  if (query.type) {
    filter.type = query.type;
  }

  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === 'true' || query.isActive === true;
  }

  if (query.category) {
    filter.category = query.category;
  }

  if (query.keyword) {
    filter.$or = [
      { title: { $regex: query.keyword, $options: 'i' } },
      { description: { $regex: query.keyword, $options: 'i' } },
    ];
  }

  return filter;
};

const getAllMedia = async (req, res) => {
  try {
    const media = await Media.find(buildMediaFilter(req.query)).sort({ order: 1, createdAt: -1 });

    res.status(200).json({
      status: 200,
      message: 'Lấy danh sách tư liệu thành công',
      data: media,
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

const getPhotos = async (req, res) => {
  try {
    const photos = await Media.find({ type: 'photo', isActive: true }).sort({
      order: 1,
      createdAt: -1,
    });

    res.status(200).json({
      status: 200,
      message: 'Lấy danh sách ảnh tư liệu thành công',
      data: photos,
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

const getVideos = async (req, res) => {
  try {
    const videos = await Media.find({ type: 'video', isActive: true }).sort({
      order: 1,
      createdAt: -1,
    });

    res.status(200).json({
      status: 200,
      message: 'Lấy danh sách video tư liệu thành công',
      data: videos,
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

const getMediaById = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);

    if (!media) {
      return res.status(404).json({
        status: 404,
        message: 'Không tìm thấy tư liệu',
      });
    }

    res.status(200).json({
      status: 200,
      message: 'Lấy thông tin tư liệu thành công',
      data: media,
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

const createMedia = async (req, res) => {
  try {
    const payload = normalizeMediaPayload(req.body);
    const validationError = validateMediaPayload(payload, true);

    if (validationError) {
      return res.status(400).json({
        status: 400,
        message: validationError,
      });
    }

    const media = await Media.create({
      ...payload,
      createdBy: req.user._id,
    });

    res.status(200).json({
      status: 200,
      message: 'Tạo tư liệu thành công',
      data: media,
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

const updateMedia = async (req, res) => {
  try {
    const currentMedia = await Media.findById(req.params.id);

    if (!currentMedia) {
      return res.status(404).json({
        status: 404,
        message: 'Không tìm thấy tư liệu',
      });
    }

    const payload = {
      ...req.body,
      type: req.body.type || currentMedia.type,
      resourceType: req.body.resourceType || currentMedia.resourceType,
    };

    if (req.body.type && !req.body.resourceType) {
      payload.resourceType = req.body.type === 'video' ? 'video' : 'image';
    }

    const validationError = validateMediaPayload(payload);

    if (validationError) {
      return res.status(400).json({
        status: 400,
        message: validationError,
      });
    }

    const media = await Media.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        resourceType: payload.resourceType,
        updatedBy: req.user._id,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      status: 200,
      message: 'Cập nhật tư liệu thành công',
      data: media,
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

const deleteMedia = async (req, res) => {
  try {
    const media = await Media.findByIdAndDelete(req.params.id);

    if (!media) {
      return res.status(404).json({
        status: 404,
        message: 'Không tìm thấy tư liệu',
      });
    }

    res.status(200).json({
      status: 200,
      message: 'Xóa tư liệu thành công',
      data: media,
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

module.exports = {
  getAllMedia,
  getPhotos,
  getVideos,
  getMediaById,
  createMedia,
  updateMedia,
  deleteMedia,
};
