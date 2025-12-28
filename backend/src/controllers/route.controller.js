/**
 * Route Controller
 * Handles route plan CRUD and optimization
 */

const { RoutePlan, Delivery, RealTimeUpdate, User } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const AIRouteService = require('../services/aiRoute.service');
const TomTomService = require('../services/tomtom.service');
const WeatherService = require('../services/weather.service');
const RealTimeUpdateService = require('../services/realTimeUpdate.service');
const { logger } = require('../utils/logger');

/**
 * @desc    Get all route plans
 * @route   GET /api/routes
 * @access  Private
 */
const getRoutes = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  // Build query based on user role
  let query = { companyId: req.user.companyId };

  // Drivers can only see their assigned routes
  if (req.user.role === 'driver') {
    query['driver.id'] = req.user.id;
  }

  // Filter by status
  if (req.query.status) {
    query.status = req.query.status;
  }

  // Filter by date range
  if (req.query.startDate || req.query.endDate) {
    query.scheduledDate = {};
    if (req.query.startDate) {
      query.scheduledDate.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      query.scheduledDate.$lte = new Date(req.query.endDate);
    }
  }

  // Filter by driver
  if (req.query.driverId) {
    query['driver.id'] = req.query.driverId;
  }

  const routes = await RoutePlan.find(query)
    .populate('deliveries')
    .populate('driver.id', 'name email phone')
    .skip(skip)
    .limit(limit)
    .sort({ scheduledDate: -1 });

  const total = await RoutePlan.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      routes,
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
 * @desc    Get single route plan
 * @route   GET /api/routes/:id
 * @access  Private
 */
const getRoute = asyncHandler(async (req, res) => {
  const route = await RoutePlan.findById(req.params.id)
    .populate('deliveries')
    .populate('driver.id', 'name email phone')
    .populate('userId', 'name email');

  if (!route) {
    throw new ApiError('Route not found', 404);
  }

  // Check access
  if (route.companyId !== req.user.companyId) {
    throw new ApiError('Not authorized to access this route', 403);
  }

  // Get latest real-time update
  const latestUpdate = await RealTimeUpdateService.getLatestUpdate(route._id);

  res.status(200).json({
    success: true,
    data: { 
      route,
      realTimeUpdate: latestUpdate
    }
  });
});

/**
 * @desc    Create new route plan
 * @route   POST /api/routes
 * @access  Private
 */
const createRoute = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    deliveryIds,
    scheduledDate,
    vehicle,
    driverId,
    optimizationSettings,
    tags,
    notes
  } = req.body;

  // Validate deliveries exist
  let deliveries = [];
  if (deliveryIds && deliveryIds.length > 0) {
    deliveries = await Delivery.find({
      _id: { $in: deliveryIds },
      companyId: req.user.companyId
    });

    if (deliveries.length !== deliveryIds.length) {
      throw new ApiError('Some deliveries not found', 400);
    }
  }

  // Get driver info if provided
  let driver = null;
  if (driverId) {
    const driverUser = await User.findById(driverId);
    if (driverUser) {
      driver = {
        id: driverUser._id,
        name: driverUser.name,
        phone: driverUser.phone
      };
    }
  }

  const route = await RoutePlan.create({
    userId: req.user.id,
    name,
    description,
    deliveries: deliveries.map(d => d._id),
    scheduledDate,
    vehicle,
    driver,
    optimizationSettings,
    tags,
    notes,
    companyId: req.user.companyId,
    status: 'draft'
  });

  // Update deliveries with route assignment
  if (deliveries.length > 0) {
    await Delivery.updateMany(
      { _id: { $in: deliveries.map(d => d._id) } },
      { routePlanId: route._id, status: 'assigned' }
    );
  }

  const populatedRoute = await RoutePlan.findById(route._id).populate('deliveries');

  res.status(201).json({
    success: true,
    message: 'Route created successfully',
    data: { route: populatedRoute }
  });
});

/**
 * @desc    Optimize route using AI
 * @route   POST /api/routes/optimize
 * @access  Private
 */
