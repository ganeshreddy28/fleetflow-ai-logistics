/**
 * RealTimeUpdate Model
 * Stores real-time traffic and weather data for routes
 */

const mongoose = require('mongoose');

const trafficIncidentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['accident', 'congestion', 'roadwork', 'closure', 'weather', 'event', 'other'],
    required: true
  },
  severity: {
    type: String,
    enum: ['minor', 'moderate', 'major', 'severe'],
    default: 'minor'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: [Number]
  },
  description: String,
  delay: Number, // additional delay in minutes
  startTime: Date,
  endTime: Date,
  affectedRoads: [String],
  source: String
}, { _id: false });

const weatherConditionSchema = new mongoose.Schema({
  condition: {
    type: String,
    enum: ['clear', 'cloudy', 'rain', 'heavy_rain', 'snow', 'fog', 'storm', 'hail', 'wind'],
    default: 'clear'
  },
  temperature: Number, // in Celsius
  humidity: Number, // percentage
  windSpeed: Number, // in km/h
  windDirection: String,
  visibility: Number, // in km
  precipitation: Number, // in mm
  uvIndex: Number,
  feelsLike: Number,
  description: String
}, { _id: false });

const realTimeUpdateSchema = new mongoose.Schema({
  routePlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RoutePlan',
    required: true
  },
  // Traffic data along the route
  trafficData: {
    currentSpeed: Number, // average current speed in km/h
    freeFlowSpeed: Number, // normal speed without traffic
    congestionLevel: {
      type: String,
      enum: ['free', 'light', 'moderate', 'heavy', 'severe'],
      default: 'free'
    },
    congestionPercentage: Number, // 0-100
    delayMinutes: Number,
    incidents: [trafficIncidentSchema],
    lastUpdated: Date
  },
  // Weather data
  weatherData: {
    current: weatherConditionSchema,
    forecast: [{
      time: Date,
      condition: weatherConditionSchema
    }],
    alerts: [{
      type: String,
      severity: String,
      message: String,
      startTime: Date,
      endTime: Date
    }],
    lastUpdated: Date
  },
  // Route recalculation suggestion
  recalculationSuggested: {
    type: Boolean,
    default: false
  },
  recalculationReason: String,
  // Updated ETA
  updatedETA: {
    originalETA: Date,
    currentETA: Date,
    delayMinutes: Number
  },
  // Alternative routes suggested
  alternativeRoutes: [{
    description: String,
    timeSaved: Number, // minutes
    distanceDifference: Number, // km
    route: {
      type: {
        type: String,
        enum: ['LineString']
      },
      coordinates: [[Number]]
    }
  }],
  // Notification sent
  notificationSent: {
    type: Boolean,
    default: false
  },
  notificationSentAt: Date,
  // Source of update
  source: {
    type: String,
    enum: ['tomtom', 'openmeteo', 'manual', 'system'],
    default: 'system'
  },
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
realTimeUpdateSchema.index({ routePlanId: 1, timestamp: -1 });
realTimeUpdateSchema.index({ timestamp: 1 }, { expireAfterSeconds: 86400 }); // Auto-delete after 24 hours

// Static method to get latest update for a route
realTimeUpdateSchema.statics.getLatestForRoute = function(routePlanId) {
  return this.findOne({ routePlanId })
    .sort({ timestamp: -1 })
    .exec();
};

// Static method to get updates in time range
realTimeUpdateSchema.statics.getUpdatesInRange = function(routePlanId, startTime, endTime) {
  return this.find({
    routePlanId,
    timestamp: { $gte: startTime, $lte: endTime }
  })
    .sort({ timestamp: 1 })
    .exec();
};

module.exports = mongoose.model('RealTimeUpdate', realTimeUpdateSchema);
