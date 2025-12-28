/**
 * RoutePlan Model
 * Stores optimized route plans with deliveries and cost analysis
 */

const mongoose = require('mongoose');

const waypointSchema = new mongoose.Schema({
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  address: {
    type: String,
    required: true
  },
  arrivalTime: Date,
  departureTime: Date,
  waitTime: Number, // in minutes
  serviceTime: Number, // in minutes
  sequence: Number
}, { _id: false });

const costBreakdownSchema = new mongoose.Schema({
  fuel: { type: Number, default: 0 },
  tolls: { type: Number, default: 0 },
  labor: { type: Number, default: 0 },
  maintenance: { type: Number, default: 0 },
  other: { type: Number, default: 0 }
}, { _id: false });

const routePlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Route name is required'],
    trim: true,
    maxlength: [200, 'Route name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  deliveries: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery'
  }],
  route: [waypointSchema],
  // Route geometry for map display (polyline)
  routeGeometry: {
    type: {
      type: String,
      enum: ['LineString'],
    },
    coordinates: [[Number]] // Array of [longitude, latitude] pairs
  },
  // Cost analysis
  cost: {
    total: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    breakdown: costBreakdownSchema
  },
  // Route metrics
  metrics: {
    totalDistance: { type: Number, default: 0 }, // in kilometers
    totalDuration: { type: Number, default: 0 }, // in minutes
    totalStops: { type: Number, default: 0 },
    estimatedFuelConsumption: { type: Number, default: 0 }, // in liters
    co2Emissions: { type: Number, default: 0 } // in kg
  },
  // Vehicle assignment
  vehicle: {
    id: String,
    type: {
      type: String,
      enum: ['car', 'van', 'truck', 'motorcycle'],
      default: 'van'
    },
    licensePlate: String,
    capacity: Number,
    fuelType: {
      type: String,
      enum: ['petrol', 'diesel', 'electric', 'hybrid'],
      default: 'diesel'
    }
  },
  // Driver assignment
  driver: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String,
    phone: String
  },
  // Schedule
  scheduledDate: {
    type: Date,
    required: true
  },
  startTime: Date,
  endTime: Date,
  actualStartTime: Date,
  actualEndTime: Date,
  // Status tracking
  status: {
    type: String,
    enum: ['draft', 'planned', 'in_progress', 'completed', 'cancelled', 'delayed'],
    default: 'draft'
  },
  // Optimization settings used
  optimizationSettings: {
    priority: {
      type: String,
      enum: ['time', 'distance', 'cost', 'balanced'],
      default: 'balanced'
    },
    avoidTolls: { type: Boolean, default: false },
    avoidHighways: { type: Boolean, default: false },
    avoidFerries: { type: Boolean, default: true },
    trafficModel: {
      type: String,
      enum: ['best_guess', 'pessimistic', 'optimistic'],
      default: 'best_guess'
    }
  },
  // AI optimization data
  aiOptimization: {
    model: String,
    confidence: Number,
    alternatives: [{
      route: [waypointSchema],
      cost: Number,
      duration: Number,
      distance: Number
    }],
    reasoning: String
  },
  // Tags for organization
  tags: [String],
  // Notes
  notes: String,
  // Sharing
  sharedWith: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    permission: { type: String, enum: ['view', 'edit'], default: 'view' }
  }],
  companyId: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
routePlanSchema.index({ userId: 1, status: 1 });
routePlanSchema.index({ companyId: 1 });
routePlanSchema.index({ scheduledDate: 1 });
routePlanSchema.index({ 'driver.id': 1 });
routePlanSchema.index({ status: 1, scheduledDate: 1 });


// Virtual for progress percentage
routePlanSchema.virtual('progress').get(function() {
  if (this.status === 'completed') return 100;
  if (this.status === 'draft' || this.status === 'planned') return 0;
  
  const completedStops = this.route.filter(wp => wp.departureTime).length;
  return Math.round((completedStops / this.route.length) * 100);
});

// Virtual for delay status
routePlanSchema.virtual('isDelayed').get(function() {
  if (!this.endTime || !this.actualEndTime) return false;
  return this.actualEndTime > this.endTime;
});

// Pre-save middleware to update metrics
routePlanSchema.pre('save', function(next) {
  if (this.route && this.route.length > 0) {
    this.metrics.totalStops = this.route.length;
  }
  next();
});

module.exports = mongoose.model('RoutePlan', routePlanSchema);
