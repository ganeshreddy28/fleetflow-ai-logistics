/**
 * AI Route Optimization Service
 * Uses Euron AI API for intelligent route optimization
 */

const axios = require('axios');
const { logger } = require('../utils/logger');

class AIRouteService {
  constructor() {
    this.apiKey = process.env.EURON_API_KEY;
    this.apiUrl = process.env.EURON_API_URL || 'https://api.euron.one/api/v1/euri/chat/completions';
    this.model = 'gpt-4.1-nano';
  }

  /**
   * Generate optimized route using AI
   */
  async optimizeRoute(params) {
    const {
      deliveries,
      startLocation,
      endLocation,
      vehicleType,
      constraints,
      trafficData,
      weatherData,
      optimizationPriority
    } = params;

    try {
      const prompt = this.buildOptimizationPrompt({
        deliveries,
        startLocation,
        endLocation: endLocation || startLocation,
        vehicleType: vehicleType || 'van',
        constraints: constraints || {},
        trafficData,
        weatherData,
        optimizationPriority: optimizationPriority || 'balanced'
      });

      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            { role: 'system', content: this.getSystemPrompt() },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 4000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 60000
        }
      );

      const aiResponse = response.data.choices[0].message.content;
      const optimizedRoute = this.parseAIResponse(aiResponse, deliveries);

