/**
 * Route Optimizer Page - AI-powered route optimization
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { deliveriesAPI, routesAPI } from '../services/api';
import toast from 'react-hot-toast';

const RouteOptimizer = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [deliveries, setDeliveries] = useState([]);
  const [selectedDeliveries, setSelectedDeliveries] = useState([]);
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [settings, setSettings] = useState({
    routeName: '',
    scheduledDate: '',
    startLocation: { coordinates: [-122.4194, 37.7749], address: 'Warehouse' },
    vehicleType: 'van',
    optimizationPriority: 'balanced'
  });

  useEffect(() => {
    fetchUnassignedDeliveries();
  }, []);

  const fetchUnassignedDeliveries = async () => {
    try {
      const response = await deliveriesAPI.getUnassigned();
      setDeliveries(response.data.data.deliveries);
    } catch (error) {
      // If no unassigned endpoint, get all pending
      try {
        const response = await deliveriesAPI.getAll({ status: 'pending' });
        setDeliveries(response.data.data.deliveries);
      } catch (err) {
        toast.error('Failed to load deliveries');
      }
    }
  };

  const toggleDelivery = (id) => {
    setSelectedDeliveries(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedDeliveries.length === deliveries.length) {
      setSelectedDeliveries([]);
    } else {
      setSelectedDeliveries(deliveries.map(d => d._id));
    }
  };

  const handleOptimize = async () => {
    if (selectedDeliveries.length < 2) {
      toast.error('Select at least 2 deliveries');
      return;
    }

    setLoading(true);
    try {
      const response = await routesAPI.optimize({
        deliveryIds: selectedDeliveries,
        startLocation: settings.startLocation,
        vehicleType: settings.vehicleType,
        optimizationPriority: settings.optimizationPriority
      });

      setOptimizedRoute(response.data.data);
      setStep(3);
      toast.success('Route optimized successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Optimization failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoute = async () => {
  if (!settings.routeName || !settings.scheduledDate) {
    toast.error('Please fill in route name and date');
    return;
  }

  setLoading(true);
  try {
    // Get the actual delivery IDs from optimized sequence
    const orderedDeliveryIds = optimizedRoute.optimizedRoute.sequence.map(
      idx => deliveries.find((d, i) => selectedDeliveries.indexOf(d._id) === idx)?._id || selectedDeliveries[idx]
    );

    const routeData = {
      name: settings.routeName,
      scheduledDate: new Date(settings.scheduledDate).toISOString(),
      deliveryIds: selectedDeliveries,
      vehicle: { type: settings.vehicleType },
      optimizationSettings: { priority: settings.optimizationPriority }
    };

    const response = await routesAPI.create(routeData);
    toast.success('Route created successfully!');
    navigate(`/routes/${response.data.data.route._id}`);
  } catch (error) {
    console.error('Create route error:', error.response?.data);
    toast.error(error.response?.data?.message || 'Failed to create route');
  } finally {
    setLoading(false);
  }
};

  return (
    <div style={styles.container}>
      {/* Progress Steps */}
      <div style={styles.steps}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{
            ...styles.step,
            ...(step >= s ? styles.stepActive : {})
          }}>
            <div style={styles.stepNumber}>{s}</div>
            <span style={styles.stepLabel}>
              {s === 1 ? 'Select Deliveries' : s === 2 ? 'Configure' : 'Review & Save'}
            </span>
          </div>
        ))}
      </div>

      {/* Step 1: Select Deliveries */}
      {step === 1 && (
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2>Select Deliveries to Optimize</h2>
            <button onClick={selectAll} style={styles.selectAllBtn}>
              {selectedDeliveries.length === deliveries.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {deliveries.length === 0 ? (
            <div style={styles.empty}>
              <p>No pending deliveries available</p>
              <p style={styles.emptyHint}>Create deliveries first to optimize routes</p>
            </div>
          ) : (
            <div style={styles.deliveriesGrid}>
              {deliveries.map(delivery => (
                <div
                  key={delivery._id}
                  style={{
                    ...styles.deliveryCard,
                    ...(selectedDeliveries.includes(delivery._id) ? styles.deliverySelected : {})
                  }}
                  onClick={() => toggleDelivery(delivery._id)}
                >
                  <div style={styles.deliveryCheck}>
                    {selectedDeliveries.includes(delivery._id) ? '✓' : ''}
                  </div>
                  <div style={styles.deliveryInfo}>
                    <p style={styles.deliveryCustomer}>{delivery.customer?.name}</p>
                    <p style={styles.deliveryAddress}>
                      {delivery.address?.street}, {delivery.address?.city}
                    </p>
                    <div style={styles.deliveryMeta}>
                      <span style={{
                        ...styles.priorityBadge,
                        backgroundColor: delivery.priority === 'urgent' ? '#fef2f2' : 
                                        delivery.priority === 'high' ? '#fef3c7' : '#f1f5f9',
                        color: delivery.priority === 'urgent' ? '#dc2626' :
                               delivery.priority === 'high' ? '#d97706' : '#64748b'
                      }}>
                        {delivery.priority}
                      </span>
                      {delivery.timeWindow?.earliest && (
                        <span style={styles.timeWindow}>
                          {new Date(delivery.timeWindow.earliest).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={styles.panelFooter}>
            <span style={styles.selectedCount}>
              {selectedDeliveries.length} deliveries selected
            </span>
            <button
              onClick={() => setStep(2)}
              style={styles.nextBtn}
              disabled={selectedDeliveries.length < 2}
            >
              Next: Configure →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Configure Settings */}
      {step === 2 && (
        <div style={styles.panel}>
          <h2 style={styles.panelTitle}>Optimization Settings</h2>

          <div style={styles.settingsGrid}>
            <div style={styles.settingGroup}>
              <label>Start Location (Longitude)</label>
              <input
                type="number"
                step="any"
                value={settings.startLocation.coordinates[0]}
                onChange={(e) => setSettings({
                  ...settings,
                  startLocation: {
                    ...settings.startLocation,
                    coordinates: [parseFloat(e.target.value), settings.startLocation.coordinates[1]]
                  }
                })}
                style={styles.input}
              />
            </div>
            <div style={styles.settingGroup}>
              <label>Start Location (Latitude)</label>
              <input
                type="number"
                step="any"
                value={settings.startLocation.coordinates[1]}
                onChange={(e) => setSettings({
                  ...settings,
                  startLocation: {
                    ...settings.startLocation,
                    coordinates: [settings.startLocation.coordinates[0], parseFloat(e.target.value)]
                  }
                })}
                style={styles.input}
              />
            </div>
            <div style={styles.settingGroup}>
              <label>Vehicle Type</label>
              <select
                value={settings.vehicleType}
                onChange={(e) => setSettings({ ...settings, vehicleType: e.target.value })}
                style={styles.input}
              >
                <option value="car">Car</option>
                <option value="van">Van</option>
                <option value="truck">Truck</option>
                <option value="motorcycle">Motorcycle</option>
              </select>
            </div>
            <div style={styles.settingGroup}>
              <label>Optimization Priority</label>
              <select
                value={settings.optimizationPriority}
                onChange={(e) => setSettings({ ...settings, optimizationPriority: e.target.value })}
                style={styles.input}
              >
                <option value="time">Fastest Time</option>
                <option value="distance">Shortest Distance</option>
                <option value="cost">Lowest Cost</option>
                <option value="balanced">Balanced</option>
              </select>
            </div>
          </div>

          <div style={styles.aiInfo}>
            <span style={styles.aiIcon}>🤖</span>
            <div>
              <p style={styles.aiTitle}>AI-Powered Optimization</p>
              <p style={styles.aiText}>
                Our AI engine will analyze traffic patterns, delivery time windows, 
                priorities, and weather conditions to generate the optimal route.
              </p>
            </div>
          </div>

          <div style={styles.panelFooter}>
            <button onClick={() => setStep(1)} style={styles.backBtn}>
              ← Back
            </button>
            <button onClick={handleOptimize} style={styles.optimizeBtn} disabled={loading}>
              {loading ? 'Optimizing...' : '🚀 Optimize Route'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review Results */}
      {step === 3 && optimizedRoute && (
        <div style={styles.panel}>
          <h2 style={styles.panelTitle}>Optimization Results</h2>

          <div style={styles.resultsHeader}>
            <div style={styles.confidence}>
              <span style={styles.confidenceLabel}>AI Confidence</span>
              <span style={styles.confidenceValue}>
                {Math.round((optimizedRoute.confidence || 0.8) * 100)}%
              </span>
            </div>
            <div style={styles.aiModel}>
              Model: {optimizedRoute.aiModel || 'GPT-4.1-nano'}
            </div>
          </div>

          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <span style={styles.metricIcon}>📏</span>
              <span style={styles.metricValue}>
                {Math.round(optimizedRoute.optimizedRoute?.estimatedMetrics?.totalDistance || 0)} km
              </span>
              <span style={styles.metricLabel}>Total Distance</span>
            </div>
            <div style={styles.metricCard}>
              <span style={styles.metricIcon}>⏱️</span>
              <span style={styles.metricValue}>
                {Math.round(optimizedRoute.optimizedRoute?.estimatedMetrics?.totalDuration || 0)} min
              </span>
              <span style={styles.metricLabel}>Est. Duration</span>
            </div>
            <div style={styles.metricCard}>
              <span style={styles.metricIcon}>⛽</span>
              <span style={styles.metricValue}>
                {(optimizedRoute.optimizedRoute?.estimatedMetrics?.fuelEstimate || 0).toFixed(1)} L
              </span>
              <span style={styles.metricLabel}>Est. Fuel</span>
            </div>
          </div>

          {optimizedRoute.optimizedRoute?.reasoning && (
            <div style={styles.reasoning}>
              <strong>AI Reasoning:</strong> {optimizedRoute.optimizedRoute.reasoning}
            </div>
          )}

          <div style={styles.sequenceList}>
            <h3>Optimized Sequence</h3>
            {optimizedRoute.optimizedRoute?.deliveries?.map((delivery, index) => (
              <div key={index} style={styles.sequenceItem}>
                <span style={styles.sequenceNum}>{index + 1}</span>
                <div style={styles.sequenceInfo}>
                  <p style={styles.sequenceCustomer}>{delivery.customer?.name}</p>
                  <p style={styles.sequenceAddress}>
                    {delivery.address?.street || delivery.address?.fullAddress}
                  </p>
                </div>
                <span style={styles.sequencePriority}>{delivery.priority}</span>
              </div>
            ))}
          </div>

          <div style={styles.saveSection}>
            <h3>Save as Route</h3>
            <div style={styles.saveForm}>
              <div style={styles.settingGroup}>
                <label>Route Name *</label>
                <input
                  type="text"
                  value={settings.routeName}
                  onChange={(e) => setSettings({ ...settings, routeName: e.target.value })}
                  placeholder="e.g., Downtown Morning Route"
                  style={styles.input}
                />
              </div>
              <div style={styles.settingGroup}>
                <label>Scheduled Date *</label>
                <input
                  type="date"
                  value={settings.scheduledDate}
                  onChange={(e) => setSettings({ ...settings, scheduledDate: e.target.value })}
                  style={styles.input}
                />
              </div>
            </div>
          </div>

          <div style={styles.panelFooter}>
            <button onClick={() => setStep(2)} style={styles.backBtn}>
              ← Reconfigure
            </button>
            <button onClick={handleCreateRoute} style={styles.saveBtn} disabled={loading}>
              {loading ? 'Creating...' : '💾 Create Route'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { maxWidth: '900px', margin: '0 auto' },
  steps: {
    display: 'flex',
    justifyContent: 'center',
    gap: '40px',
    marginBottom: '30px'
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    opacity: 0.4
  },
  stepActive: { opacity: 1 },
  stepNumber: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#1a56db',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold'
  },
  stepLabel: { fontSize: '14px', fontWeight: '500' },
  panel: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  panelTitle: { marginBottom: '20px' },
  selectAllBtn: {
    padding: '8px 16px',
    backgroundColor: '#f1f5f9',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  empty: { textAlign: 'center', padding: '40px', color: '#64748b' },
  emptyHint: { fontSize: '14px', marginTop: '8px' },
  deliveriesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '12px',
    marginBottom: '20px',
    maxHeight: '400px',
    overflowY: 'auto'
  },
  deliveryCard: {
    display: 'flex',
    gap: '12px',
    padding: '14px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  deliverySelected: {
    borderColor: '#1a56db',
    backgroundColor: '#eff6ff'
  },
  deliveryCheck: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    backgroundColor: '#1a56db',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '14px'
  },
  deliveryInfo: { flex: 1 },
  deliveryCustomer: { fontWeight: '600', marginBottom: '4px' },
  deliveryAddress: { fontSize: '13px', color: '#64748b' },
  deliveryMeta: { display: 'flex', gap: '8px', marginTop: '8px' },
  priorityBadge: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '10px',
    textTransform: 'capitalize'
  },
  timeWindow: { fontSize: '12px', color: '#64748b' },
  panelFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '20px',
    borderTop: '1px solid #e2e8f0'
  },
  selectedCount: { color: '#64748b' },
  nextBtn: {
    padding: '12px 24px',
    backgroundColor: '#1a56db',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  backBtn: {
    padding: '12px 24px',
    backgroundColor: '#f1f5f9',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  settingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '24px'
  },
  settingGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  input: {
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '14px'
  },
  aiInfo: {
    display: 'flex',
    gap: '16px',
    padding: '16px',
    backgroundColor: '#f0f9ff',
    borderRadius: '10px',
    marginBottom: '20px'
  },
  aiIcon: { fontSize: '32px' },
  aiTitle: { fontWeight: '600', marginBottom: '4px' },
  aiText: { fontSize: '14px', color: '#64748b' },
  optimizeBtn: {
    padding: '12px 32px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px'
  },
  resultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  confidence: { display: 'flex', flexDirection: 'column' },
  confidenceLabel: { fontSize: '12px', color: '#64748b' },
  confidenceValue: { fontSize: '24px', fontWeight: 'bold', color: '#10b981' },
  aiModel: { fontSize: '14px', color: '#64748b' },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '24px'
  },
  metricCard: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '10px'
  },
  metricIcon: { fontSize: '24px', display: 'block', marginBottom: '8px' },
  metricValue: { fontSize: '20px', fontWeight: 'bold', display: 'block' },
  metricLabel: { fontSize: '12px', color: '#64748b' },
  reasoning: {
    padding: '16px',
    backgroundColor: '#fefce8',
    borderRadius: '8px',
    marginBottom: '24px',
    fontSize: '14px'
  },
  sequenceList: { marginBottom: '24px' },
  sequenceItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px',
    borderBottom: '1px solid #f1f5f9'
  },
  sequenceNum: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#1a56db',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '12px'
  },
  sequenceInfo: { flex: 1 },
  sequenceCustomer: { fontWeight: '500', marginBottom: '2px' },
  sequenceAddress: { fontSize: '13px', color: '#64748b' },
  sequencePriority: {
    fontSize: '12px',
    color: '#64748b',
    textTransform: 'capitalize'
  },
  saveSection: {
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    marginBottom: '20px'
  },
  saveForm: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginTop: '16px'
  },
  saveBtn: {
    padding: '12px 32px',
    backgroundColor: '#1a56db',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600'
  }
};

export default RouteOptimizer;
