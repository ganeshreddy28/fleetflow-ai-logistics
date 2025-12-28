/**
 * Delivery Model
 * Stores individual delivery information with constraints
 */

const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  // Location
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: String,
    postalCode: String,
    country: { type: String, default: 'USA' },
    fullAddress: String
  },
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
  // Time window constraints
  timeWindow: {
    earliest: { type: Date, required: true },
    latest: { type: Date, required: true },
    preferredTime: Date
  },
  // Package details
  packageDetails: {
    weight: { type: Number, default: 0 }, // in kg
    volume: { type: Number, default: 0 }, // in cubic meters
    quantity: { type: Number, default: 1 },
    type: {
      type: String,
      enum: ['standard', 'fragile', 'perishable', 'hazardous', 'oversized'],
      default: 'standard'
    },
    description: String,
    specialInstructions: String
  },
  // Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  priorityScore: {
    type: Number,
    default: 50 // 1-100 scale
  },
  // Customer information
  customer: {
    name: { type: String, required: true },
    phone: String,
    email: String,
    notes: String
  },
  // Delivery requirements
  requirements: {
    signatureRequired: { type: Boolean, default: false },
    photoRequired: { type: Boolean, default: false },
    ageVerification: { type: Boolean, default: false },
    contactlessDelivery: { type: Boolean, default: false }
  },
  // Service time estimate (time at stop)
  serviceTime: {
    type: Number,
    default: 10 // in minutes
  },
  // Status
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in_transit', 'arrived', 'delivered', 'failed', 'cancelled', 'rescheduled'],
    default: 'pending'
  },
  // Delivery proof
  proof: {
    deliveredAt: Date,
    signature: String, // base64 encoded
    photos: [String], // URLs to photos
    recipientName: String,
    notes: String,
    location: {
      type: {
        type: String,
        enum: ['Point']
      },
      coordinates: [Number]
    }
  },
  // Failure information
  failureInfo: {
    reason: String,
    attemptedAt: Date,
    notes: String
  },
  // Tracking
  trackingNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  // Assigned route
  routePlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RoutePlan'
  },
  // Sequence in route
  sequenceInRoute: Number,
  // ETA
  estimatedArrival: Date,
  actualArrival: Date,
  // Cost allocation
  deliveryCost: {
    type: Number,
    default: 0
  },
  // Company and user references
  companyId: {
    type: String,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // External reference IDs
  externalOrderId: String,
  externalCustomerId: String,
  // Tags
  tags: [String]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
deliverySchema.index({ location: '2dsphere' });
deliverySchema.index({ companyId: 1, status: 1 });
deliverySchema.index({ routePlanId: 1 });
deliverySchema.index({ trackingNumber: 1 });
deliverySchema.index({ 'timeWindow.earliest': 1 });
deliverySchema.index({ priority: 1 });
deliverySchema.index({ createdBy: 1 });

// Pre-save: Generate tracking number if not exists
deliverySchema.pre('save', async function(next) {
  if (!this.trackingNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.trackingNumber = `FF-${timestamp}-${random}`;
  }
  
  // Generate full address
  if (this.address && !this.address.fullAddress) {
    const parts = [
      this.address.street,
      this.address.city,
      this.address.state,
      this.address.postalCode,
      this.address.country
    ].filter(Boolean);
    this.address.fullAddress = parts.join(', ');
  }
  
  // Calculate priority score
  if (this.isModified('priority') || this.isModified('timeWindow')) {
    const priorityWeights = { low: 25, normal: 50, high: 75, urgent: 100 };
    let score = priorityWeights[this.priority] || 50;
    
    // Adjust based on time window urgency
    if (this.timeWindow && this.timeWindow.latest) {
      const hoursUntilDeadline = (new Date(this.timeWindow.latest) - new Date()) / (1000 * 60 * 60);
      if (hoursUntilDeadline < 2) score += 20;
      else if (hoursUntilDeadline < 4) score += 10;
    }
    
    this.priorityScore = Math.min(100, score);
  }
  
  next();
});

// Virtual for time window duration
deliverySchema.virtual('timeWindowDuration').get(function() {
  if (!this.timeWindow || !this.timeWindow.earliest || !this.timeWindow.latest) return null;
  return (new Date(this.timeWindow.latest) - new Date(this.timeWindow.earliest)) / (1000 * 60); // minutes
});

// Virtual for is overdue
deliverySchema.virtual('isOverdue').get(function() {
  if (this.status === 'delivered' || this.status === 'cancelled') return false;
  if (!this.timeWindow || !this.timeWindow.latest) return false;
  return new Date() > new Date(this.timeWindow.latest);
});

// Static method to find deliveries in area
deliverySchema.statics.findInArea = function(coordinates, radiusKm) {
  return this.find({
    location: {
      $geoWithin: {
        $centerSphere: [coordinates, radiusKm / 6378.1] // Convert km to radians
      }
    }
  });
};

module.exports = mongoose.model('Delivery', deliverySchema);