      return {
        success: true,
        optimizedRoute,
        aiModel: this.model,
        confidence: this.calculateConfidence(optimizedRoute, deliveries),
        reasoning: optimizedRoute.reasoning
      };
    } catch (error) {
      logger.error(`AI Route Optimization error: ${error.message}`);
      logger.info('Falling back to basic route optimization');
      return this.fallbackOptimization(deliveries, startLocation, endLocation, optimizationPriority);
    }
  }

  getSystemPrompt() {
    return `You are an expert logistics route optimization AI. Analyze delivery data and generate the most efficient route sequence.

Respond with valid JSON containing:
1. "sequence": Array of delivery indices in optimal order (0-indexed)
2. "reasoning": Brief explanation of optimization logic
3. "estimatedMetrics": Object with totalDistance (km), totalDuration (minutes), fuelEstimate (liters)
4. "warnings": Array of any concerns
5. "alternativeSequences": Array of 1-2 alternatives with metrics

Consider: time windows, priority levels, geographic clustering, traffic, weather, vehicle capacity.
Respond with valid JSON only.`;
  }

  buildOptimizationPrompt(params) {
    const { deliveries, startLocation, endLocation, vehicleType, constraints, trafficData, weatherData, optimizationPriority } = params;

    const deliveryData = deliveries.map((d, index) => ({
      index,
      address: d.address?.fullAddress || `${d.address?.street}, ${d.address?.city}`,
      coordinates: d.location?.coordinates,
      timeWindow: { earliest: d.timeWindow?.earliest, latest: d.timeWindow?.latest },
      priority: d.priority,
      serviceTime: d.serviceTime || 10,
      packageType: d.packageDetails?.type || 'standard'
    }));

    return `OPTIMIZE ROUTE
Start: ${JSON.stringify(startLocation)}
End: ${JSON.stringify(endLocation)}
Vehicle: ${vehicleType}
Priority: ${optimizationPriority}

DELIVERIES (${deliveries.length}):
${JSON.stringify(deliveryData, null, 2)}

CONDITIONS:
Traffic: ${trafficData ? JSON.stringify({ congestionLevel: trafficData.congestionLevel, incidents: trafficData.incidents?.length || 0 }) : 'N/A'}
Weather: ${weatherData ? JSON.stringify({ condition: weatherData.current?.condition, visibility: weatherData.current?.visibility }) : 'N/A'}

Return optimal delivery sequence as JSON.`;
  }

  parseAIResponse(aiResponse, deliveries) {
    try {
      let jsonStr = aiResponse;
      const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1];

      const parsed = JSON.parse(jsonStr.trim());

      if (!parsed.sequence || !Array.isArray(parsed.sequence)) {
        throw new Error('Invalid sequence in AI response');
      }

      const validIndices = parsed.sequence.every(idx => Number.isInteger(idx) && idx >= 0 && idx < deliveries.length);
      if (!validIndices) throw new Error('Invalid delivery indices');

      const optimizedDeliveries = parsed.sequence.map((idx, seqNum) => ({
        ...(deliveries[idx].toObject ? deliveries[idx].toObject() : deliveries[idx]),
        sequenceInRoute: seqNum + 1,
        originalIndex: idx
      }));

      return {
        sequence: parsed.sequence,
        deliveries: optimizedDeliveries,
        reasoning: parsed.reasoning || 'AI-optimized route',
        estimatedMetrics: parsed.estimatedMetrics || {},
        warnings: parsed.warnings || [],
        alternativeSequences: parsed.alternativeSequences || []
      };
    } catch (error) {
      logger.error(`Failed to parse AI response: ${error.message}`);
      throw new Error('Failed to parse AI optimization response');
    }
  }

  calculateConfidence(optimizedRoute, originalDeliveries) {
    let confidence = 0.7;
    if (optimizedRoute.deliveries.every(d => d.timeWindow?.earliest && d.timeWindow?.latest)) confidence += 0.1;
    if (optimizedRoute.reasoning?.length > 20) confidence += 0.1;
    if (optimizedRoute.estimatedMetrics?.totalDistance) confidence += 0.1;
    return Math.min(confidence, 1);
  }

  fallbackOptimization(deliveries, startLocation, endLocation, priority) {
    logger.info('Using fallback nearest-neighbor optimization');

    const sortedDeliveries = [...deliveries].map((d, idx) => ({ ...d, originalIndex: idx }));
    const priorityGroups = {
      urgent: sortedDeliveries.filter(d => d.priority === 'urgent'),
      high: sortedDeliveries.filter(d => d.priority === 'high'),
      normal: sortedDeliveries.filter(d => d.priority === 'normal'),
      low: sortedDeliveries.filter(d => d.priority === 'low')
    };

    const optimizedSequence = [];
    let currentLocation = startLocation?.coordinates || [0, 0];

    for (const priorityLevel of ['urgent', 'high', 'normal', 'low']) {
      const remaining = [...priorityGroups[priorityLevel]];
      while (remaining.length > 0) {
        let nearestIdx = 0;
        let nearestDist = Infinity;
        for (let i = 0; i < remaining.length; i++) {
          const dist = this.calculateDistance(currentLocation, remaining[i].location?.coordinates || [0, 0]);
          if (dist < nearestDist) { nearestDist = dist; nearestIdx = i; }
        }
        const nearest = remaining.splice(nearestIdx, 1)[0];
        optimizedSequence.push(nearest.originalIndex);
        currentLocation = nearest.location?.coordinates || currentLocation;
      }
    }

    let totalDistance = 0;
    let prevCoords = startLocation?.coordinates || [0, 0];
    for (const idx of optimizedSequence) {
      const coords = deliveries[idx].location?.coordinates || prevCoords;
      totalDistance += this.calculateDistance(prevCoords, coords);
      prevCoords = coords;
    }
    if (endLocation?.coordinates) totalDistance += this.calculateDistance(prevCoords, endLocation.coordinates);

    const optimizedDeliveries = optimizedSequence.map((idx, seqNum) => ({
      ...(deliveries[idx].toObject ? deliveries[idx].toObject() : deliveries[idx]),
      sequenceInRoute: seqNum + 1,
      originalIndex: idx
    }));

    return {
      success: true,
      optimizedRoute: {
        sequence: optimizedSequence,
        deliveries: optimizedDeliveries,
        reasoning: 'Fallback optimization using nearest-neighbor with priority grouping',
        estimatedMetrics: {
          totalDistance: Math.round(totalDistance * 10) / 10,
          totalDuration: Math.round((totalDistance / 40) * 60),
          fuelEstimate: Math.round(totalDistance * 0.1 * 10) / 10
        },
        warnings: ['Using fallback optimization - AI service unavailable']
      },
      aiModel: 'fallback-nearest-neighbor',
      confidence: 0.6
    };
  }

  calculateDistance(coords1, coords2) {
    if (!coords1 || !coords2) return 0;
    const [lon1, lat1] = coords1;
    const [lon2, lat2] = coords2;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  async analyzeRoute(route, trafficData, weatherData) {
    const issues = [];
    const suggestions = [];

    for (const delivery of route.deliveries || []) {
      if (delivery.timeWindow) {
        const windowMinutes = (new Date(delivery.timeWindow.latest) - new Date(delivery.timeWindow.earliest)) / 60000;
        if (windowMinutes < 30) {
          issues.push({ type: 'tight_window', delivery: delivery._id, message: `Tight ${windowMinutes} minute window` });
        }
      }
    }

    if (trafficData?.congestionLevel === 'heavy' || trafficData?.congestionLevel === 'severe') {
      issues.push({ type: 'traffic', message: `Heavy traffic: ${trafficData.congestionLevel}` });
      suggestions.push('Consider departing earlier or adjusting route');
    }

    if (weatherData?.current?.condition) {
      const badConditions = ['storm', 'hail', 'heavy_rain', 'snow', 'fog'];
      if (badConditions.includes(weatherData.current.condition)) {
        issues.push({ type: 'weather', message: `Adverse weather: ${weatherData.current.condition}` });
        suggestions.push('Plan for weather delays');
      }
    }

    return { issues, suggestions };
  }

  async reoptimizeRoute(currentRoute, newConditions) {
    const { trafficUpdate, weatherUpdate, completedDeliveries } = newConditions;

    const remainingDeliveries = currentRoute.deliveries.filter(
      d => !completedDeliveries?.includes(d._id?.toString())
    );

    if (remainingDeliveries.length === 0) {
      return { reoptimizationNeeded: false, reason: 'All deliveries completed' };
    }

    const shouldReoptimize = 
      (trafficUpdate?.delayMinutes > 15) ||
      (weatherUpdate?.current?.condition && ['storm', 'hail'].includes(weatherUpdate.current.condition)) ||
      (trafficUpdate?.incidents?.some(i => i.severity === 'severe'));

    if (!shouldReoptimize) {
      return { reoptimizationNeeded: false, reason: 'Current route still optimal' };
    }

    const currentPosition = currentRoute.route?.[0]?.location?.coordinates || currentRoute.startLocation?.coordinates;

    const result = await this.optimizeRoute({
      deliveries: remainingDeliveries,
      startLocation: { coordinates: currentPosition },
      endLocation: currentRoute.endLocation,
      vehicleType: currentRoute.vehicle?.type,
      trafficData: trafficUpdate,
      weatherData: weatherUpdate,
      optimizationPriority: currentRoute.optimizationSettings?.priority || 'balanced'
    });

    return {
      reoptimizationNeeded: true,
      reason: 'Conditions changed significantly',
      newRoute: result.optimizedRoute,
      timeSaved: result.optimizedRoute?.estimatedMetrics?.totalDuration 
        ? (currentRoute.metrics?.totalDuration || 0) - result.optimizedRoute.estimatedMetrics.totalDuration
        : null
    };
  }
}

module.exports = new AIRouteService();
