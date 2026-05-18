const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 403,
        message: 'Bạn không có quyền thực hiện chức năng này',
      });
    }

    next();
  };
};

module.exports = authorizeRoles;
