const getHealth = (req, res) => {
  res.status(200).json({
    status: 200,
    message: 'Backend is running',
  });
};

module.exports = {
  getHealth,
};
