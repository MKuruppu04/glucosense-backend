const mongoose = require('mongoose');

const glucoseReadingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  glucose: {
    type: Number,
    required: [true, 'Glucose value is required'],
    min: [20, 'Glucose value too low'],
    max: [600, 'Glucose value too high'],
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  },
  sensorData: {
    redLED: Number,
    irLED: Number,
    heartRate: Number,
    spo2: Number,
    irIntensity: Number,
    absorption: Number,
    signalQuality: {
      type: String,
      enum: ['Excellent', 'Good', 'Fair', 'Poor'],
      default: 'Good',
    },
  },
  metadata: {
    deviceId: String,
    source: {
      type: String,
      enum: ['raspberry-pi', 'manual', 'cgm', 'app'],
      default: 'raspberry-pi',
    },
    mealContext: {
      type: String,
      enum: ['fasting', 'pre-meal', 'post-meal', 'bedtime', 'other'],
    },
    notes: String,
    mood: String,
    activity: String,
    medicationTaken: Boolean,
  },
  flags: {
    isCritical: {
      type: Boolean,
      default: false,
    },
    alertSent: {
      type: Boolean,
      default: false,
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
    },
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
glucoseReadingSchema.index({ userId: 1, timestamp: -1 });
glucoseReadingSchema.index({ 'flags.isCritical': 1, timestamp: -1 });
glucoseReadingSchema.index({ location: '2dsphere' });

// Middleware to check if reading is critical
glucoseReadingSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('glucose')) {
    const User = mongoose.model('User');
    const user = await User.findById(this.userId);
    
    if (user) {
      const { criticalHigh, criticalLow } = user.alertSettings;
      this.flags.isCritical = this.glucose > criticalHigh || this.glucose < criticalLow;
    }
  }
  next();
});

const GlucoseReading = mongoose.model('GlucoseReading', glucoseReadingSchema);

module.exports = GlucoseReading;