const optimizeRoute = asyncHandler(async (req, res) => {
  const {
    deliveryIds,
    startLocation,
    endLocation,
    vehicleType,
    optimizationPriority,
    constraints
  } = req.body;

  // Get deliveries
  const deliveries = await Delivery.find({
    _id: { $in: deliveryIds },
    companyId: req.user.companyId
  });

  if (deliveries.length === 0) {
    throw new ApiError('No valid deliveries found', 400);
  }

  logger.info(`Optimizing route with ${deliveries.length} deliveries`);

  // Get real-time data for optimization
  let trafficData = null;
  let weatherData = null;

  try {
    // Get traffic data if we have coordinates
    if (startLocation?.coordinates) {
      const [lng, lat] = startLocation.coordinates;
      trafficData = await TomTomService.getTrafficFlow(lat, lng);
    }
  } catch (error) {
    logger.warn(`Could not fetch traffic data: ${error.message}`);
  }

  try {
    // Get weather data
    if (startLocation?.coordinates) {
      const [lng, lat] = startLocation.coordinates;
      weatherData = await WeatherService.getWeather(lat, lng);
    }
  } catch (error) {
    logger.warn(`Could not fetch weather data: ${error.message}`);
  }

  // Call AI optimization service
  const result = await AIRouteService.optimizeRoute({
    deliveries,
    startLocation,
    endLocation: endLocation || startLocation,
    vehicleType: vehicleType || 'van',
    constraints,
    trafficData,
    weatherData,
    optimizationPriority: optimizationPriority || 'balanced'
  });

  res.status(200).json({
    success: true,
    message: 'Route optimized successfully',
    data: {
      optimizedRoute: result.optimizedRoute,
      aiModel: result.aiModel,
      confidence: result.confidence,
      conditions: {
        traffic: trafficData ? {
          congestionLevel: trafficData.congestionLevel,
          currentSpeed: trafficData.currentSpeed
        } : null,
        weather: weatherData ? {
          condition: weatherData.current?.condition,
          temperature: weatherData.current?.temperature
        } : null
      }
    }
  });
});

/**
 * @desc    Update route plan
 * @route   PUT /api/routes/:id
 * @access  Private
 */
const updateRoute = asyncHandler(async (req, res) => {
  let route = await RoutePlan.findById(req.params.id);

  if (!route) {
    throw new ApiError('Route not found', 404);
  }

  // Check ownership (allow admin and dispatcher to update)
  if (route.userId.toString() !== req.user.id && 
      req.user.role !== 'admin' && 
      req.user.role !== 'dispatcher') {
    throw new ApiError('Not authorized to update this route', 403);
  }

  // Handle delivery reordering
  if (req.body.deliveryIds && req.body.deliveryIds.length > 0) {
    const deliveries = await Delivery.find({ _id: { $in: req.body.deliveryIds } });
    
    // Reorder deliveries based on the new sequence
    const orderedDeliveryIds = req.body.deliveryIds.map(id => {
      const delivery = deliveries.find(d => d._id.toString() === id);
      return delivery ? delivery._id : null;
    }).filter(Boolean);
    
    route.deliveries = orderedDeliveryIds;
    
    logger.info(`Route ${route._id} reordered with ${orderedDeliveryIds.length} deliveries`);
  }

  // Update driver assignment
  if (req.body.driver) {
    route.driver = req.body.driver;
    logger.info(`Driver assigned to route ${route._id}: ${req.body.driver.name}`);
  }

  // Update other allowed fields
  const allowedUpdates = ['name', 'status', 'vehicle', 'scheduledDate', 'description', 'notes'];
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      route[field] = req.body[field];
    }
  });

  await route.save();

  // Populate deliveries for response
  const populatedRoute = await RoutePlan.findById(route._id).populate('deliveries');

  res.status(200).json({
    success: true,
    message: 'Route updated successfully',
    data: { route: populatedRoute }
  });
});

/**
 * @desc    Delete route plan
 * @route   DELETE /api/routes/:id
 * @access  Private
 */
const deleteRoute = asyncHandler(async (req, res) => {
  const route = await RoutePlan.findById(req.params.id);

  if (!route) {
    throw new ApiError('Route not found', 404);
  }

  if (route.companyId !== req.user.companyId) {
    throw new ApiError('Not authorized', 403);
  }

  // Unassign deliveries
  await Delivery.updateMany(
    { routePlanId: route._id },
    { $unset: { routePlanId: 1 }, status: 'pending' }
  );

  // Delete associated real-time updates
  await RealTimeUpdate.deleteMany({ routePlanId: route._id });

  await route.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Route deleted successfully'
  });
});

