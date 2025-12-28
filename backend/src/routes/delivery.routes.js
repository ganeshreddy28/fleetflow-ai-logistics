/**
 * Delivery Routes
 */

const express = require('express');
const router = express.Router();
const {
  getDeliveries,
  getDelivery,
  trackDelivery,
  createDelivery,
  createBulkDeliveries,
  updateDelivery,
  deleteDelivery,
  markDelivered,
  markFailed,
  getUnassignedDeliveries,
  getDeliveryStats
} = require('../controllers/delivery.controller');
const { protect, authorize, optionalAuth } = require('../middleware/auth.middleware');
const { 
  validateDelivery, 
  validateObjectId,
  validatePagination 
} = require('../middleware/validation.middleware');

// Public tracking endpoint
router.get('/track/:trackingNumber', trackDelivery);

// All other routes require authentication
router.use(protect);

// Statistics
router.get('/stats', getDeliveryStats);

// Unassigned deliveries
router.get('/unassigned', authorize('admin', 'dispatcher'), getUnassignedDeliveries);

// Bulk operations
router.post('/bulk', authorize('admin', 'dispatcher'), createBulkDeliveries);

// CRUD routes
router.route('/')
  .get(validatePagination, getDeliveries)
  .post(authorize('admin', 'dispatcher'), validateDelivery, createDelivery);

router.route('/:id')
  .get(validateObjectId('id'), getDelivery)
  .put(authorize('admin', 'dispatcher'), validateObjectId('id'), updateDelivery)
  .delete(authorize('admin', 'dispatcher'), validateObjectId('id'), deleteDelivery);

// Delivery actions
router.post('/:id/deliver', validateObjectId('id'), markDelivered);
router.post('/:id/fail', validateObjectId('id'), markFailed);

module.exports = router;
