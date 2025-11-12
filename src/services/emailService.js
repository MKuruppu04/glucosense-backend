const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Create transporter
let transporter;

if (process.env.SENDGRID_API_KEY) {
  // Using SendGrid
  transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    auth: {
      user: 'apikey',
      pass: process.env.SENDGRID_API_KEY,
    },
  });
} else {
  // Fallback to Gmail or other SMTP (for development)
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

/**
 * Send email
 */
exports.sendEmail = async ({ to, subject, html, text }) => {
  try {
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Email send error to ${to}:`, error.message);
    throw error;
  }
};

/**
 * Send welcome email
 */
exports.sendWelcomeEmail = async (user, verificationUrl) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0ea5e9;">Welcome to GlucoSense!</h2>
      <p>Hi ${user.profile.firstName},</p>
      <p>Thank you for joining GlucoSense, your personal glucose monitoring platform.</p>
      ${verificationUrl ? `
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0ea5e9; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Verify Email
        </a>
        <p style="color: #64748b; font-size: 12px;">Or copy this link: ${verificationUrl}</p>
      ` : ''}
      <p>Get started by:</p>
      <ul>
        <li>Completing your profile</li>
        <li>Setting up emergency contacts</li>
        <li>Configuring alert preferences</li>
        <li>Connecting your Raspberry Pi device</li>
      </ul>
      <p>If you have any questions, feel free to contact our support team.</p>
      <p>Best regards,<br>The GlucoSense Team</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
      <p style="color: #64748b; font-size: 12px;">
        This is an automated message. Please do not reply to this email.
      </p>
    </div>
  `;

  return await this.sendEmail({
    to: user.email,
    subject: 'Welcome to GlucoSense - Get Started',
    html,
  });
};

/**
 * Send critical alert email
 */
exports.sendCriticalAlertEmail = async (user, glucose) => {
  const isHigh = glucose > user.alertSettings.criticalHigh;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #fee2e2; padding: 20px; border-left: 4px solid #ef4444;">
        <h2 style="color: #991b1b; margin: 0;">⚠️ CRITICAL GLUCOSE ALERT</h2>
      </div>
      <div style="padding: 20px;">
        <p>Hi ${user.profile.firstName},</p>
        <p style="font-size: 18px; font-weight: bold; color: #ef4444;">
          Your glucose level is ${glucose} mg/dL (${isHigh ? 'HIGH' : 'LOW'})
        </p>
        <p><strong>Immediate action required:</strong></p>
        ${isHigh ? `
          <ul>
            <li>Check your blood glucose with a meter to confirm</li>
            <li>Drink water</li>
            <li>Contact your healthcare provider if levels remain high</li>
            <li>Take medication if prescribed</li>
          </ul>
        ` : `
          <ul>
            <li>Consume 15-20g of fast-acting carbs immediately</li>
            <li>Wait 15 minutes and recheck glucose</li>
            <li>If still low, repeat treatment</li>
            <li>Contact emergency services if symptoms worsen</li>
          </ul>
        `}
        <p>Alert sent at: ${new Date().toLocaleString()}</p>
        <p style="color: #64748b;">Your emergency contacts have been notified.</p>
      </div>
      <div style="background-color: #f8fafc; padding: 15px; margin-top: 20px;">
        <p style="color: #64748b; font-size: 12px; margin: 0;">
          <strong>Important:</strong> This is an automated alert. In case of emergency, call 911 immediately.
        </p>
      </div>
    </div>
  `;

  return await this.sendEmail({
    to: user.email,
    subject: `🚨 CRITICAL: Glucose Alert - ${glucose} mg/dL`,
    html,
  });
};
