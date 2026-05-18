const Member = require('../models/Member');
const User = require('../models/User');

const userPopulateFields = '_id name username role avatar isActive';
const approvalPopulateFields = '_id name username role avatar isActive';

const normalizePosition = (position) => {
  if (!Array.isArray(position)) {
    return position;
  }

  return position
    .map((item) => (typeof item === 'string' ? item.trim() : item))
    .filter(Boolean);
};

const validatePosition = (position, required = false) => {
  if (!Array.isArray(position)) {
    return 'position phải là array';
  }

  if (required && position.length === 0) {
    return 'position không được rỗng';
  }

  const hasInvalidItem = position.some((item) => typeof item !== 'string');

  if (hasInvalidItem) {
    return 'position chỉ được chứa string';
  }

  return null;
};

const populateMember = (query) => {
  return query
    .populate('userId', userPopulateFields)
    .populate('approvedBy', approvalPopulateFields)
    .populate('createdBy', userPopulateFields);
};

const findDuplicateShirtNumber = async (shirtNumber, excludeMemberId) => {
  if (shirtNumber === undefined || shirtNumber === null || shirtNumber === '') {
    return null;
  }

  const filter = { shirtNumber };

  if (excludeMemberId) {
    filter._id = { $ne: excludeMemberId };
  }

  return Member.findOne(filter);
};

const validateMemberInput = async ({ name, position, shirtNumber, excludeMemberId }) => {
  if (!name) {
    return 'name là bắt buộc';
  }

  const positionError = validatePosition(position, true);

  if (positionError) {
    return positionError;
  }

  const duplicateShirtNumber = await findDuplicateShirtNumber(shirtNumber, excludeMemberId);

  if (duplicateShirtNumber) {
    return 'Số áo đã được sử dụng';
  }

  return null;
};

