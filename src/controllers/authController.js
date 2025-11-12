const User = require('../models/User');
const { signToken, sendTokenResponse } = require('../middleware/auth');
const logger = require('../utils/logger');
const crypto = require('crypto');
const { sendEmail } = require('../services/emailService');

// @desc    Register new user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      dateOfBirth,
      phoneNumber,
      termsAccepted,
      privacyAccepted,
    } = req.body;

    // Validate required fields
    if (!termsAccepted || !privacyAccepted) {
      return res.status(400).json({
        success: false,
        message: 'You must accept the terms and privacy policy',
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    // Create email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Create user
    const user = await User.create({
      email,
      passwordHash: password,
      profile: {
        firstName,
        lastName,
        dateOfBirth,
        phoneNumber,
      },
      termsAccepted,
      privacyAccepted,
      emailVerificationToken,
    });

    // Send verification email (if enabled)
    if (process.env.ENABLE_EMAIL_VERIFICATION === 'true') {
      const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${emailVerificationToken}`;
      try {
        await sendEmail({
          to: user.email,
          subject: 'Welcome to GlucoSense - Verify Your Email',
          html: `<p>Hi ${user.profile.firstName},</p>
                 <p>Welcome to GlucoSense! Please verify your email by clicking the link below:</p>
                 <a href="${verificationUrl}">Verify Email</a>`,
        });
      } catch (emailError) {
        logger.error('Email send error:', emailError);
      }
    }

    logger.info(`New user registered: ${user.email}`);

    // Send token response
    sendTokenResponse(user, 201, res);
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message,
    });
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Find user and include password
    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.',
      });
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Update last login
    user.lastLoginAt = Date.now();
    await user.save({ validateBeforeSave: false });

    logger.info(`User logged in: ${user.email}`);

    sendTokenResponse(user, 200, res);
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message,
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user.getPublicProfile(),
    });
  } catch (error) {
    logger.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
    });
  }
};

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

// @desc    Update user profile
// @route   PUT /api/v1/auth/update-profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const fieldsToUpdate = {
      'profile.firstName': req.body.firstName,
      'profile.lastName': req.body.lastName,
      'profile.phoneNumber': req.body.phoneNumber,
      'profile.address': req.body.address,
    };

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: fieldsToUpdate },
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      data: user.getPublicProfile(),
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
    });
  }
};

// @desc    Update password
// @route   PUT /api/v1/auth/update-password
// @access  Private
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password',
      });
    }

    // Get user with password
    const user = await User.findById(req.user.id).select('+passwordHash');

    // Check current password
    const isPasswordMatch = await user.comparePassword(currentPassword);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Update password
    user.passwordHash = newPassword;
    await user.save();

    logger.info(`Password updated for user: ${user.email}`);

    sendTokenResponse(user, 200, res);
  } catch (error) {
    logger.error('Update password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating password',
    });
  }
};
