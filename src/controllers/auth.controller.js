const User = require('../models/User');
const generateToken = require('../utils/generateToken');

const buildUserResponse = (user) => ({
  _id: user._id,
  name: user.name,
  username: user.username,
  role: user.role,
  avatar: user.avatar,
  isActive: user.isActive,
});

const register = async (req, res) => {
  try {
    const { name, password } = req.body;
    const username = req.body.username && req.body.username.trim().toLowerCase();

    if (!name || !username || !password) {
      return res.status(400).json({
        status: 400,
        message: 'Vui lòng nhập đầy đủ name, username và password',
      });
    }

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(400).json({
        status: 400,
        message: 'Username đã tồn tại',
      });
    }

    await User.create({
      name,
      username,
      password,
      role: 'member',
    });

    res.status(200).json({
      status: 200,
      message: 'Đăng ký tài khoản thành công',
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { password } = req.body;
    const username = req.body.username && req.body.username.trim().toLowerCase();

    if (!username || !password) {
      return res.status(400).json({
        status: 400,
        message: 'Vui lòng nhập username và password',
      });
    }

    const user = await User.findOne({ username }).select('+password');

    if (!user) {
      return res.status(401).json({
        status: 401,
        message: 'Username hoặc password không đúng',
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        status: 401,
        message: 'Username hoặc password không đúng',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        status: 401,
        message: 'Tài khoản của bạn chưa được kích hoạt hoặc đã bị khóa',
      });
    }

    const accessToken = generateToken(user);

    res.status(200).json({
      status: 200,
      message: 'Đăng nhập thành công',
      accessToken,
      user: buildUserResponse(user),
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

const getMe = async (req, res) => {
  res.status(200).json({
    status: 200,
    user: buildUserResponse(req.user),
  });
};

const updateMe = async (req, res) => {
  try {
    const updateData = {};

    if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
      updateData.name = req.body.name;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'avatar')) {
      updateData.avatar = req.body.avatar;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      status: 200,
      message: 'Cập nhật thông tin cá nhân thành công',
      data: buildUserResponse(user),
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateMe,
};
