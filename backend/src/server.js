/**
 * FleetFlow - AI Logistics Route Optimizer
 * Main Server Entry Point
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const cron = require('node-cron');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const routeRoutes = require('./routes/route.routes');
const deliveryRoutes = require('./routes/delivery.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const exportRoutes = require('./routes/export.routes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { logger } = require('./utils/logger');

// Import services for cron jobs
const RealTimeUpdateService = require('./services/realTimeUpdate.service');

const app = express();

// ===========================================
// Security Middleware
// ===========================================
app.use(helmet());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));


// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});
app.use('/api/', limiter);

// ===========================================
// General Middleware
// ===========================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// ===========================================
// Database Connection
// ===========================================
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// ===========================================
// API Routes
// ===========================================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/export', exportRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'FleetFlow API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to FleetFlow API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      routes: '/api/routes',
      deliveries: '/api/deliveries',
      analytics: '/api/analytics',
      export: '/api/export',
      health: '/api/health'
    }
  });
});

// ===========================================
// Error Handling
// ===========================================
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// ===========================================
// Scheduled Tasks (Cron Jobs)
// ===========================================
// Update real-time traffic/weather data every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  logger.info('Running scheduled real-time data update...');
  try {
    await RealTimeUpdateService.updateAllActiveRoutes();
    logger.info('Real-time data update completed');
  } catch (error) {
    logger.error(`Real-time update failed: ${error.message}`);
  }
});

// ===========================================
// Server Startup
// ===========================================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  
  app.listen(PORT, () => {
    logger.info(`
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║   FleetFlow - AI Logistics Route Optimizer                ║
    ║   Server running on port ${PORT}                            ║
    ║   Environment: ${process.env.NODE_ENV || 'development'}                          ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
    `);
  });
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  mongoose.connection.close(false, () => {
    logger.info('MongoDB connection closed.');
    process.exit(0);
  });
});

module.exports = app;
