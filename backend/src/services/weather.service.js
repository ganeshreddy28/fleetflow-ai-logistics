/**
 * Open-Meteo Weather Service
 * Fetches weather data from Open-Meteo API (Free, no API key required)
 */

const axios = require('axios');
const { logger } = require('../utils/logger');

class WeatherService {
  constructor() {
    this.baseUrl = process.env.OPENMETEO_API_URL || 'https://api.open-meteo.com/v1/forecast';
  }

  /**
   * Get current weather and forecast for a location
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   */
  async getWeather(lat, lng) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          latitude: lat,
          longitude: lng,
          current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,visibility',
          hourly: 'temperature_2m,precipitation_probability,weather_code,visibility',
          daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max',
          timezone: 'auto',
          forecast_days: 3
        },
        timeout: 10000
      });

      const data = response.data;
      
      return {
        current: this.parseCurrentWeather(data.current, data.current_units),
        hourlyForecast: this.parseHourlyForecast(data.hourly),
        dailyForecast: this.parseDailyForecast(data.daily),
        alerts: this.generateAlerts(data),
        location: {
          latitude: data.latitude,
          longitude: data.longitude,
          timezone: data.timezone,
          elevation: data.elevation
        },
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error(`Weather service error: ${error.message}`);
      throw new Error(`Failed to fetch weather data: ${error.message}`);
    }
  }

  /**
   * Get weather for multiple points along a route
   * @param {Array} coordinates - Array of [lng, lat] pairs
   */
  async getWeatherAlongRoute(coordinates) {
    try {
      // Sample points along route (max 5 to avoid too many requests)
      const samplePoints = this.samplePoints(coordinates, 5);
      
      const weatherData = await Promise.all(
        samplePoints.map(([lng, lat]) => 
          this.getWeather(lat, lng).catch(err => {
            logger.warn(`Weather fetch failed for ${lat},${lng}: ${err.message}`);
            return null;
          })
        )
      );

      // Filter out failed requests
      const validData = weatherData.filter(d => d !== null);
      
      if (validData.length === 0) {
        throw new Error('Failed to fetch weather for any point on route');
      }

      // Analyze weather conditions
      const analysis = this.analyzeRouteWeather(validData);
      
      return {
        points: validData,
        analysis,
        warnings: this.generateRouteWarnings(validData)
      };
    } catch (error) {
      logger.error(`Route weather error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse current weather data
   */
  parseCurrentWeather(current, units) {
    if (!current) return null;

    return {
      condition: this.mapWeatherCode(current.weather_code),
      temperature: current.temperature_2m,
      feelsLike: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      windDirection: this.degreesToDirection(current.wind_direction_10m),
      visibility: current.visibility ? current.visibility / 1000 : null, // Convert to km
      precipitation: current.precipitation,
      description: this.getWeatherDescription(current.weather_code),
      units: {
        temperature: units?.temperature_2m || '°C',
        windSpeed: units?.wind_speed_10m || 'km/h',
        visibility: 'km',
        precipitation: units?.precipitation || 'mm'
      }
    };
  }

  /**
   * Parse hourly forecast
   */
  parseHourlyForecast(hourly) {
    if (!hourly || !hourly.time) return [];

    return hourly.time.slice(0, 24).map((time, i) => ({
      time: new Date(time),
      temperature: hourly.temperature_2m?.[i],
      precipitationProbability: hourly.precipitation_probability?.[i],
      condition: this.mapWeatherCode(hourly.weather_code?.[i]),
      visibility: hourly.visibility?.[i] ? hourly.visibility[i] / 1000 : null
    }));
  }

  /**
   * Parse daily forecast
   */
  parseDailyForecast(daily) {
    if (!daily || !daily.time) return [];

    return daily.time.map((time, i) => ({
      date: new Date(time),
      condition: this.mapWeatherCode(daily.weather_code?.[i]),
      temperatureMax: daily.temperature_2m_max?.[i],
      temperatureMin: daily.temperature_2m_min?.[i],
      precipitationSum: daily.precipitation_sum?.[i],
      precipitationProbability: daily.precipitation_probability_max?.[i]
    }));
  }

  /**
   * Generate weather alerts
   */
  generateAlerts(data) {
    const alerts = [];
    const current = data.current;

    if (!current) return alerts;

    // Heavy precipitation alert
    if (current.precipitation > 10) {
      alerts.push({
        type: 'precipitation',
        severity: current.precipitation > 20 ? 'high' : 'medium',
        message: `Heavy precipitation detected: ${current.precipitation}mm`,
        startTime: new Date()
      });
    }

    // Low visibility alert
    if (current.visibility && current.visibility < 2000) {
      alerts.push({
        type: 'visibility',
        severity: current.visibility < 500 ? 'high' : 'medium',
        message: `Low visibility: ${(current.visibility / 1000).toFixed(1)}km`,
        startTime: new Date()
      });
    }

    // High wind alert
    if (current.wind_speed_10m > 50) {
      alerts.push({
        type: 'wind',
        severity: current.wind_speed_10m > 70 ? 'high' : 'medium',
        message: `Strong winds: ${current.wind_speed_10m}km/h`,
        startTime: new Date()
      });
    }

    // Severe weather codes
    const severeWeatherCodes = [65, 66, 67, 75, 77, 82, 85, 86, 95, 96, 99];
    if (severeWeatherCodes.includes(current.weather_code)) {
      alerts.push({
        type: 'severe_weather',
        severity: 'high',
        message: this.getWeatherDescription(current.weather_code),
        startTime: new Date()
      });
    }

    return alerts;
  }

  /**
   * Analyze weather along route
   */
  analyzeRouteWeather(weatherPoints) {
    const conditions = weatherPoints.map(p => p.current?.condition).filter(Boolean);
    const temps = weatherPoints.map(p => p.current?.temperature).filter(t => t !== null);
    const visibility = weatherPoints.map(p => p.current?.visibility).filter(v => v !== null);

    // Find worst condition on route
    const conditionPriority = {
      'storm': 10, 'hail': 9, 'heavy_rain': 8, 'snow': 7,
      'fog': 6, 'rain': 5, 'wind': 4, 'cloudy': 2, 'clear': 1
    };
    
    const worstCondition = conditions.reduce((worst, current) => {
      return (conditionPriority[current] || 0) > (conditionPriority[worst] || 0) ? current : worst;
    }, 'clear');

    return {
      worstCondition,
      averageTemperature: temps.length > 0 ? 
        Math.round(temps.reduce((a, b) => a + b, 0) / temps.length) : null,
      minVisibility: visibility.length > 0 ? Math.min(...visibility) : null,
      drivingConditions: this.assessDrivingConditions(worstCondition, Math.min(...visibility)),
      recommendation: this.getWeatherRecommendation(worstCondition)
    };
  }

  /**
   * Generate route-specific warnings
   */
  generateRouteWarnings(weatherPoints) {
    const warnings = [];

    for (const point of weatherPoints) {
      if (point.alerts && point.alerts.length > 0) {
        warnings.push(...point.alerts);
      }
    }

    // Deduplicate warnings by type
    const uniqueWarnings = [];
    const seenTypes = new Set();
    
    for (const warning of warnings) {
      if (!seenTypes.has(warning.type)) {
        uniqueWarnings.push(warning);
        seenTypes.add(warning.type);
      }
    }

    return uniqueWarnings;
  }

  /**
   * Assess driving conditions
   */
  assessDrivingConditions(condition, minVisibility) {
    const dangerousConditions = ['storm', 'hail', 'heavy_rain', 'snow'];
    const cautionConditions = ['fog', 'rain', 'wind'];

    if (dangerousConditions.includes(condition) || (minVisibility && minVisibility < 0.5)) {
      return 'dangerous';
    }
    if (cautionConditions.includes(condition) || (minVisibility && minVisibility < 2)) {
      return 'caution';
    }
    return 'good';
  }

  /**
   * Get weather recommendation
   */
  getWeatherRecommendation(condition) {
    const recommendations = {
      'storm': 'Consider delaying route. Severe weather expected.',
      'hail': 'Dangerous driving conditions. Delay recommended.',
      'heavy_rain': 'Reduce speed and increase following distance.',
      'snow': 'Winter driving conditions. Use caution.',
      'fog': 'Use low beam headlights. Reduce speed.',
      'rain': 'Roads may be slippery. Drive carefully.',
      'wind': 'Be cautious with high-profile vehicles.',
      'cloudy': 'Normal driving conditions.',
      'clear': 'Good driving conditions.'
    };
    return recommendations[condition] || 'Normal driving conditions.';
  }

  /**
   * Map Open-Meteo weather code to condition
   */
  mapWeatherCode(code) {
    if (code === undefined || code === null) return 'clear';
    
    // WMO Weather interpretation codes
    if (code === 0) return 'clear';
    if (code <= 3) return 'cloudy';
    if (code >= 45 && code <= 48) return 'fog';
    if (code >= 51 && code <= 55) return 'rain';
    if (code >= 56 && code <= 57) return 'rain';
    if (code >= 61 && code <= 65) return code >= 65 ? 'heavy_rain' : 'rain';
    if (code >= 66 && code <= 67) return 'rain';
    if (code >= 71 && code <= 77) return 'snow';
    if (code >= 80 && code <= 82) return code >= 82 ? 'heavy_rain' : 'rain';
    if (code >= 85 && code <= 86) return 'snow';
    if (code >= 95 && code <= 99) return code >= 96 ? 'hail' : 'storm';
    
    return 'clear';
  }

  /**
   * Get weather description from code
   */
  getWeatherDescription(code) {
    const descriptions = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Fog',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      56: 'Light freezing drizzle',
      57: 'Dense freezing drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      66: 'Light freezing rain',
      67: 'Heavy freezing rain',
      71: 'Slight snow fall',
      73: 'Moderate snow fall',
      75: 'Heavy snow fall',
      77: 'Snow grains',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      85: 'Slight snow showers',
      86: 'Heavy snow showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail'
    };
    return descriptions[code] || 'Unknown conditions';
  }

  /**
   * Convert wind direction degrees to cardinal direction
   */
  degreesToDirection(degrees) {
    if (degrees === undefined || degrees === null) return 'N/A';
    
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                       'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  }

  /**
   * Sample points from coordinate array
   */
  samplePoints(coordinates, maxPoints) {
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

module.exports = new WeatherService();
