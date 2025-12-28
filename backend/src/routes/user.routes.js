/**
 * User Routes
 */

const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getDrivers,
  toggleUserStatus
} = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { validateObjectId, validatePagination } = require('../middleware/validation.middleware');

// All routes require authentication
router.use(protect);

// Driver list (accessible by dispatchers and admins)
router.get('/drivers', authorize('admin', 'dispatcher'), getDrivers);

// Admin only routes
router.route('/')
  .get(authorize('admin'), validatePagination, getUsers)
  .post(authorize('admin'), createUser);

router.route('/:id')
  .get(authorize('admin'), validateObjectId('id'), getUser)
  .put(authorize('admin'), validateObjectId('id'), updateUser)
  .delete(authorize('admin'), validateObjectId('id'), deleteUser);

router.patch('/:id/toggle-status', authorize('admin'), validateObjectId('id'), toggleUserStatus);

module.exports = router;
