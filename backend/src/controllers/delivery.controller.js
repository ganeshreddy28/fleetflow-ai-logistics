/**
 * Delivery Controller
 * Handles delivery CRUD operations
 */

const { Delivery, RoutePlan } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

/**
 * @desc    Get all deliveries
 * @route   GET /api/deliveries
 * @access  Private
 */
const getDeliveries = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  let query = { companyId: req.user.companyId };

  // Filter by status
  if (req.query.status) {
    query.status = req.query.status;
  }

  // Filter by priority
  if (req.query.priority) {
    query.priority = req.query.priority;
  }

  // Filter by assigned/unassigned
  if (req.query.assigned === 'true') {
    query.routePlanId = { $exists: true, $ne: null };
  } else if (req.query.assigned === 'false') {
    query.routePlanId = { $exists: false };
  }

  // Filter by date range
  if (req.query.startDate || req.query.endDate) {
    query['timeWindow.earliest'] = {};
    if (req.query.startDate) {
      query['timeWindow.earliest'].$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      query['timeWindow.earliest'].$lte = new Date(req.query.endDate);
    }
  }

  // Search
  if (req.query.search) {
    query.$or = [
      { 'customer.name': { $regex: req.query.search, $options: 'i' } },
      { 'address.fullAddress': { $regex: req.query.search, $options: 'i' } },
      { trackingNumber: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  const deliveries = await Delivery.find(query)
    .populate('routePlanId', 'name status')
    .skip(skip)
    .limit(limit)
    .sort({ 'timeWindow.earliest': 1, priorityScore: -1 });

  const total = await Delivery.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      deliveries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * @desc    Get single delivery
 * @route   GET /api/deliveries/:id
 * @access  Private
 */
const getDelivery = asyncHandler(async (req, res) => {
  const delivery = await Delivery.findById(req.params.id)
    .populate('routePlanId', 'name status scheduledDate driver');

  if (!delivery) {
    throw new ApiError('Delivery not found', 404);
  }

  if (delivery.companyId !== req.user.companyId) {
    throw new ApiError('Not authorized', 403);
  }

  res.status(200).json({
    success: true,
    data: { delivery }
  });
});

/**
 * @desc    Get delivery by tracking number
 * @route   GET /api/deliveries/track/:trackingNumber
 * @access  Public
 */
const trackDelivery = asyncHandler(async (req, res) => {
  const delivery = await Delivery.findOne({
    trackingNumber: req.params.trackingNumber.toUpperCase()
  }).select('status estimatedArrival actualArrival address.city customer.name proof.deliveredAt');

  if (!delivery) {
    throw new ApiError('Delivery not found', 404);
  }

  res.status(200).json({
    success: true,
    data: {
      trackingNumber: req.params.trackingNumber,
      status: delivery.status,
      estimatedArrival: delivery.estimatedArrival,
      actualArrival: delivery.actualArrival,
      deliveredAt: delivery.proof?.deliveredAt,
      city: delivery.address?.city
    }
  });
});

/**
 * @desc    Create new delivery
 * @route   POST /api/deliveries
 * @access  Private
 */
const createDelivery = asyncHandler(async (req, res) => {
  const {
    address,
    location,
    timeWindow,
    packageDetails,
    priority,
    customer,
    requirements,
    serviceTime,
    externalOrderId,
    tags
  } = req.body;

  const delivery = await Delivery.create({
    address,
    location,
    timeWindow,
    packageDetails,
    priority: priority || 'normal',
    customer,
    requirements,
    serviceTime: serviceTime || 10,
    externalOrderId,
    tags,
    companyId: req.user.companyId,
    createdBy: req.user.id
  });

  res.status(201).json({
    success: true,
    message: 'Delivery created successfully',
    data: { delivery }
  });
});

/**
 * @desc    Create multiple deliveries (bulk)
 * @route   POST /api/deliveries/bulk
 * @access  Private
 */
const createBulkDeliveries = asyncHandler(async (req, res) => {
  const { deliveries } = req.body;

  if (!deliveries || !Array.isArray(deliveries) || deliveries.length === 0) {
    throw new ApiError('Deliveries array is required', 400);
  }

  if (deliveries.length > 100) {
    throw new ApiError('Maximum 100 deliveries per bulk operation', 400);
  }

  // Add company and user info to each delivery
  const deliveriesWithMeta = deliveries.map(d => ({
    ...d,
    companyId: req.user.companyId,
    createdBy: req.user.id
  }));

  const created = await Delivery.insertMany(deliveriesWithMeta, { ordered: false });

  res.status(201).json({
    success: true,
    message: `${created.length} deliveries created successfully`,
    data: { 
      count: created.length,
      deliveries: created 
    }
  });
});

/**
 * @desc    Update delivery
 * @route   PUT /api/deliveries/:id
 * @access  Private
 */
const updateDelivery = asyncHandler(async (req, res) => {
  let delivery = await Delivery.findById(req.params.id);

  if (!delivery) {
    throw new ApiError('Delivery not found', 404);
  }

  if (delivery.companyId !== req.user.companyId) {
    throw new ApiError('Not authorized', 403);
  }

  const allowedUpdates = [
    'address', 'location', 'timeWindow', 'packageDetails', 'priority',
    'customer', 'requirements', 'serviceTime', 'status', 'tags',
    'externalOrderId', 'notes'
  ];

  const updates = {};
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  delivery = await Delivery.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    message: 'Delivery updated successfully',
    data: { delivery }
  });
});

/**
 * @desc    Delete delivery
 * @route   DELETE /api/deliveries/:id
 * @access  Private
 */
const deleteDelivery = asyncHandler(async (req, res) => {
  const delivery = await Delivery.findById(req.params.id);

  if (!delivery) {
    throw new ApiError('Delivery not found', 404);
  }

  if (delivery.companyId !== req.user.companyId) {
    throw new ApiError('Not authorized', 403);
  }

  // Remove from route if assigned
  if (delivery.routePlanId) {
    await RoutePlan.findByIdAndUpdate(delivery.routePlanId, {
      $pull: { deliveries: delivery._id }
    });
  }

  await delivery.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Delivery deleted successfully'
  });
});

