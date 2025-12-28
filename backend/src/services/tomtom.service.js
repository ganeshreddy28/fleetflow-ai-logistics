/**
 * TomTom Traffic Service
 * Fetches real-time traffic data from TomTom API
 */

const axios = require('axios');
const { logger } = require('../utils/logger');

class TomTomService {
  constructor() {
    this.apiKey = process.env.TOMTOM_API_KEY;
    this.baseUrl = 'https://api.tomtom.com';
  }

  /**
   * Get traffic flow data for a specific location
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} zoom - Zoom level (0-22)
   */
  async getTrafficFlow(lat, lng, zoom = 10) {
    try {
      const url = `${this.baseUrl}/traffic/services/4/flowSegmentData/absolute/${zoom}/json`;
      
      const response = await axios.get(url, {
        params: {
          key: this.apiKey,
          point: `${lat},${lng}`,
          unit: 'KMPH'
        },
        timeout: 10000
      });

      const data = response.data.flowSegmentData;
      
      return {
        currentSpeed: data.currentSpeed,
        freeFlowSpeed: data.freeFlowSpeed,
        currentTravelTime: data.currentTravelTime,
        freeFlowTravelTime: data.freeFlowTravelTime,
        confidence: data.confidence,
        roadClosure: data.roadClosure || false,
        congestionLevel: this.calculateCongestionLevel(data.currentSpeed, data.freeFlowSpeed),
        coordinates: data.coordinates?.coordinate || []
      };
    } catch (error) {
      logger.error(`TomTom traffic flow error: ${error.message}`);
      throw new Error(`Failed to fetch traffic flow data: ${error.message}`);
    }
  }

  /**
   * Get traffic incidents in an area
   * @param {number} minLat - Minimum latitude (bounding box)
   * @param {number} minLng - Minimum longitude
   * @param {number} maxLat - Maximum latitude
   * @param {number} maxLng - Maximum longitude
   */
  async getTrafficIncidents(minLat, minLng, maxLat, maxLng) {
    try {
      const url = `${this.baseUrl}/traffic/services/5/incidentDetails`;
      
      const response = await axios.get(url, {
        params: {
          key: this.apiKey,
          bbox: `${minLng},${minLat},${maxLng},${maxLat}`,
          fields: '{incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description,code},startTime,endTime,from,to,length,delay,roadNumbers}}}',
          language: 'en-US',
          categoryFilter: '0,1,2,3,4,5,6,7,8,9,10,11,14'
        },
        timeout: 10000
      });

      const incidents = response.data.incidents || [];
      
      return incidents.map(incident => ({
        type: this.mapIncidentType(incident.properties?.iconCategory),
        severity: this.mapSeverity(incident.properties?.magnitudeOfDelay),
        location: {
          type: incident.geometry?.type || 'Point',
          coordinates: incident.geometry?.coordinates || []
        },
        description: incident.properties?.events?.[0]?.description || 'Traffic incident',
        delay: incident.properties?.delay || 0,
        startTime: incident.properties?.startTime,
        endTime: incident.properties?.endTime,
        from: incident.properties?.from,
        to: incident.properties?.to,
        length: incident.properties?.length,
        affectedRoads: incident.properties?.roadNumbers || [],
        source: 'tomtom'
      }));
    } catch (error) {
      logger.error(`TomTom incidents error: ${error.message}`);
      throw new Error(`Failed to fetch traffic incidents: ${error.message}`);
    }
  }

  /**
   * Calculate route with traffic
   * @param {Array} waypoints - Array of {lat, lng} objects
   * @param {Object} options - Routing options
   */
  async calculateRoute(waypoints, options = {}) {
    try {
      if (waypoints.length < 2) {
        throw new Error('At least 2 waypoints are required');
      }

      // Format waypoints for TomTom
      const locations = waypoints.map(wp => `${wp.lat},${wp.lng}`).join(':');
      
      const url = `${this.baseUrl}/routing/1/calculateRoute/${locations}/json`;
      
      const response = await axios.get(url, {
        params: {
          key: this.apiKey,
          traffic: true,
          travelMode: options.vehicleType || 'car',
          routeType: this.mapRouteType(options.priority),
          avoid: this.buildAvoidList(options),
          departAt: options.departureTime || 'now',
          computeBestOrder: options.optimizeOrder || false,
          routeRepresentation: 'polyline',
          computeTravelTimeFor: 'all'
        },
        timeout: 30000
      });

      const route = response.data.routes[0];
      const summary = route.summary;
      const legs = route.legs || [];

      return {
        summary: {
          lengthInMeters: summary.lengthInMeters,
          travelTimeInSeconds: summary.travelTimeInSeconds,
          trafficDelayInSeconds: summary.trafficDelayInSeconds,
          departureTime: summary.departureTime,
          arrivalTime: summary.arrivalTime,
          noTrafficTravelTimeInSeconds: summary.noTrafficTravelTimeInSeconds,
          historicTrafficTravelTimeInSeconds: summary.historicTrafficTravelTimeInSeconds,
          liveTrafficIncidentsTravelTimeInSeconds: summary.liveTrafficIncidentsTravelTimeInSeconds
        },
        legs: legs.map(leg => ({
          lengthInMeters: leg.summary?.lengthInMeters,
          travelTimeInSeconds: leg.summary?.travelTimeInSeconds,
          trafficDelayInSeconds: leg.summary?.trafficDelayInSeconds,
          points: leg.points?.map(p => [p.longitude, p.latitude]) || []
        })),
        geometry: {
          type: 'LineString',
          coordinates: route.legs?.flatMap(leg => 
            leg.points?.map(p => [p.longitude, p.latitude]) || []
          ) || []
        },
        guidance: route.guidance?.instructions?.map(inst => ({
          instruction: inst.message,
          maneuver: inst.maneuver,
          distance: inst.routeOffsetInMeters
        })) || []
      };
    } catch (error) {
      logger.error(`TomTom routing error: ${error.message}`);
      throw new Error(`Failed to calculate route: ${error.message}`);
    }
  }

