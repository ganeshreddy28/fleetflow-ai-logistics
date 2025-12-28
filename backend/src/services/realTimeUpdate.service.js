/**
 * Real-Time Update Service
 * Fetches and processes real-time traffic/weather updates for active routes
 */

const { RoutePlan, RealTimeUpdate } = require('../models');
const TomTomService = require('./tomtom.service');
const WeatherService = require('./weather.service');
const AIRouteService = require('./aiRoute.service');
const { logger } = require('../utils/logger');

class RealTimeUpdateService {
  /**
   * Update all active routes with real-time data
   */
  async updateAllActiveRoutes() {
    try {
      // Find all routes that are in progress or planned for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const activeRoutes = await RoutePlan.find({
        status: { $in: ['planned', 'in_progress'] },
        scheduledDate: { $gte: today, $lt: tomorrow }
      }).populate('deliveries');

      logger.info(`Updating ${activeRoutes.length} active routes`);

      const results = await Promise.allSettled(
        activeRoutes.map(route => this.updateRouteData(route))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      logger.info(`Route updates completed: ${successful} successful, ${failed} failed`);

      return { successful, failed, total: activeRoutes.length };
    } catch (error) {
      logger.error(`Failed to update active routes: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update a single route with real-time data
   */
  async updateRouteData(route) {
    try {
      // Get route coordinates for data fetching
      const coordinates = route.routeGeometry?.coordinates || 
                         route.route?.map(wp => wp.location?.coordinates).filter(Boolean) || [];

      if (coordinates.length === 0) {
        logger.warn(`Route ${route._id} has no coordinates`);
        return null;
      }

      // Calculate bounding box for the route
      const bbox = this.calculateBoundingBox(coordinates);

      // Fetch traffic data
      let trafficData = null;
      try {
        const [trafficFlow, incidents] = await Promise.all([
          TomTomService.getTrafficAlongRoute(coordinates),
          TomTomService.getTrafficIncidents(bbox.minLat, bbox.minLng, bbox.maxLat, bbox.maxLng)
        ]);

        trafficData = {
          currentSpeed: trafficFlow.averageSpeed,
          freeFlowSpeed: trafficFlow.averageFreeFlowSpeed,
          congestionLevel: trafficFlow.congestionLevel,
          congestionPercentage: this.calculateCongestionPercentage(trafficFlow),
          delayMinutes: this.calculateDelayMinutes(trafficFlow, route.metrics?.totalDuration),
          incidents: incidents.slice(0, 10), // Limit to 10 incidents
          lastUpdated: new Date()
        };
      } catch (error) {
        logger.warn(`Traffic data fetch failed for route ${route._id}: ${error.message}`);
      }

      // Fetch weather data
      let weatherData = null;
      try {
        // Get weather for midpoint of route
        const midpoint = coordinates[Math.floor(coordinates.length / 2)];
        if (midpoint) {
          const weather = await WeatherService.getWeather(midpoint[1], midpoint[0]);
          weatherData = {
            current: weather.current,
            forecast: weather.hourlyForecast.slice(0, 6),
            alerts: weather.alerts,
            lastUpdated: new Date()
          };
        }
      } catch (error) {
        logger.warn(`Weather data fetch failed for route ${route._id}: ${error.message}`);
      }

      // Calculate updated ETA
      const updatedETA = this.calculateUpdatedETA(route, trafficData);

      // Determine if re-optimization is suggested
      const recalculation = this.shouldRecalculate(trafficData, weatherData, updatedETA);

      // Create real-time update record
      const update = await RealTimeUpdate.create({
        routePlanId: route._id,
        trafficData,
        weatherData,
        recalculationSuggested: recalculation.suggested,
        recalculationReason: recalculation.reason,
        updatedETA,
        source: 'system',
        timestamp: new Date()
      });

      // Update route status if delayed
      if (updatedETA.delayMinutes > 30 && route.status !== 'delayed') {
        await RoutePlan.findByIdAndUpdate(route._id, { status: 'delayed' });
      }

      // Trigger notification if needed
      if (recalculation.suggested || updatedETA.delayMinutes > 15) {
        await this.triggerNotification(route, update);
      }

      return update;
    } catch (error) {
      logger.error(`Failed to update route ${route._id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get latest update for a route
   */
  async getLatestUpdate(routePlanId) {
    return await RealTimeUpdate.getLatestForRoute(routePlanId);
  }

  /**
   * Get update history for a route
   */
  async getUpdateHistory(routePlanId, hours = 24) {
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - hours);

    return await RealTimeUpdate.getUpdatesInRange(routePlanId, startTime, new Date());
  }

  /**
   * Calculate bounding box for coordinates
   */
  calculateBoundingBox(coordinates) {
    if (!coordinates || coordinates.length === 0) {
      return { minLat: 0, minLng: 0, maxLat: 0, maxLng: 0 };
    }

    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    for (const [lng, lat] of coordinates) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }

    // Add padding (approximately 5km)
    const padding = 0.05;
    return {
      minLat: minLat - padding,
      maxLat: maxLat + padding,
      minLng: minLng - padding,
      maxLng: maxLng + padding
    };
  }

  /**
   * Calculate congestion percentage
   */
  calculateCongestionPercentage(trafficFlow) {
    if (!trafficFlow.averageSpeed || !trafficFlow.averageFreeFlowSpeed) return 0;
    const ratio = 1 - (trafficFlow.averageSpeed / trafficFlow.averageFreeFlowSpeed);
    return Math.round(Math.max(0, Math.min(100, ratio * 100)));
  }

  /**
   * Calculate delay in minutes
   */
  calculateDelayMinutes(trafficFlow, originalDuration) {
    if (!trafficFlow.averageSpeed || !trafficFlow.averageFreeFlowSpeed || !originalDuration) return 0;
    
    const speedRatio = trafficFlow.averageFreeFlowSpeed / trafficFlow.averageSpeed;
    const delayedDuration = originalDuration * speedRatio;
    return Math.round(delayedDuration - originalDuration);
  }

  /**
   * Calculate updated ETA based on traffic
   */
  calculateUpdatedETA(route, trafficData) {
    const originalETA = route.endTime || route.scheduledDate;
    
    if (!trafficData || !trafficData.delayMinutes) {
      return {
        originalETA,
        currentETA: originalETA,
        delayMinutes: 0
      };
    }

    const currentETA = new Date(originalETA);
    currentETA.setMinutes(currentETA.getMinutes() + trafficData.delayMinutes);

    return {
      originalETA,
      currentETA,
      delayMinutes: trafficData.delayMinutes
    };
  }

  /**
   * Determine if route should be recalculated
   */
  shouldRecalculate(trafficData, weatherData, updatedETA) {
    const reasons = [];

    // Check traffic conditions
    if (trafficData) {
      if (trafficData.congestionLevel === 'severe') {
        reasons.push('Severe traffic congestion detected');
      }
      if (trafficData.incidents?.some(i => i.type === 'closure')) {
        reasons.push('Road closure on route');
      }
      if (updatedETA.delayMinutes > 30) {
        reasons.push(`Significant delay of ${updatedETA.delayMinutes} minutes`);
      }
    }

    // Check weather conditions
    if (weatherData?.current) {
      const severeConditions = ['storm', 'hail', 'heavy_rain'];
      if (severeConditions.includes(weatherData.current.condition)) {
        reasons.push(`Severe weather: ${weatherData.current.condition}`);
      }
      if (weatherData.current.visibility && weatherData.current.visibility < 1) {
        reasons.push('Very low visibility');
      }
    }

    // Check weather alerts
    if (weatherData?.alerts?.length > 0) {
      const severeAlerts = weatherData.alerts.filter(a => a.severity === 'high');
      if (severeAlerts.length > 0) {
        reasons.push('Severe weather alerts');
      }
    }

    return {
      suggested: reasons.length > 0,
      reason: reasons.join('; ') || null
    };
  }

  /**
   * Trigger notification for route update
   */
  async triggerNotification(route, update) {
    // In a real implementation, this would send notifications via WebSocket, 
    // push notifications, email, or SMS
    logger.info(`Notification triggered for route ${route._id}: ${update.recalculationReason || 'Route update'}`);

    // Mark notification as sent
    await RealTimeUpdate.findByIdAndUpdate(update._id, {
      notificationSent: true,
      notificationSentAt: new Date()
    });

    return true;
  }

  /**
   * Manually trigger route re-optimization
   */
  async triggerReoptimization(routeId) {
    const route = await RoutePlan.findById(routeId).populate('deliveries');
    
    if (!route) {
      throw new Error('Route not found');
    }

    // Get latest conditions
    const latestUpdate = await this.getLatestUpdate(routeId);

    // Re-optimize using AI service
    const result = await AIRouteService.reoptimizeRoute(route, {
      trafficUpdate: latestUpdate?.trafficData,
      weatherUpdate: latestUpdate?.weatherData,
      completedDeliveries: route.deliveries
        .filter(d => d.status === 'delivered')
        .map(d => d._id.toString())
    });

    return result;
  }
}

module.exports = new RealTimeUpdateService();
