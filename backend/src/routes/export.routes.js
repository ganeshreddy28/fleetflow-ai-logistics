/**
 * Export Routes
 */

const express = require('express');
const router = express.Router();
const {
  exportRoutePDF,
  exportRouteCSV,
  exportRouteICal,
  exportDeliveriesCSV,
  exportBulkRoutesCSV
} = require('../controllers/export.controller');
const { protect } = require('../middleware/auth.middleware');
const { validateObjectId } = require('../middleware/validation.middleware');

// All routes require authentication
router.use(protect);

// Route exports
router.get('/routes/:id/pdf', validateObjectId('id'), exportRoutePDF);
router.get('/routes/:id/csv', validateObjectId('id'), exportRouteCSV);
router.get('/routes/:id/ical', validateObjectId('id'), exportRouteICal);

// Bulk exports
router.post('/routes/bulk/csv', exportBulkRoutesCSV);

// Deliveries export
router.get('/deliveries/csv', exportDeliveriesCSV);

module.exports = router;
