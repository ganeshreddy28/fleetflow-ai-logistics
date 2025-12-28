/**
 * Validation Middleware
 * Input validation using express-validator
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * User registration validation
 */
const validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('companyId')
    .trim()
    .notEmpty().withMessage('Company ID is required'),
  body('role')
    .optional()
    .isIn(['admin', 'dispatcher', 'driver']).withMessage('Invalid role'),
  handleValidationErrors
];

/**
 * User login validation
 */
const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),
  body('password')
    .notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

/**
 * Delivery validation
 */
const validateDelivery = [
  body('address.street')
    .trim()
    .notEmpty().withMessage('Street address is required'),
  body('address.city')
    .trim()
    .notEmpty().withMessage('City is required'),
  body('location.coordinates')
    .isArray({ min: 2, max: 2 }).withMessage('Coordinates must be [longitude, latitude]')
    .custom((coords) => {
      const [lng, lat] = coords;
      if (lng < -180 || lng > 180) throw new Error('Invalid longitude');
      if (lat < -90 || lat > 90) throw new Error('Invalid latitude');
      return true;
    }),
  body('timeWindow.earliest')
    .notEmpty().withMessage('Earliest delivery time is required')
    .isISO8601().withMessage('Invalid date format'),
  body('timeWindow.latest')
    .notEmpty().withMessage('Latest delivery time is required')
    .isISO8601().withMessage('Invalid date format')
    .custom((latest, { req }) => {
      if (new Date(latest) <= new Date(req.body.timeWindow.earliest)) {
        throw new Error('Latest time must be after earliest time');
      }
      return true;
    }),
  body('customer.name')
    .trim()
    .notEmpty().withMessage('Customer name is required'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority'),
  body('packageDetails.type')
    .optional()
    .isIn(['standard', 'fragile', 'perishable', 'hazardous', 'oversized']).withMessage('Invalid package type'),
  handleValidationErrors
];

/**
 * Route plan validation
 */
const validateRoutePlan = [
  body('name')
    .trim()
    .notEmpty().withMessage('Route name is required')
    .isLength({ max: 200 }).withMessage('Route name cannot exceed 200 characters'),
  body('scheduledDate')
    .notEmpty().withMessage('Scheduled date is required')
    .isISO8601().withMessage('Invalid date format'),
  body('deliveries')
    .optional()
    .isArray().withMessage('Deliveries must be an array'),
  body('vehicle.type')
    .optional()
    .isIn(['car', 'van', 'truck', 'motorcycle']).withMessage('Invalid vehicle type'),
  body('optimizationSettings.priority')
    .optional()
    .isIn(['time', 'distance', 'cost', 'balanced']).withMessage('Invalid optimization priority'),
  handleValidationErrors
];

/**
 * Route optimization request validation
 */
const validateOptimizationRequest = [
  body('deliveryIds')
    .isArray({ min: 1 }).withMessage('At least one delivery is required'),
  body('deliveryIds.*')
    .isMongoId().withMessage('Invalid delivery ID'),
  body('startLocation')
    .notEmpty().withMessage('Start location is required'),
  body('startLocation.coordinates')
    .isArray({ min: 2, max: 2 }).withMessage('Start coordinates must be [longitude, latitude]'),
  body('endLocation')
    .optional(),
  body('vehicleType')
    .optional()
    .isIn(['car', 'van', 'truck', 'motorcycle']).withMessage('Invalid vehicle type'),
  body('optimizationPriority')
    .optional()
    .isIn(['time', 'distance', 'cost', 'balanced']).withMessage('Invalid optimization priority'),
  handleValidationErrors
];

/**
 * MongoDB ObjectId validation
 */
const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .isMongoId().withMessage(`Invalid ${paramName} format`),
  handleValidationErrors
];

/**
 * Pagination validation
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sort')
    .optional()
    .isString().withMessage('Sort must be a string'),
  handleValidationErrors
];

/**
 * Date range validation
 */
const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format')
    .custom((endDate, { req }) => {
      if (req.query.startDate && new Date(endDate) < new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validateDelivery,
  validateRoutePlan,
  validateOptimizationRequest,
  validateObjectId,
  validatePagination,
  validateDateRange
};
