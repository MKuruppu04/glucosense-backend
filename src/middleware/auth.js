const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AdminUser = require('../models/AdminUser');
const logger = require('../utils/logger');

// Protect routes - require authentication
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.id).select('-passwordHash');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

// Admin authentication
exports.protectAdmin = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.adminToken) {
    token = req.cookies.adminToken;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access admin panel',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const admin = await AdminUser.findById(decoded.id).select('-passwordHash');
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin not found',
      });
    }

    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Admin account is deactivated',
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    logger.error('Admin auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired admin token',
    });
  }
};

// Check specific permission
exports.authorize = (...permissions) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Owner has all permissions
    if (req.admin.profile.role === 'owner') {
      return next();
    }

    // Check if admin has at least one of the required permissions
    const hasPermission = permissions.some(permission => 
      req.admin.permissions[permission] === true
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    next();
  };
};

// Generate JWT token
exports.signToken = (id, type = 'user') => {
  return jwt.sign({ id, type }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Send token response
exports.sendTokenResponse = (user, statusCode, res, type = 'user') => {
  const token = exports.signToken(user._id, type);

  const options = {
    expires: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  };

  const cookieName = type === 'admin' ? 'adminToken' : 'token';

  res
    .status(statusCode)
    .cookie(cookieName, token, options)
    .json({
      success: true,
      token,
      user: user.getPublicProfile ? user.getPublicProfile() : user,
    });
};
