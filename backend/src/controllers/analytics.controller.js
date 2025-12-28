/**
 * Analytics Controller
 * Provides analytics and reporting endpoints
 */

const { RoutePlan, Delivery, User } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @desc    Get dashboard overview
 * @route   GET /api/analytics/dashboard
 * @access  Private
 */
const getDashboard = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const todayRoutes = await RoutePlan.aggregate([
    { $match: { companyId, scheduledDate: { $gte: today, $lt: tomorrow } } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const todayDeliveries = await Delivery.aggregate([
    { $match: { companyId, 'timeWindow.earliest': { $gte: today, $lt: tomorrow } } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const weeklyPerformance = await RoutePlan.aggregate([
    { $match: { companyId, scheduledDate: { $gte: weekAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$scheduledDate' } },
        routes: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        totalDistance: { $sum: '$metrics.totalDistance' },
        totalCost: { $sum: '$cost.total' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const activeDrivers = await User.countDocuments({ companyId, role: 'driver', isActive: true });
  const routesInProgress = await RoutePlan.countDocuments({ companyId, status: 'in_progress' });

  const deliveryStats = await Delivery.aggregate([
    { $match: { companyId, 'timeWindow.earliest': { $gte: weekAgo } } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
      }
    }
  ]);

  const deliveryRate = deliveryStats[0]?.total > 0
    ? Math.round((deliveryStats[0].delivered / deliveryStats[0].total) * 100) : 0;

  res.status(200).json({
    success: true,
    data: {
      today: {
        routes: todayRoutes.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
        deliveries: todayDeliveries.reduce((acc, d) => ({ ...acc, [d._id]: d.count }), {})
      },
      weeklyPerformance,
      summary: { activeDrivers, routesInProgress, deliveryRate, weeklyDeliveries: deliveryStats[0] || {} }
    }
  });
});

/**
 * @desc    Get route performance analytics
 * @route   GET /api/analytics/routes
 * @access  Private
 */
const getRouteAnalytics = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const days = parseInt(req.query.days) || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const routeStats = await RoutePlan.aggregate([
    { $match: { companyId, scheduledDate: { $gte: startDate } } },
    {
      $group: {
        _id: null,
        totalRoutes: { $sum: 1 },
        completedRoutes: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        avgDistance: { $avg: '$metrics.totalDistance' },
        avgDuration: { $avg: '$metrics.totalDuration' },
        totalDistance: { $sum: '$metrics.totalDistance' },
        totalCost: { $sum: '$cost.total' }
      }
    }
  ]);

  const routesByStatus = await RoutePlan.aggregate([
    { $match: { companyId, scheduledDate: { $gte: startDate } } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const dailyTrends = await RoutePlan.aggregate([
    { $match: { companyId, scheduledDate: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$scheduledDate' } },
        routes: { $sum: 1 },
        distance: { $sum: '$metrics.totalDistance' },
        cost: { $sum: '$cost.total' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.status(200).json({
    success: true,
    data: { summary: routeStats[0] || {}, byStatus: routesByStatus, dailyTrends }
  });
});

/**
 * @desc    Get delivery analytics
 * @route   GET /api/analytics/deliveries
 * @access  Private
 */
const getDeliveryAnalytics = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const days = parseInt(req.query.days) || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const deliveryStats = await Delivery.aggregate([
    { $match: { companyId, createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } }
      }
    }
  ]);

  const byPriority = await Delivery.aggregate([
    { $match: { companyId, createdAt: { $gte: startDate } } },
    { $group: { _id: '$priority', count: { $sum: 1 } } }
  ]);

  res.status(200).json({
    success: true,
    data: { summary: deliveryStats[0] || {}, byPriority }
  });
});

/**
 * @desc    Get driver performance
 * @route   GET /api/analytics/drivers
 * @access  Private/Admin
 */
const getDriverAnalytics = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const days = parseInt(req.query.days) || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const driverPerformance = await RoutePlan.aggregate([
    { $match: { companyId, 'driver.id': { $exists: true }, scheduledDate: { $gte: startDate } } },
    {
      $group: {
        _id: '$driver.id',
        driverName: { $first: '$driver.name' },
        totalRoutes: { $sum: 1 },
        completedRoutes: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        totalDistance: { $sum: '$metrics.totalDistance' },
        totalStops: { $sum: '$metrics.totalStops' }
      }
    },
    { $sort: { completedRoutes: -1 } }
  ]);

  res.status(200).json({
    success: true,
    data: { drivers: driverPerformance }
  });
});

/**
 * @desc    Get cost analysis
 * @route   GET /api/analytics/costs
 * @access  Private/Admin
 */
const getCostAnalytics = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const days = parseInt(req.query.days) || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const costBreakdown = await RoutePlan.aggregate([
    { $match: { companyId, scheduledDate: { $gte: startDate }, 'cost.total': { $gt: 0 } } },
    {
      $group: {
        _id: null,
        totalCost: { $sum: '$cost.total' },
        fuelCost: { $sum: '$cost.breakdown.fuel' },
        tollsCost: { $sum: '$cost.breakdown.tolls' },
        avgCostPerRoute: { $avg: '$cost.total' }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: { summary: costBreakdown[0] || {} }
  });
});

module.exports = {
  getDashboard,
  getRouteAnalytics,
  getDeliveryAnalytics,
  getDriverAnalytics,
  getCostAnalytics
};