const createMember = async (req, res) => {
  try {
    const { userId, name } = req.body;
    const position = normalizePosition(req.body.position);

    if (!userId || !name || !req.body.position) {
      return res.status(400).json({
        status: 400,
        message: 'Vui lòng nhập đầy đủ userId, name và position',
      });
    }

    const inputError = await validateMemberInput({
      name,
      position,
      shirtNumber: req.body.shirtNumber,
    });

    if (inputError) {
      return res.status(400).json({
        status: 400,
        message: inputError,
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(400).json({
        status: 400,
        message: 'userId không tồn tại',
      });
    }

    const existingMember = await Member.findOne({ userId });

    if (existingMember) {
      return res.status(400).json({
        status: 400,
        message: 'User này đã có hồ sơ thành viên',
      });
    }

    const member = await Member.create({
      userId,
      name,
      birthday: req.body.birthday,
      position,
      shirtNumber: req.body.shirtNumber,
      avatarUrl: req.body.avatarUrl,
      description: req.body.description,
      status: req.body.status,
      approvalStatus: req.body.approvalStatus || 'pending',
      approvedBy: req.body.approvedBy || null,
      approvedAt: req.body.approvedAt || null,
      rejectReason: req.body.rejectReason || '',
      createdBy: req.user._id,
    });

    const populatedMember = await populateMember(Member.findById(member._id));

    res.status(200).json({
      status: 200,
      message: 'Tạo thành viên thành công',
      data: populatedMember,
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

const createMyMember = async (req, res) => {
  try {
    const position = normalizePosition(req.body.position);
    const inputError = await validateMemberInput({
      name: req.body.name,
      position,
      shirtNumber: req.body.shirtNumber,
    });

    if (inputError) {
      return res.status(400).json({
        status: 400,
        message: inputError,
      });
    }

    const existingMember = await Member.findOne({ userId: req.user._id });

    if (existingMember) {
      return res.status(400).json({
        status: 400,
        message: 'Bạn đã có hồ sơ thành viên',
      });
    }

    const member = await Member.create({
      userId: req.user._id,
      name: req.body.name,
      birthday: req.body.birthday,
      position,
      shirtNumber: req.body.shirtNumber,
      avatarUrl: req.body.avatarUrl,
      description: req.body.description,
      approvalStatus: 'pending',
      approvedBy: null,
      approvedAt: null,
      rejectReason: '',
      createdBy: req.user._id,
    });

    const populatedMember = await populateMember(Member.findById(member._id));

    res.status(200).json({
      status: 200,
      message: 'Đăng ký thông tin thành viên thành công, vui lòng chờ admin duyệt',
      data: populatedMember,
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

const getMembers = async (req, res) => {
  try {
    const filter = {};
    const isAdmin = req.user && req.user.role === 'admin';
    const page = Math.max(Number(req.query.page) || 1, 1);
    const rawLimit = Math.max(Number(req.query.limit) || 10, 1);
    const limit = Math.min(rawLimit, 100);
    const skip = (page - 1) * limit;

    if (req.query.position) {
      filter.position = req.query.position;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (isAdmin) {
      if (req.query.approvalStatus) {
        filter.approvalStatus = req.query.approvalStatus;
      }
    } else {
      filter.approvalStatus = 'approved';
    }

    if (req.query.keyword) {
      filter.name = { $regex: req.query.keyword, $options: 'i' };
    }

    const total = await Member.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);
    const members = await populateMember(Member.find(filter))
      .sort({ shirtNumber: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      status: 200,
      message: 'Lấy danh sách thành viên thành công',
      data: members,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

const getMemberById = async (req, res) => {
  try {
    const member = await populateMember(Member.findById(req.params.id));

    if (!member) {
      return res.status(404).json({
        status: 404,
        message: 'Không tìm thấy thành viên',
      });
    }

    const isAdmin = req.user && req.user.role === 'admin';
    const isOwner = req.user && member.userId && member.userId._id.toString() === req.user._id.toString();

    if (member.approvalStatus !== 'approved' && !isAdmin && !isOwner) {
      return res.status(404).json({
        status: 404,
        message: 'Không tìm thấy thành viên',
      });
    }

    res.status(200).json({
      status: 200,
      message: 'Lấy thông tin thành viên thành công',
      data: member,
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

const getMyMember = async (req, res) => {
  try {
    const member = await populateMember(Member.findOne({ userId: req.user._id }));

    if (!member) {
      return res.status(404).json({
        status: 404,
        message: 'Bạn chưa có hồ sơ thành viên',
      });
    }

    res.status(200).json({
      status: 200,
      message: 'Lấy hồ sơ thành viên thành công',
      data: member,
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

const updateMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        status: 404,
        message: 'Không tìm thấy thành viên',
      });
    }

    const isAdmin = req.user.role === 'admin';
    const isOwner = member.userId.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        status: 403,
        message: 'Bạn không có quyền cập nhật thông tin thành viên này',
      });
    }

    const updateData = { ...req.body };

    if (!isAdmin) {
      delete updateData.userId;
      delete updateData.status;
      delete updateData.approvalStatus;
      delete updateData.approvedBy;
      delete updateData.approvedAt;
      delete updateData.rejectReason;

      if (member.approvalStatus === 'approved') {
        updateData.approvalStatus = 'pending';
        updateData.approvedBy = null;
        updateData.approvedAt = null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(updateData, 'position')) {
      updateData.position = normalizePosition(updateData.position);
      const positionError = validatePosition(updateData.position, true);

      if (positionError) {
        return res.status(400).json({
          status: 400,
          message: positionError,
        });
      }
    }

    if (Object.prototype.hasOwnProperty.call(updateData, 'userId')) {
      const user = await User.findById(updateData.userId);

      if (!user) {
        return res.status(400).json({
          status: 400,
          message: 'userId không tồn tại',
        });
      }

      const existingMember = await Member.findOne({
        userId: updateData.userId,
        _id: { $ne: member._id },
      });

      if (existingMember) {
        return res.status(400).json({
          status: 400,
          message: 'User này đã có hồ sơ thành viên',
        });
      }
    }

    const duplicateShirtNumber = await findDuplicateShirtNumber(updateData.shirtNumber, member._id);

    if (duplicateShirtNumber) {
      return res.status(400).json({
        status: 400,
        message: 'Số áo đã được sử dụng',
      });
    }

    const updatedMember = await populateMember(
      Member.findByIdAndUpdate(member._id, updateData, {
        new: true,
        runValidators: true,
      })
    );

    res.status(200).json({
      status: 200,
      message: 'Cập nhật thành viên thành công',
      data: updatedMember,
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

const approveMember = async (req, res) => {
  try {
    const member = await populateMember(
      Member.findByIdAndUpdate(
        req.params.id,
        {
          approvalStatus: 'approved',
          approvedBy: req.user._id,
          approvedAt: new Date(),
          rejectReason: '',
          status: 'active',
        },
        {
          new: true,
          runValidators: true,
        }
      )
    );

    if (!member) {
      return res.status(404).json({
        status: 404,
        message: 'Không tìm thấy thành viên',
      });
    }

    res.status(200).json({
      status: 200,
      message: 'Duyệt thành viên thành công',
      data: member,
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

const rejectMember = async (req, res) => {
  try {
    const member = await populateMember(
      Member.findByIdAndUpdate(
        req.params.id,
        {
          approvalStatus: 'rejected',
          approvedBy: null,
          approvedAt: null,
          rejectReason: req.body.rejectReason || 'Hồ sơ chưa được duyệt',
        },
        {
          new: true,
          runValidators: true,
        }
      )
    );

    if (!member) {
      return res.status(404).json({
        status: 404,
        message: 'Không tìm thấy thành viên',
      });
    }

    res.status(200).json({
      status: 200,
      message: 'Từ chối hồ sơ thành viên thành công',
      data: member,
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

const deleteMember = async (req, res) => {
  try {
    const member = await Member.findByIdAndDelete(req.params.id);

    if (!member) {
      return res.status(404).json({
        status: 404,
        message: 'Không tìm thấy thành viên',
      });
    }

    res.status(200).json({
      status: 200,
      message: 'Xóa thành viên thành công',
      data: member,
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

module.exports = {
  createMember,
  createMyMember,
  getMembers,
  getMemberById,
  getMyMember,
  updateMember,
  approveMember,
  rejectMember,
  deleteMember,
};
