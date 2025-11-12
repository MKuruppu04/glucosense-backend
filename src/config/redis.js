const redis = require('redis');
const logger = require('../utils/logger');

let redisClient;

const connectRedis = async () => {
  // Skip Redis if explicitly disabled
  if (process.env.ENABLE_REDIS === 'false') {
    logger.info('Redis disabled in configuration');
    return null;
  }

  try {
    redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      socket: {
        reconnectStrategy: false, // Disable auto-reconnect to avoid spam
      },
    });

    redisClient.on('error', (err) => {
      // Only log first error, not every retry
      if (!redisClient.errorLogged) {
        logger.warn('Redis not available - caching disabled');
        redisClient.errorLogged = true;
      }
    });

    redisClient.on('connect', () => {
      logger.info('Redis Connected');
    });

    // Try to connect with timeout
    await Promise.race([
      redisClient.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 3000)
      ),
    ]);
    
    return redisClient;
  } catch (error) {
    logger.warn('Redis not available - continuing without cache');
    return null;
  }
};

const getRedisClient = () => redisClient;

module.exports = { connectRedis, getRedisClient };
