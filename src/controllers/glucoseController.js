const GlucoseReading = require('../models/GlucoseReading');
const { sendCriticalAlert } = require('../services/alertService');
const logger = require('../utils/logger');

// @desc    Add new glucose reading
// @route   POST /api/v1/glucose
// @access  Private
exports.addReading = async (req, res) => {
  try {
    const { glucose, sensorData, metadata } = req.body;

    // Create reading
    const reading = await GlucoseReading.create({
      userId: req.user.id,
      glucose,
      sensorData,
      metadata,
      timestamp: new Date(),
    });

    // Check if critical and send alerts
    if (reading.flags.isCritical) {
      try {
        await sendCriticalAlert(req.user.id, reading._id, glucose);
      } catch (alertError) {
        logger.error('Alert sending error:', alertError);
        // Continue even if alert fails
      }
    }

    res.status(201).json({
      success: true,
      data: reading,
    });
  } catch (error) {
    logger.error('Add reading error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding glucose reading',
      error: error.message,
    });
  }
};

// @desc    Get user's glucose readings
// @route   GET /api/v1/glucose
// @access  Private
exports.getReadings = async (req, res) => {
  try {
    const {
      limit = 30,
      startDate,
      endDate,
      minGlucose,
      maxGlucose,
    } = req.query;

    const query = { userId: req.user.id };

    // Date range filter
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // Glucose range filter
    if (minGlucose || maxGlucose) {
      query.glucose = {};
      if (minGlucose) query.glucose.$gte = parseFloat(minGlucose);
      if (maxGlucose) query.glucose.$lte = parseFloat(maxGlucose);
    }

    const readings = await GlucoseReading.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: readings.length,
      data: readings,
    });
  } catch (error) {
    logger.error('Get readings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching glucose readings',
    });
  }
};

// @desc    Get glucose statistics
// @route   GET /api/v1/glucose/stats
// @access  Private
exports.getStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const readings = await GlucoseReading.find({
      userId: req.user.id,
      timestamp: { $gte: startDate },
    });

    if (readings.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          count: 0,
          average: 0,
          min: 0,
          max: 0,
        },
      });
    }

    const glucoseValues = readings.map(r => r.glucose);
    const average = glucoseValues.reduce((a, b) => a + b, 0) / glucoseValues.length;
    const min = Math.min(...glucoseValues);
    const max = Math.max(...glucoseValues);

    // Calculate time in range
    const user = req.user;
    const inRange = readings.filter(r => 
      r.glucose >= 70 && r.glucose <= 180
    ).length;
    const timeInRange = (inRange / readings.length) * 100;

    res.status(200).json({
      success: true,
      data: {
        count: readings.length,
        average: Math.round(average),
        min,
        max,
        timeInRange: Math.round(timeInRange),
        period: `${days} days`,
      },
    });
  } catch (error) {
    logger.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating statistics',
    });
  }
};

// @desc    Delete glucose reading
// @route   DELETE /api/v1/glucose/:id
// @access  Private
exports.deleteReading = async (req, res) => {
  try {
    const reading = await GlucoseReading.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!reading) {
      return res.status(404).json({
        success: false,
        message: 'Reading not found',
      });
    }

    await reading.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Reading deleted',
    });
  } catch (error) {
    logger.error('Delete reading error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting reading',
    });
  }
};

// @desc    Update alert settings
// @route   PUT /api/v1/glucose/alert-settings
// @access  Private
exports.updateAlertSettings = async (req, res) => {
  try {
    const updates = {
      'alertSettings.criticalHigh': req.body.criticalHigh,
      'alertSettings.criticalLow': req.body.criticalLow,
      'alertSettings.warningHigh': req.body.warningHigh,
      'alertSettings.warningLow': req.body.warningLow,
      'alertSettings.enableSMS': req.body.enableSMS,
      'alertSettings.enableCall': req.body.enableCall,
      'alertSettings.enableEmail': req.body.enableEmail,
      'alertSettings.quietHours': req.body.quietHours,
    };

    // Remove undefined values
    Object.keys(updates).forEach(key => 
      updates[key] === undefined && delete updates[key]
    );

    const User = require('../models/User');
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: user.alertSettings,
    });
  } catch (error) {
    logger.error('Update alert settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating alert settings',
    });
  }
};

// @desc    Manage guardians
// @route   PUT /api/v1/glucose/guardians
// @access  Private
exports.updateGuardians = async (req, res) => {
  try {
    const { guardians } = req.body;

    const User = require('../models/User');
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { guardians },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: user.guardians,
    });
  } catch (error) {
    logger.error('Update guardians error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating guardians',
    });
  }
};
