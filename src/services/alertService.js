const twilio = require('twilio');
const Alert = require('../models/Alert');
const User = require('../models/User');
const logger = require('../utils/logger');

// Initialize Twilio client
let twilioClient;
try {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  // Only initialize if valid credentials are provided
  if (accountSid && authToken && accountSid.startsWith('AC')) {
    twilioClient = twilio(accountSid, authToken);
    logger.info('Twilio client initialized successfully');
  } else {
    logger.warn('Twilio credentials not configured - SMS/Call alerts will be disabled');
  }
} catch (error) {
  logger.error('Failed to initialize Twilio client:', error.message);
  logger.warn('SMS/Call alerts will be disabled');
}

/**
 * Determine alert type and severity based on glucose value
 */
const classifyAlert = (glucose, alertSettings) => {
  const { criticalHigh, criticalLow } = alertSettings;
  const SEVERE_HIGH = 300;
  const SEVERE_LOW = 40;

  if (glucose >= SEVERE_HIGH) {
    return { type: 'severe_high', severity: 'critical' };
  } else if (glucose <= SEVERE_LOW) {
    return { type: 'severe_low', severity: 'critical' };
  } else if (glucose > criticalHigh) {
    return { type: 'critical_high', severity: 'critical' };
  } else if (glucose < criticalLow) {
    return { type: 'critical_low', severity: 'critical' };
  }
  
  return null;
};

/**
 * Check if within quiet hours
 */
const isQuietHours = (quietHours) => {
  if (!quietHours.enabled) return false;

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  return currentTime >= quietHours.start && currentTime <= quietHours.end;
};

/**
 * Send SMS notification
 */
const sendSMS = async (to, message) => {
  if (!twilioClient) {
    logger.warn('Twilio not configured, skipping SMS');
    return { status: 'failed', error: 'Twilio not configured' };
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to,
    });

    logger.info(`SMS sent to ${to}: ${result.sid}`);
    return {
      status: 'sent',
      sentAt: new Date(),
      sid: result.sid,
    };
  } catch (error) {
    logger.error(`SMS send error to ${to}:`, error.message);
    return {
      status: 'failed',
      error: error.message,
    };
  }
};

/**
 * Make voice call
 */
const makeCall = async (to, message) => {
  if (!twilioClient) {
    logger.warn('Twilio not configured, skipping call');
    return { status: 'failed', error: 'Twilio not configured' };
  }

  try {
    const twiml = `
      <Response>
        <Say voice="alice">${message}</Say>
        <Say voice="alice">Press any key to acknowledge this alert.</Say>
        <Gather numDigits="1" action="${process.env.CLIENT_URL}/api/v1/alerts/acknowledge"/>
      </Response>
    `;

    const result = await twilioClient.calls.create({
      twiml: twiml,
      to: to,
      from: process.env.TWILIO_PHONE_NUMBER,
    });

    logger.info(`Call made to ${to}: ${result.sid}`);
    return {
      status: 'sent',
      sentAt: new Date(),
      sid: result.sid,
    };
  } catch (error) {
    logger.error(`Call error to ${to}:`, error.message);
    return {
      status: 'failed',
      error: error.message,
    };
  }
};

/**
 * Create and send critical glucose alert
 */
exports.sendCriticalAlert = async (userId, readingId, glucose) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const { alertSettings, guardians } = user;
    
    // Classify alert
    const alertInfo = classifyAlert(glucose, alertSettings);
    if (!alertInfo) {
      return null; // Not a critical reading
    }

    // Check quiet hours (only for warnings, not severe)
    if (alertInfo.severity !== 'critical' && isQuietHours(alertSettings.quietHours)) {
      logger.info(`Alert suppressed due to quiet hours for user ${user.email}`);
      return null;
    }

    // Create alert message
    const message = glucose > alertSettings.criticalHigh
      ? `⚠️ CRITICAL ALERT: Your glucose level is ${glucose} mg/dL (HIGH). Please check immediately!`
      : `⚠️ CRITICAL ALERT: Your glucose level is ${glucose} mg/dL (LOW). Please check immediately and consume fast-acting carbs!`;

    // Create alert in database
    const alert = await Alert.create({
      userId,
      readingId,
      alertType: alertInfo.type,
      severity: alertInfo.severity,
      glucoseValue: glucose,
      message,
      notifications: [],
    });

    // Send SMS to user
    if (alertSettings.enableSMS) {
      const smsResult = await sendSMS(user.profile.phoneNumber, message);
      alert.notifications.push({
        recipient: user.profile.phoneNumber,
        recipientType: 'user',
        method: 'sms',
        ...smsResult,
      });
    }

    // Send SMS to guardians
    if (guardians && guardians.length > 0) {
      for (const guardian of guardians) {
        if (guardian.notifyOnAlert && guardian.phone) {
          const guardianMessage = `⚠️ ALERT: ${user.profile.firstName} ${user.profile.lastName}'s glucose is ${glucose} mg/dL. Please check on them.`;
          const smsResult = await sendSMS(guardian.phone, guardianMessage);
          alert.notifications.push({
            recipient: guardian.phone,
            recipientType: 'guardian',
            method: 'sms',
            ...smsResult,
          });
        }
      }
    }

    await alert.save();

    // Schedule follow-up call if not acknowledged (after 5 minutes)
    if (alertSettings.enableCall) {
      setTimeout(async () => {
        const updatedAlert = await Alert.findById(alert._id);
        if (!updatedAlert.acknowledged) {
          const callMessage = `This is an urgent alert from Gluco Sense. ${user.profile.firstName}'s glucose level is ${glucose} milligrams per deciliter. Immediate attention required.`;
          const callResult = await makeCall(user.profile.phoneNumber, callMessage);
          updatedAlert.notifications.push({
            recipient: user.profile.phoneNumber,
            recipientType: 'user',
            method: 'call',
            ...callResult,
          });
          await updatedAlert.save();
        }
      }, 5 * 60 * 1000); // 5 minutes
    }

    logger.info(`Critical alert created and sent for user ${user.email}, glucose: ${glucose}`);
    return alert;
  } catch (error) {
    logger.error('Error sending critical alert:', error);
    throw error;
  }
};

/**
 * Acknowledge an alert
 */
exports.acknowledgeAlert = async (alertId, acknowledgedBy) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      alertId,
      {
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy,
      },
      { new: true }
    );

    logger.info(`Alert ${alertId} acknowledged by ${acknowledgedBy}`);
    return alert;
  } catch (error) {
    logger.error('Error acknowledging alert:', error);
    throw error;
  }
};

/**
 * Get unacknowledged alerts for user
 */
exports.getUnacknowledgedAlerts = async (userId) => {
  try {
    const alerts = await Alert.find({
      userId,
      acknowledged: false,
      resolved: false,
    }).sort({ timestamp: -1 });

    return alerts;
  } catch (error) {
    logger.error('Error fetching unacknowledged alerts:', error);
    throw error;
  }
};
