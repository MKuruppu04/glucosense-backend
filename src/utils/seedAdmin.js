require('dotenv').config();
const mongoose = require('mongoose');
const AdminUser = require('../models/AdminUser');
const logger = require('./logger');

const seedAdmin = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('MongoDB Connected for seeding');

    // Check if admin already exists
    const existingAdmin = await AdminUser.findOne({ email: process.env.ADMIN_EMAIL });
    
    if (existingAdmin) {
      logger.info('Admin user already exists!');
      logger.info(`Email: ${existingAdmin.email}`);
      logger.info(`Role: ${existingAdmin.profile.role}`);
      process.exit(0);
    }

    // Create owner admin
    const admin = await AdminUser.create({
      email: process.env.ADMIN_EMAIL,
      passwordHash: process.env.ADMIN_PASSWORD,
      profile: {
        firstName: process.env.ADMIN_FIRST_NAME || 'System',
        lastName: process.env.ADMIN_LAST_NAME || 'Administrator',
        role: 'owner',
      },
      isActive: true,
    });

    logger.info('='.repeat(60));
    logger.info('✅ OWNER ADMIN ACCOUNT CREATED SUCCESSFULLY!');
    logger.info('='.repeat(60));
    logger.info(`📧 Email: ${admin.email}`);
    logger.info(`👤 Name: ${admin.profile.firstName} ${admin.profile.lastName}`);
    logger.info(`🔑 Role: ${admin.profile.role}`);
    logger.info(`🆔 ID: ${admin._id}`);
    logger.info('='.repeat(60));
    logger.info('⚠️  IMPORTANT: Change your password after first login!');
    logger.info('='.repeat(60));

    process.exit(0);
  } catch (error) {
    logger.error('Error seeding admin:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedAdmin();
}

module.exports = seedAdmin;
