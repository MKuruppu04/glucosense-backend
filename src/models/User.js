const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    select: false,
  },
  profile: {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^[+]?[\d\s()-]+$/, 'Please provide a valid phone number'],
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
  },
  medicalInfo: {
    diabetesType: {
      type: String,
      enum: ['Type 1', 'Type 2', 'Pre-diabetes', 'None', 'Not specified'],
      default: 'Not specified',
    },
    diagnosisDate: Date,
    medications: [String],
    allergies: [String],
    doctorName: String,
    doctorPhone: String,
  },
  guardians: [{
    name: {
      type: String,
      required: true,
    },
    relationship: String,
    phone: {
      type: String,
      required: true,
    },
    email: String,
    notifyOnAlert: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: Number,
      default: 1,
    },
  }],
  deviceInfo: {
    raspberryPiId: String,
    lastSyncTime: Date,
    deviceStatus: {
      type: String,
      enum: ['connected', 'disconnected', 'not_configured'],
      default: 'not_configured',
    },
  },
  alertSettings: {
    criticalHigh: {
      type: Number,
      default: 250,
    },
    criticalLow: {
      type: Number,
      default: 54,
    },
    warningHigh: {
      type: Number,
      default: 200,
    },
    warningLow: {
      type: Number,
      default: 70,
    },
    enableSMS: {
      type: Boolean,
      default: true,
    },
    enableCall: {
      type: Boolean,
      default: true,
    },
    enableEmail: {
      type: Boolean,
      default: true,
    },
    quietHours: {
      enabled: {
        type: Boolean,
        default: false,
      },
      start: String,
      end: String,
    },
  },
  privacySettings: {
    dataSharing: {
      type: Boolean,
      default: false,
    },
    analyticsConsent: {
      type: Boolean,
      default: false,
    },
    marketingConsent: {
      type: Boolean,
      default: false,
    },
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    expiresAt: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: String,
  termsAccepted: {
    type: Boolean,
    required: true,
  },
  privacyAccepted: {
    type: Boolean,
    required: true,
  },
  lastLoginAt: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  twoFactorSecret: String,
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes (email index created automatically by unique: true)
userSchema.index({ 'profile.phoneNumber': 1 });
userSchema.index({ createdAt: -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Method to get public profile
userSchema.methods.getPublicProfile = function() {
  const user = this.toObject();
  delete user.passwordHash;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpire;
  delete user.emailVerificationToken;
  delete user.twoFactorSecret;
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