/**
 * @desc    Start route (change status to in_progress)
 * @route   POST /api/routes/:id/start
 * @access  Private
 */
const startRoute = asyncHandler(async (req, res) => {
  const route = await RoutePlan.findById(req.params.id);

  if (!route) {
    throw new ApiError('Route not found', 404);
  }

  if (route.status !== 'planned' && route.status !== 'draft') {
    throw new ApiError(`Cannot start route with status: ${route.status}`, 400);
  }

  route.status = 'in_progress';
  route.actualStartTime = new Date();
  await route.save();

  // Update deliveries status
  await Delivery.updateMany(
    { routePlanId: route._id },
    { status: 'in_transit' }
  );

  logger.info(`Route ${route._id} started by user ${req.user.id}`);

  res.status(200).json({
    success: true,
    message: 'Route started',
    data: { route }
  });
});

/**
 * @desc    Complete route
 * @route   POST /api/routes/:id/complete
 * @access  Private
 */
const completeRoute = asyncHandler(async (req, res) => {
  const route = await RoutePlan.findById(req.params.id);

  if (!route) {
    throw new ApiError('Route not found', 404);
  }

  if (route.status !== 'in_progress') {
    throw new ApiError(`Cannot complete route with status: ${route.status}`, 400);
  }

  route.status = 'completed';
  route.actualEndTime = new Date();
  await route.save();

  // Update all deliveries to delivered
  await Delivery.updateMany(
    { routePlanId: route._id },
    { status: 'delivered', actualArrival: new Date() }
  );

  logger.info(`Route ${route._id} completed by user ${req.user.id}`);

  res.status(200).json({
    success: true,
    message: 'Route completed',
    data: { route }
  });
});

/**
 * @desc    Get route directions from TomTom
 * @route   POST /api/routes/:id/directions
 * @access  Private
 */
const getRouteDirections = asyncHandler(async (req, res) => {
  const route = await RoutePlan.findById(req.params.id).populate('deliveries');

  if (!route) {
    throw new ApiError('Route not found', 404);
  }

  const { startLocation } = req.body;

  // Build waypoints from deliveries
  const waypoints = [];
  
  if (startLocation) {
    waypoints.push({
      lat: startLocation.coordinates[1],
      lng: startLocation.coordinates[0]
    });
  }

  for (const delivery of route.deliveries) {
    if (delivery.location?.coordinates) {
      waypoints.push({
        lat: delivery.location.coordinates[1],
        lng: delivery.location.coordinates[0]
      });
    }
  }

  if (waypoints.length < 2) {
    throw new ApiError('Not enough waypoints for directions', 400);
  }

  // Get directions from TomTom
  const directions = await TomTomService.calculateRoute(waypoints, {
    vehicleType: route.vehicle?.type,
    priority: route.optimizationSettings?.priority,
    avoidTolls: route.optimizationSettings?.avoidTolls,
    avoidHighways: route.optimizationSettings?.avoidHighways,
    avoidFerries: route.optimizationSettings?.avoidFerries
  });

  // Update route with geometry
  route.routeGeometry = directions.geometry;
  route.metrics = {
    ...route.metrics,
    totalDistance: directions.summary.lengthInMeters / 1000,
    totalDuration: directions.summary.travelTimeInSeconds / 60
  };
  await route.save();

  res.status(200).json({
    success: true,
    data: { directions }
  });
});

/**
 * @desc    Get real-time updates for route
 * @route   GET /api/routes/:id/updates
 * @access  Private
 */
const getRouteUpdates = asyncHandler(async (req, res) => {
  const route = await RoutePlan.findById(req.params.id);

  if (!route) {
    throw new ApiError('Route not found', 404);
  }

  const hours = parseInt(req.query.hours) || 24;
  const updates = await RealTimeUpdateService.getUpdateHistory(route._id, hours);

  res.status(200).json({
    success: true,
    data: { updates }
  });
});

/**
 * @desc    Trigger route re-optimization
 * @route   POST /api/routes/:id/reoptimize
 * @access  Private
 */
const reoptimizeRoute = asyncHandler(async (req, res) => {
  const result = await RealTimeUpdateService.triggerReoptimization(req.params.id);

  logger.info(`Route ${req.params.id} re-optimization triggered by user ${req.user.id}`);

  res.status(200).json({
    success: true,
    data: result
  });
});

module.exports = {
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
};