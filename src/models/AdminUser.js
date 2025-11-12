const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    select: false,
  },
  profile: {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'team_member', 'support', 'analyst'],
      default: 'team_member',
    },
  },
  permissions: {
    viewAllUsers: {
      type: Boolean,
      default: false,
    },
    editUsers: {
      type: Boolean,
      default: false,
    },
    deleteUsers: {
      type: Boolean,
      default: false,
    },
    viewHealthData: {
      type: Boolean,
      default: false,
    },
    exportData: {
      type: Boolean,
      default: false,
    },
    manageAlerts: {
      type: Boolean,
      default: false,
    },
    viewAnalytics: {
      type: Boolean,
      default: false,
    },
    manageTeam: {
      type: Boolean,
      default: false,
    },
    systemSettings: {
      type: Boolean,
      default: false,
    },
    sendNotifications: {
      type: Boolean,
      default: false,
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLoginAt: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser',
  },
}, {
  timestamps: true,
});

// Hash password before saving
adminUserSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

// Method to compare passwords
adminUserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Set owner permissions automatically
adminUserSchema.pre('save', function(next) {
  if (this.profile.role === 'owner') {
    // Owner has all permissions
    Object.keys(this.permissions).forEach(key => {
      this.permissions[key] = true;
    });
  }
  next();
});

const AdminUser = mongoose.model('AdminUser', adminUserSchema);

module.exports = AdminUser;
