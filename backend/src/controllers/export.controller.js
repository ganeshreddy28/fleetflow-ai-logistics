/**
 * Export Controller
 * Handles file exports (PDF, CSV, iCal)
 */

const { RoutePlan, Delivery } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const ExportService = require('../services/export.service');

/**
 * @desc    Export route plan to PDF
 * @route   GET /api/export/routes/:id/pdf
 * @access  Private
 */
const exportRoutePDF = asyncHandler(async (req, res) => {
  const route = await RoutePlan.findById(req.params.id).populate('deliveries');

  if (!route) {
    throw new ApiError('Route not found', 404);
  }

  if (route.companyId !== req.user.companyId) {
    throw new ApiError('Not authorized', 403);
  }

  const pdfBuffer = await ExportService.exportToPDF(route);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="route-${route._id}.pdf"`);
  res.send(pdfBuffer);
});

/**
 * @desc    Export route plan to CSV
 * @route   GET /api/export/routes/:id/csv
 * @access  Private
 */
const exportRouteCSV = asyncHandler(async (req, res) => {
  const route = await RoutePlan.findById(req.params.id).populate('deliveries');

  if (!route) {
    throw new ApiError('Route not found', 404);
  }

  if (route.companyId !== req.user.companyId) {
    throw new ApiError('Not authorized', 403);
  }

  const csv = await ExportService.exportToCSV(route);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="route-${route._id}.csv"`);
  res.send(csv);
});

/**
 * @desc    Export route plan to iCal
 * @route   GET /api/export/routes/:id/ical
 * @access  Private
 */
const exportRouteICal = asyncHandler(async (req, res) => {
  const route = await RoutePlan.findById(req.params.id).populate('deliveries');

  if (!route) {
    throw new ApiError('Route not found', 404);
  }

  if (route.companyId !== req.user.companyId) {
    throw new ApiError('Not authorized', 403);
  }

  const ical = await ExportService.exportToICal(route);

  res.setHeader('Content-Type', 'text/calendar');
  res.setHeader('Content-Disposition', `attachment; filename="route-${route._id}.ics"`);
  res.send(ical);
});

/**
 * @desc    Export deliveries to CSV
 * @route   GET /api/export/deliveries/csv
 * @access  Private
 */
const exportDeliveriesCSV = asyncHandler(async (req, res) => {
  const query = { companyId: req.user.companyId };

  // Apply filters
  if (req.query.status) {
    query.status = req.query.status;
  }
  if (req.query.startDate) {
    query['timeWindow.earliest'] = { $gte: new Date(req.query.startDate) };
  }
  if (req.query.endDate) {
    query['timeWindow.earliest'] = { 
      ...query['timeWindow.earliest'],
      $lte: new Date(req.query.endDate) 
    };
  }

  const deliveries = await Delivery.find(query).sort({ 'timeWindow.earliest': 1 });

  const csv = await ExportService.exportDeliveriesToCSV(deliveries);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="deliveries-${Date.now()}.csv"`);
  res.send(csv);
});

/**
 * @desc    Export multiple routes to CSV
 * @route   POST /api/export/routes/bulk/csv
 * @access  Private
 */
const exportBulkRoutesCSV = asyncHandler(async (req, res) => {
  const { routeIds } = req.body;

  if (!routeIds || !Array.isArray(routeIds) || routeIds.length === 0) {
    throw new ApiError('Route IDs are required', 400);
  }

  const routes = await RoutePlan.find({
    _id: { $in: routeIds },
    companyId: req.user.companyId
  }).populate('deliveries');

  // Combine all deliveries
  const allDeliveries = routes.flatMap(route => route.deliveries || []);

  const csv = await ExportService.exportDeliveriesToCSV(allDeliveries);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="bulk-routes-${Date.now()}.csv"`);
  res.send(csv);
});

module.exports = {
  exportRoutePDF,
  exportRouteCSV,
  exportRouteICal,
  exportDeliveriesCSV,
  exportBulkRoutesCSV
};
