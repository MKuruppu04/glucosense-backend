require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const socketIo = require('socket.io');
const http = require('http');

const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const glucoseRoutes = require('./routes/glucose');
const adminRoutes = require('./routes/admin');

// Initialize express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  },
});

// Connect to database
connectDB();

// Connect to Redis (optional)
connectRedis().catch(err => {
  logger.warn('Redis not available, continuing without cache');
});

// Middleware - Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Use cors module as backup
app.use(cors());

// Security headers (disabled in development to avoid CORS issues)
if (process.env.NODE_ENV === 'production') {
  app.use(helmet());
}
app.use(compression()); // Compress responses
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later',
});
app.use('/api', limiter);

// API Routes
const API_VERSION = process.env.API_VERSION || 'v1';
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/glucose`, glucoseRoutes);
app.use(`/api/${API_VERSION}/admin`, adminRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'GlucoSense API Server',
    version: API_VERSION,
    status: 'running',
    endpoints: {
      auth: `/api/${API_VERSION}/auth`,
      glucose: `/api/${API_VERSION}/glucose`,
      admin: `/api/${API_VERSION}/admin`,
      docs: `/api-docs`,
    },
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API info endpoint
app.get(`/api/${API_VERSION}`, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'GlucoSense API',
    version: API_VERSION,
    endpoints: {
      health: '/health',
      auth: `/api/${API_VERSION}/auth`,
      glucose: `/api/${API_VERSION}/glucose`,
      admin: `/api/${API_VERSION}/admin`,
    },
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('authenticate', async (token) => {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.emit('authenticated', { success: true });
      logger.info(`User authenticated via socket: ${decoded.id}`);
    } catch (error) {
      socket.emit('authentication_error', { message: 'Invalid token' });
    }
  });

  socket.on('glucose_reading', async (data) => {
    if (!socket.userId) {
      return socket.emit('error', { message: 'Not authenticated' });
    }

    try {
      const GlucoseReading = require('./models/GlucoseReading');
      const { sendCriticalAlert } = require('./services/alertService');

      const reading = await GlucoseReading.create({
        userId: socket.userId,
        ...data,
        timestamp: new Date(),
      });

      // Emit to user
      socket.emit('reading_saved', reading);

      // Check for critical alerts
      if (reading.flags.isCritical) {
        await sendCriticalAlert(socket.userId, reading._id, reading.glucose);
        socket.emit('critical_alert', {
          glucose: reading.glucose,
          timestamp: reading.timestamp,
        });
      }
    } catch (error) {
      logger.error('Socket glucose reading error:', error);
      socket.emit('error', { message: 'Error saving reading' });
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Express error:', err);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info('='.repeat(50));
  logger.info('🏥 GlucoSense Healthcare Platform API');
  logger.info('='.repeat(50));
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🌐 API Base: http://localhost:${PORT}/api/${API_VERSION}`);
  logger.info(`📊 Socket.IO: ws://localhost:${PORT}`);
  logger.info(`🔑 JWT_SECRET: ${process.env.JWT_SECRET ? 'configured ✓' : 'MISSING ✗'}`);
  logger.info('='.repeat(50));
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  server.close(() => process.exit(1));
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

module.exports = { app, server, io };
