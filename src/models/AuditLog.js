const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser',
    required: true,
    index: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      'view_user',
      'edit_user',
      'delete_user',
      'export_data',
      'view_health_data',
      'send_notification',
      'change_settings',
      'create_admin',
      'edit_admin',
      'delete_admin',
      'login',
      'logout',
      'failed_login',
    ],
  },
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  targetAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser',
  },
  ipAddress: String,
  userAgent: String,
  details: mongoose.Schema.Types.Mixed,
  success: {
    type: Boolean,
    default: true,
  },
  errorMessage: String,
}, {
  timestamps: false,
});

// Indexes for efficient queries
auditLogSchema.index({ adminId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
