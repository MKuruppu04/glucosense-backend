const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  readingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GlucoseReading',
  },
  alertType: {
    type: String,
    required: true,
    enum: [
      'critical_high',
      'critical_low',
      'severe_high',
      'severe_low',
      'sensor_error',
      'device_offline',
      'battery_low',
    ],
  },
  severity: {
    type: String,
    required: true,
    enum: ['critical', 'warning', 'info'],
  },
  glucoseValue: Number,
  message: String,
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  },
  notifications: [{
    recipient: {
      type: String,
      required: true,
    },
    recipientType: {
      type: String,
      enum: ['user', 'guardian', 'doctor'],
    },
    method: {
      type: String,
      enum: ['sms', 'call', 'email', 'push'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed', 'acknowledged'],
      default: 'pending',
    },
    sentAt: Date,
    deliveredAt: Date,
    acknowledgedAt: Date,
    errorMessage: String,
    retryCount: {
      type: Number,
      default: 0,
    },
  }],
  acknowledged: {
    type: Boolean,
    default: false,
  },
  acknowledgedAt: Date,
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  resolved: {
    type: Boolean,
    default: false,
  },
  resolvedAt: Date,
  autoResolved: {
    type: Boolean,
    default: false,
  },
  notes: String,
}, {
  timestamps: true,
});

// Indexes
alertSchema.index({ userId: 1, timestamp: -1 });
alertSchema.index({ alertType: 1, severity: 1 });
alertSchema.index({ acknowledged: 1, resolved: 1 });

const Alert = mongoose.model('Alert', alertSchema);

module.exports = Alert;