/**
 * @desc    Mark delivery as delivered
 * @route   POST /api/deliveries/:id/deliver
 * @access  Private
 */
const markDelivered = asyncHandler(async (req, res) => {
  const delivery = await Delivery.findById(req.params.id);

  if (!delivery) {
    throw new ApiError('Delivery not found', 404);
  }

  const { signature, photos, recipientName, notes, location } = req.body;

  delivery.status = 'delivered';
  delivery.proof = {
    deliveredAt: new Date(),
    signature,
    photos,
    recipientName,
    notes,
    location
  };
  delivery.actualArrival = new Date();

  await delivery.save();

  res.status(200).json({
    success: true,
    message: 'Delivery marked as delivered',
    data: { delivery }
  });
});

/**
 * @desc    Mark delivery as failed
 * @route   POST /api/deliveries/:id/fail
 * @access  Private
 */
const markFailed = asyncHandler(async (req, res) => {
  const delivery = await Delivery.findById(req.params.id);

  if (!delivery) {
    throw new ApiError('Delivery not found', 404);
  }

  const { reason, notes } = req.body;

  delivery.status = 'failed';
  delivery.failureInfo = {
    reason,
    attemptedAt: new Date(),
    notes
  };

  await delivery.save();

  res.status(200).json({
    success: true,
    message: 'Delivery marked as failed',
    data: { delivery }
  });
});

/**
 * @desc    Get unassigned deliveries
 * @route   GET /api/deliveries/unassigned
 * @access  Private
 */
const getUnassignedDeliveries = asyncHandler(async (req, res) => {
  const deliveries = await Delivery.find({
    companyId: req.user.companyId,
    routePlanId: { $exists: false },
    status: { $in: ['pending'] }
  }).sort({ priorityScore: -1, 'timeWindow.earliest': 1 });

  res.status(200).json({
    success: true,
    data: { deliveries }
  });
});

/**
 * @desc    Get delivery statistics
 * @route   GET /api/deliveries/stats
 * @access  Private
 */
const getDeliveryStats = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = await Delivery.aggregate([
    { $match: { companyId: req.user.companyId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        assigned: { $sum: { $cond: [{ $eq: ['$status', 'assigned'] }, 1, 0] } },
        inTransit: { $sum: { $cond: [{ $eq: ['$status', 'in_transit'] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        urgent: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } },
        high: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } }
      }
    }
  ]);

  const todayStats = await Delivery.aggregate([
    {
      $match: {
        companyId: req.user.companyId,
        'timeWindow.earliest': { $gte: today }
      }
    },
    {
      $group: {
        _id: null,
        todayTotal: { $sum: 1 },
        todayDelivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      overall: stats[0] || {},
      today: todayStats[0] || {}
    }
  });
});

module.exports = {
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
};
