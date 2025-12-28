/**
 * Route Details Page with Interactive Map
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { routesAPI, exportAPI, usersAPI } from '../services/api';
import RouteMap from '../components/RouteMap';
import toast from 'react-hot-toast';

const RouteDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [route, setRoute] = useState(null);
  const [realTimeUpdate, setRealTimeUpdate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchRouteDetails();
    fetchDrivers();
  }, [id]);

  const fetchRouteDetails = async () => {
    try {
      const response = await routesAPI.getById(id);
      setRoute(response.data.data.route);
      setRealTimeUpdate(response.data.data.realTimeUpdate);
      setSelectedDriver(response.data.data.route?.driver?.id || '');
    } catch (error) {
      toast.error('Failed to load route details');
      navigate('/routes');
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await usersAPI.getDrivers();
      setDrivers(response.data.data.drivers || []);
    } catch (error) {
      console.log('Could not fetch drivers');
    }
  };

  const handleAssignDriver = async () => {
    if (!selectedDriver) {
      toast.error('Please select a driver');
      return;
    }
    setAssigning(true);
    try {
      const driver = drivers.find(d => d._id === selectedDriver);
      await routesAPI.update(id, {
        driver: {
          id: driver._id,
          name: driver.name,
          phone: driver.phone || ''
        }
      });
      toast.success('Driver assigned successfully');
      fetchRouteDetails();
    } catch (error) {
      toast.error('Failed to assign driver');
    } finally {
      setAssigning(false);
    }
  };

  const handleExport = async (format) => {
    try {
      let response;
      let filename;
      let contentType;
      
      switch (format) {
        case 'pdf':
          response = await exportAPI.routePDF(id);
          filename = `route-${id}.pdf`;
          contentType = 'application/pdf';
          break;
        case 'csv':
          response = await exportAPI.routeCSV(id);
          filename = `route-${id}.csv`;
          contentType = 'text/csv';
          break;
        case 'ical':
          response = await exportAPI.routeICal(id);
          filename = `route-${id}.ics`;
          contentType = 'text/calendar';
          break;
        default:
          return;
      }

      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: '#6b7280',
      planned: '#3b82f6',
      in_progress: '#8b5cf6',
      completed: '#10b981',
      cancelled: '#ef4444',
      delayed: '#f59e0b'
    };
    return colors[status] || '#6b7280';
  };

  if (loading) {
    return <div style={styles.loading}>Loading route details...</div>;
  }

  if (!route) {
    return <div style={styles.loading}>Route not found</div>;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{route.name}</h1>
          <p style={styles.subtitle}>
            Scheduled: {new Date(route.scheduledDate).toLocaleDateString()}
          </p>
        </div>
        <div style={styles.headerActions}>
          <span style={{
            ...styles.badge,
            backgroundColor: getStatusColor(route.status) + '20',
            color: getStatusColor(route.status)
          }}>
            {route.status?.replace('_', ' ')}
          </span>
          <div style={styles.exportBtns}>
            <button onClick={() => handleExport('pdf')} style={styles.exportBtn}>📄 PDF</button>
            <button onClick={() => handleExport('csv')} style={styles.exportBtn}>📊 CSV</button>
            <button onClick={() => handleExport('ical')} style={styles.exportBtn}>📅 iCal</button>
          </div>
        </div>
      </div>

      {/* Interactive Map */}
      <div style={styles.mapCard}>
        <h3 style={styles.cardTitle}>🗺️ Route Map</h3>
        <RouteMap 
          deliveries={route.deliveries || []} 
          startLocation={route.startLocation}
          height="350px"
        />
        <div style={styles.mapLegend}>
          <span><span style={{...styles.legendDot, backgroundColor: '#10b981'}}></span> Start Location</span>
          <span><span style={{...styles.legendDot, backgroundColor: '#ef4444'}}></span> Urgent</span>
          <span><span style={{...styles.legendDot, backgroundColor: '#f59e0b'}}></span> High</span>
          <span><span style={{...styles.legendDot, backgroundColor: '#1a56db'}}></span> Normal</span>
          <span><span style={{...styles.legendDot, backgroundColor: '#6b7280'}}></span> Low</span>
        </div>
      </div>

      <div style={styles.grid}>
        {/* Left Column */}
        <div style={styles.leftCol}>
          {/* Metrics */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📊 Route Metrics</h3>
            <div style={styles.metricsGrid}>
              <div style={styles.metric}>
                <span style={styles.metricValue}>{route.metrics?.totalStops || route.deliveries?.length || 0}</span>
                <span style={styles.metricLabel}>Stops</span>
              </div>
              <div style={styles.metric}>
                <span style={styles.metricValue}>{Math.round(route.metrics?.totalDistance || 0)} km</span>
                <span style={styles.metricLabel}>Distance</span>
              </div>
              <div style={styles.metric}>
                <span style={styles.metricValue}>{Math.round(route.metrics?.totalDuration || 0)} min</span>
                <span style={styles.metricLabel}>Duration</span>
              </div>
              <div style={styles.metric}>
                <span style={styles.metricValue}>${(route.cost?.total || 0).toFixed(2)}</span>
                <span style={styles.metricLabel}>Est. Cost</span>
              </div>
            </div>
          </div>

          {/* Real-time Update */}
          {realTimeUpdate && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>🔴 Real-time Conditions</h3>
              <div style={styles.conditions}>
                {realTimeUpdate.trafficData && (
                  <div style={styles.condition}>
                    <span style={styles.conditionIcon}>🚗</span>
                    <div>
                      <p style={styles.conditionLabel}>Traffic</p>
                      <p style={styles.conditionValue}>
                        {realTimeUpdate.trafficData.congestionLevel || 'Unknown'}
                      </p>
                    </div>
                  </div>
                )}
                {realTimeUpdate.weatherData?.current && (
                  <div style={styles.condition}>
                    <span style={styles.conditionIcon}>🌤️</span>
                    <div>
                      <p style={styles.conditionLabel}>Weather</p>
                      <p style={styles.conditionValue}>
                        {realTimeUpdate.weatherData.current.condition}, 
                        {realTimeUpdate.weatherData.current.temperature}°C
                      </p>
                    </div>
                  </div>
                )}
                {realTimeUpdate.updatedETA && (
                  <div style={styles.condition}>
                    <span style={styles.conditionIcon}>⏰</span>
                    <div>
                      <p style={styles.conditionLabel}>Delay</p>
                      <p style={styles.conditionValue}>
                        {realTimeUpdate.updatedETA.delayMinutes || 0} minutes
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {realTimeUpdate.recalculationSuggested && (
                <div style={styles.warning}>
                  ⚠️ Route re-optimization suggested: {realTimeUpdate.recalculationReason}
                </div>
              )}
            </div>
          )}

          {/* Driver Assignment */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>👤 Driver Assignment</h3>
            {route.driver?.name ? (
              <div style={styles.driverAssigned}>
                <div style={styles.driverAvatar}>
                  {route.driver.name[0]}
                </div>
                <div>
                  <p style={styles.driverName}>{route.driver.name}</p>
                  <p style={styles.driverPhone}>{route.driver.phone || 'No phone'}</p>
                </div>
                <span style={styles.assignedBadge}>Assigned</span>
              </div>
            ) : (
              <div style={styles.assignDriver}>
                <p style={styles.noDriver}>No driver assigned</p>
                <div style={styles.assignForm}>
                  <select
                    value={selectedDriver}
                    onChange={(e) => setSelectedDriver(e.target.value)}
                    style={styles.select}
                  >
                    <option value="">Select a driver...</option>
                    {drivers.map(driver => (
                      <option key={driver._id} value={driver._id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                  <button 
                    onClick={handleAssignDriver} 
                    style={styles.assignBtn}
                    disabled={assigning}
                  >
                    {assigning ? 'Assigning...' : 'Assign'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Vehicle Info */}
          {route.vehicle && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>🚚 Vehicle</h3>
              <div style={styles.vehicleInfo}>
                <p><strong>Type:</strong> {route.vehicle.type}</p>
                {route.vehicle.licensePlate && <p><strong>Plate:</strong> {route.vehicle.licensePlate}</p>}
                {route.vehicle.fuelType && <p><strong>Fuel:</strong> {route.vehicle.fuelType}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Deliveries */}
        <div style={styles.rightCol}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📦 Delivery Schedule ({route.deliveries?.length || 0} stops)</h3>
            <div style={styles.deliveryList}>
              {route.deliveries?.length > 0 ? (
                route.deliveries.map((delivery, index) => (
                  <div key={delivery._id || index} style={styles.deliveryItem}>
                    <div style={{
                      ...styles.deliveryNum,
                      backgroundColor: delivery.status === 'delivered' ? '#10b981' :
                                       delivery.status === 'failed' ? '#ef4444' : '#1a56db'
                    }}>
                      {delivery.status === 'delivered' ? '✓' :
                       delivery.status === 'failed' ? '✗' : index + 1}
                    </div>
                    <div style={styles.deliveryContent}>
                      <p style={styles.deliveryCustomer}>
                        {delivery.customer?.name || 'Customer'}
                      </p>
                      <p style={styles.deliveryAddress}>
                        {delivery.address?.street}, {delivery.address?.city}
                      </p>
                      <div style={styles.deliveryMeta}>
                        {delivery.timeWindow?.earliest && (
                          <span style={styles.deliveryTime}>
                            🕐 {new Date(delivery.timeWindow.earliest).toLocaleTimeString([], 
                              {hour: '2-digit', minute:'2-digit'})}
                            {' - '}
                            {new Date(delivery.timeWindow.latest).toLocaleTimeString([], 
                              {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        )}
                        <span style={{
                          ...styles.priorityTag,
                          backgroundColor: delivery.priority === 'urgent' ? '#fef2f2' :
                                          delivery.priority === 'high' ? '#fef3c7' : '#f1f5f9',
                          color: delivery.priority === 'urgent' ? '#dc2626' :
                                 delivery.priority === 'high' ? '#d97706' : '#64748b'
                        }}>
                          {delivery.priority}
                        </span>
                        <span style={{
                          ...styles.statusTag,
                          backgroundColor: delivery.status === 'delivered' ? '#dcfce7' :
                                          delivery.status === 'failed' ? '#fef2f2' : '#f1f5f9',
                          color: delivery.status === 'delivered' ? '#16a34a' :
                                 delivery.status === 'failed' ? '#dc2626' : '#64748b'
                        }}>
                          {delivery.status}
                        </span>
                      </div>
                      {delivery.trackingNumber && (
                        <p style={styles.tracking}>
                          📍 {delivery.trackingNumber}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p style={styles.noDeliveries}>No deliveries assigned</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { maxWidth: '1200px' },
  loading: { textAlign: 'center', padding: '40px', color: '#64748b' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px'
  },
  title: { fontSize: '24px', fontWeight: 'bold', margin: 0 },
  subtitle: { color: '#64748b', marginTop: '4px' },
  headerActions: { display: 'flex', alignItems: 'center', gap: '16px' },
  badge: {
    padding: '6px 14px',
    borderRadius: '16px',
    fontSize: '14px',
    fontWeight: '500',
    textTransform: 'capitalize'
  },
  exportBtns: { display: 'flex', gap: '8px' },
  exportBtn: {
    padding: '8px 12px',
    backgroundColor: '#f1f5f9',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px'
  },
  mapCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  mapLegend: {
    display: 'flex',
    gap: '20px',
    marginTop: '12px',
    fontSize: '12px',
    color: '#64748b'
  },
  legendDot: {
    display: 'inline-block',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    marginRight: '6px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px'
  },
  leftCol: { display: 'flex', flexDirection: 'column', gap: '20px' },
  rightCol: {},
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#1e293b'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px'
  },
  metric: {
    textAlign: 'center',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px'
  },
  metricValue: {
    display: 'block',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e293b'
  },
  metricLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#64748b',
    marginTop: '4px'
  },
  conditions: { display: 'flex', flexDirection: 'column', gap: '12px' },
  condition: { display: 'flex', gap: '12px', alignItems: 'center' },
  conditionIcon: { fontSize: '24px' },
  conditionLabel: { fontSize: '12px', color: '#64748b', margin: 0 },
  conditionValue: { fontWeight: '500', textTransform: 'capitalize', margin: 0 },
  warning: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#92400e'
  },
  driverAssigned: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  driverAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#1a56db',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 'bold'
  },
  driverName: { fontWeight: '600', margin: 0 },
  driverPhone: { fontSize: '14px', color: '#64748b', margin: 0 },
  assignedBadge: {
    marginLeft: 'auto',
    padding: '4px 10px',
    backgroundColor: '#dcfce7',
    color: '#16a34a',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500'
  },
  assignDriver: {},
  noDriver: { color: '#64748b', marginBottom: '12px' },
  assignForm: { display: 'flex', gap: '8px' },
  select: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '14px'
  },
  assignBtn: {
    padding: '10px 20px',
    backgroundColor: '#1a56db',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  vehicleInfo: { lineHeight: '1.8' },
  deliveryList: { display: 'flex', flexDirection: 'column' },
  deliveryItem: {
    display: 'flex',
    gap: '16px',
    padding: '16px 0',
    borderBottom: '1px solid #f1f5f9'
  },
  deliveryNum: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#1a56db',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '14px',
    flexShrink: 0
  },
  deliveryContent: { flex: 1 },
  deliveryCustomer: { fontWeight: '600', marginBottom: '4px' },
  deliveryAddress: { fontSize: '14px', color: '#64748b', marginBottom: '8px' },
  deliveryMeta: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' },
  deliveryTime: { fontSize: '12px', color: '#64748b' },
  priorityTag: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '10px',
    textTransform: 'capitalize'
  },
  statusTag: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '10px',
    textTransform: 'capitalize'
  },
  tracking: {
    fontSize: '12px',
    color: '#64748b',
    fontFamily: 'monospace',
    marginTop: '6px'
  },
  noDeliveries: {
    textAlign: 'center',
    padding: '24px',
    color: '#64748b'
  }
};

export default RouteDetails;