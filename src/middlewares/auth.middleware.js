const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 401,
        message: 'Bạn cần đăng nhập để thực hiện chức năng này',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        status: 401,
        message: 'Token không hợp lệ',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      status: 401,
      message: 'Token không hợp lệ hoặc đã hết hạn',
    });
  }
};

module.exports = protect;
