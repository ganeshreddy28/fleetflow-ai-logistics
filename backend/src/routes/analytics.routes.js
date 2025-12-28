/**
 * Analytics Routes
 */

const express = require('express');
const router = express.Router();
const {
  getDashboard,
  getRouteAnalytics,
  getDeliveryAnalytics,
  getDriverAnalytics,
  getCostAnalytics
} = require('../controllers/analytics.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(protect);

router.get('/dashboard', getDashboard);
router.get('/routes', getRouteAnalytics);
router.get('/deliveries', getDeliveryAnalytics);
router.get('/drivers', authorize('admin', 'dispatcher'), getDriverAnalytics);
router.get('/costs', authorize('admin'), getCostAnalytics);

module.exports = router;
