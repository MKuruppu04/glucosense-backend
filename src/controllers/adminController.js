const User = require('../models/User');
const AdminUser = require('../models/AdminUser');
const GlucoseReading = require('../models/GlucoseReading');
const Alert = require('../models/Alert');
const AuditLog = require('../models/AuditLog');
const { signToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// @desc    Admin login
// @route   POST /api/v1/admin/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await AdminUser.findOne({ email }).select('+passwordHash');

    if (!admin || !admin.isActive) {
      // Log failed attempt
      await AuditLog.create({
        adminId: admin?._id,
        action: 'failed_login',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: false,
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      await AuditLog.create({
        adminId: admin._id,
        action: 'failed_login',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: false,
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Update last login
    admin.lastLoginAt = Date.now();
    await admin.save({ validateBeforeSave: false });

    // Log successful login
    await AuditLog.create({
      adminId: admin._id,
      action: 'login',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    const token = signToken(admin._id, 'admin');

    res.status(200).json({
      success: true,
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        profile: admin.profile,
        permissions: admin.permissions,
      },
    });
  } catch (error) {
    logger.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
    });
  }
};

// @desc    Get all users
// @route   GET /api/v1/admin/users
// @access  Private (Admin)
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
      ];
    }
    if (status) {
      query.isActive = status === 'active';
    }

    const users = await User.find(query)
      .select('-passwordHash')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await User.countDocuments(query);

    // Log access
    await AuditLog.create({
      adminId: req.admin._id,
      action: 'view_user',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      details: { query, count },
    });

    res.status(200).json({
      success: true,
      count,
      page: parseInt(page),
      pages: Math.ceil(count / limit),
      data: users,
    });
  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
    });
  }
};

// @desc    Get single user
// @route   GET /api/v1/admin/users/:id
// @access  Private (Admin)
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Log access
    await AuditLog.create({
      adminId: req.admin._id,
      action: 'view_user',
      targetUserId: user._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
    });
  }
};

// @desc    Get user's glucose data
// @route   GET /api/v1/admin/users/:id/glucose
// @access  Private (Admin)
exports.getUserGlucoseData = async (req, res) => {
  try {
    const { limit = 100, startDate, endDate } = req.query;

    const query = { userId: req.params.id };
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const readings = await GlucoseReading.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    // Log access
    await AuditLog.create({
      adminId: req.admin._id,
      action: 'view_health_data',
      targetUserId: req.params.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      details: { readingsCount: readings.length },
    });

    res.status(200).json({
      success: true,
      count: readings.length,
      data: readings,
    });
  } catch (error) {
    logger.error('Get user glucose error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching glucose data',
    });
  }
};

// @desc    Get all alerts
// @route   GET /api/v1/admin/alerts
// @access  Private (Admin)
exports.getAllAlerts = async (req, res) => {
  try {
    const { page = 1, limit = 50, severity, acknowledged } = req.query;

    const query = {};
    if (severity) query.severity = severity;
    if (acknowledged !== undefined) query.acknowledged = acknowledged === 'true';

    const alerts = await Alert.find(query)
      .populate('userId', 'email profile.firstName profile.lastName')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ timestamp: -1 });

    const count = await Alert.countDocuments(query);

    res.status(200).json({
      success: true,
      count,
      page: parseInt(page),
      pages: Math.ceil(count / limit),
      data: alerts,
    });
  } catch (error) {
    logger.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching alerts',
    });
  }
};

// @desc    Get system statistics
// @route   GET /api/v1/admin/stats
// @access  Private (Admin)
exports.getSystemStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const totalReadings = await GlucoseReading.countDocuments();
    const totalAlerts = await Alert.countDocuments();
    const criticalAlerts = await Alert.countDocuments({ severity: 'critical', resolved: false });

    // Recent activity
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('email profile createdAt');

    const recentAlerts = await Alert.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('userId', 'email profile.firstName profile.lastName');

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
        },
        readings: {
          total: totalReadings,
        },
        alerts: {
          total: totalAlerts,
          critical: criticalAlerts,
        },
        recent: {
          users: recentUsers,
          alerts: recentAlerts,
        },
      },
    });
  } catch (error) {
    logger.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
    });
  }
};

// @desc    Create team member
// @route   POST /api/v1/admin/team
// @access  Private (Admin - Owner only)
exports.createTeamMember = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, permissions } = req.body;

    const existingAdmin = await AdminUser.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists',
      });
    }

    const teamMember = await AdminUser.create({
      email,
      passwordHash: password,
      profile: {
        firstName,
        lastName,
        role: role || 'team_member',
      },
      permissions: permissions || {},
      createdBy: req.admin._id,
    });

    // Log creation
    await AuditLog.create({
      adminId: req.admin._id,
      action: 'create_admin',
      targetAdminId: teamMember._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({
      success: true,
      data: {
        id: teamMember._id,
        email: teamMember.email,
        profile: teamMember.profile,
        permissions: teamMember.permissions,
      },
    });
  } catch (error) {
    logger.error('Create team member error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating team member',
    });
  }
};

// @desc    Export user data
// @route   GET /api/v1/admin/export
// @access  Private (Admin)
exports.exportData = async (req, res) => {
  try {
    const { format = 'json', startDate, endDate } = req.query;

    const query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const users = await User.find(query).select('-passwordHash');

    // Log export
    await AuditLog.create({
      adminId: req.admin._id,
      action: 'export_data',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      details: { format, userCount: users.length },
    });

    if (format === 'csv') {
      // Convert to CSV
      const csvHeader = 'Email,First Name,Last Name,Phone,Created At,Status\n';
      const csvRows = users.map(u => 
        `${u.email},${u.profile.firstName},${u.profile.lastName},${u.profile.phoneNumber},${u.createdAt},${u.isActive ? 'Active' : 'Inactive'}`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=users-export.csv');
      res.status(200).send(csvHeader + csvRows);
    } else {
      res.status(200).json({
        success: true,
        count: users.length,
        data: users,
      });
    }
  } catch (error) {
    logger.error('Export data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting data',
    });
  }
};
