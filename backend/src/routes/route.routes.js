/**
 * Route Plan Routes
 */

const express = require('express');
const router = express.Router();
const {
  getRoutes,
  getRoute,
  createRoute,
  optimizeRoute,
  updateRoute,
  deleteRoute,
  startRoute,
  completeRoute,
  getRouteDirections,
  getRouteUpdates,
  reoptimizeRoute
} = require('../controllers/route.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { 
  validateRoutePlan, 
  validateOptimizationRequest, 
  validateObjectId,
  validatePagination 
} = require('../middleware/validation.middleware');

// All routes require authentication
router.use(protect);

// Route optimization endpoint (accessible to dispatchers and admins)
router.post('/optimize', authorize('admin', 'dispatcher'), validateOptimizationRequest, optimizeRoute);

// CRUD routes
router.route('/')
  .get(validatePagination, getRoutes)
  .post(authorize('admin', 'dispatcher'), validateRoutePlan, createRoute);

router.route('/:id')
  .get(validateObjectId('id'), getRoute)
  .put(authorize('admin', 'dispatcher'), validateObjectId('id'), updateRoute)
  .delete(authorize('admin', 'dispatcher'), validateObjectId('id'), deleteRoute);

// Route actions
router.post('/:id/start', validateObjectId('id'), startRoute);
router.post('/:id/complete', validateObjectId('id'), completeRoute);
router.post('/:id/directions', validateObjectId('id'), getRouteDirections);
router.get('/:id/updates', validateObjectId('id'), getRouteUpdates);
router.post('/:id/reoptimize', authorize('admin', 'dispatcher'), validateObjectId('id'), reoptimizeRoute);

module.exports = router;
