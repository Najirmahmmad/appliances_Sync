// Middleware to check if user is admin
const adminOnly = (req, res, next) => {
  // Assuming user info is attached to req by auth middleware
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'Admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.'
    });
  }

  next();
};

export default adminOnly;