  /**
   * Get traffic data along a route (polyline)
   * @param {Array} coordinates - Array of [lng, lat] pairs
   */
  async getTrafficAlongRoute(coordinates) {
    try {
      // Sample points along the route for traffic data
      const samplePoints = this.sampleRoutePoints(coordinates, 10);
      
      const trafficData = await Promise.all(
        samplePoints.map(point => 
          this.getTrafficFlow(point[1], point[0]).catch(() => null)
        )
      );

      // Filter out failed requests and calculate averages
      const validData = trafficData.filter(d => d !== null);
      
      if (validData.length === 0) {
        return {
          averageSpeed: null,
          congestionLevel: 'unknown',
          segments: []
        };
      }

      const avgSpeed = validData.reduce((sum, d) => sum + d.currentSpeed, 0) / validData.length;
      const avgFreeFlow = validData.reduce((sum, d) => sum + d.freeFlowSpeed, 0) / validData.length;

      return {
        averageSpeed: Math.round(avgSpeed),
        averageFreeFlowSpeed: Math.round(avgFreeFlow),
        congestionLevel: this.calculateCongestionLevel(avgSpeed, avgFreeFlow),
        segments: validData
      };
    } catch (error) {
      logger.error(`Traffic along route error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Helper: Calculate congestion level from speeds
   */
  calculateCongestionLevel(currentSpeed, freeFlowSpeed) {
    if (!currentSpeed || !freeFlowSpeed) return 'unknown';
    
    const ratio = currentSpeed / freeFlowSpeed;
    
    if (ratio >= 0.9) return 'free';
    if (ratio >= 0.7) return 'light';
    if (ratio >= 0.5) return 'moderate';
    if (ratio >= 0.3) return 'heavy';
    return 'severe';
  }

  /**
   * Helper: Map TomTom incident type to our types
   */
  mapIncidentType(iconCategory) {
    const mapping = {
      0: 'other',
      1: 'accident',
      2: 'congestion',
      3: 'roadwork',
      4: 'roadwork',
      5: 'closure',
      6: 'closure',
      7: 'congestion',
      8: 'weather',
      9: 'event',
      10: 'other',
      11: 'other',
      14: 'other'
    };
    return mapping[iconCategory] || 'other';
  }

  /**
   * Helper: Map delay magnitude to severity
   */
  mapSeverity(magnitude) {
    if (magnitude === undefined || magnitude === null) return 'minor';
    if (magnitude <= 1) return 'minor';
    if (magnitude <= 2) return 'moderate';
    if (magnitude <= 3) return 'major';
    return 'severe';
  }

  /**
   * Helper: Map optimization priority to route type
   */
  mapRouteType(priority) {
    const mapping = {
      time: 'fastest',
      distance: 'shortest',
      cost: 'eco',
      balanced: 'fastest'
    };
    return mapping[priority] || 'fastest';
  }

  /**
   * Helper: Build avoid parameter
   */
  buildAvoidList(options) {
    const avoid = [];
    if (options.avoidTolls) avoid.push('tollRoads');
    if (options.avoidHighways) avoid.push('motorways');
    if (options.avoidFerries) avoid.push('ferries');
    return avoid.join(',') || undefined;
  }

  /**
   * Helper: Sample points along a route
   */
  sampleRoutePoints(coordinates, maxPoints) {
    if (coordinates.length <= maxPoints) return coordinates;
    
    const step = Math.floor(coordinates.length / maxPoints);
    const sampled = [];
    
    for (let i = 0; i < coordinates.length; i += step) {
      sampled.push(coordinates[i]);
      if (sampled.length >= maxPoints) break;
    }
    
    return sampled;
  }
}

module.exports = new TomTomService();
