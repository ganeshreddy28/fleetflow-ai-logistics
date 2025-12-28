/**
 * Models Index
 * Export all models from a single entry point
 */

const User = require('./User.model');
const RoutePlan = require('./RoutePlan.model');
const Delivery = require('./Delivery.model');
const RealTimeUpdate = require('./RealTimeUpdate.model');

module.exports = {
  User,
  RoutePlan,
  Delivery,
  RealTimeUpdate
};
