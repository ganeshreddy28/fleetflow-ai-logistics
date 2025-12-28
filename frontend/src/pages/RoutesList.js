/**
 * Routes List Page
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { routesAPI } from '../services/api';
import toast from 'react-hot-toast';

const RoutesList = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '' });

  useEffect(() => {
    fetchRoutes();
  }, [filter]);

  const fetchRoutes = async () => {
    try {
      const params = {};
      if (filter.status) params.status = filter.status;
      
      const response = await routesAPI.getAll(params);
      setRoutes(response.data.data.routes);
    } catch (error) {
      toast.error('Failed to load routes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this route?')) {
      try {
        await routesAPI.delete(id);
        toast.success('Route deleted');
        fetchRoutes();
      } catch (error) {
        toast.error('Failed to delete route');
      }
    }
  };

  const handleStartRoute = async (id) => {
    try {
      await routesAPI.start(id);
      toast.success('Route started');
      fetchRoutes();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start route');
    }
  };

  const handleCompleteRoute = async (id) => {
    try {
      await routesAPI.complete(id);
      toast.success('Route completed');
      fetchRoutes();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to complete route');
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

  const formatDuration = (minutes) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins} min`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.filters}>
          <select
            value={filter.status}
            onChange={(e) => setFilter({ status: e.target.value })}
            style={styles.select}
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="delayed">Delayed</option>
          </select>
        </div>
        <Link to="/optimize" style={styles.addBtn}>
          + Create Route
        </Link>
      </div>

      {/* Routes Grid */}
      {loading ? (
        <div style={styles.loading}>Loading routes...</div>
      ) : routes.length === 0 ? (
        <div style={styles.empty}>
          <p>No routes found</p>
          <Link to="/optimize" style={styles.createLink}>Create your first route</Link>
        </div>
      ) : (
        <div style={styles.grid}>
          {routes.map((route) => (
            <div key={route._id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.routeName}>{route.name}</h3>
                  <p style={styles.routeDate}>
                    {new Date(route.scheduledDate).toLocaleDateString()}
                  </p>
                </div>
                <span style={{
                  ...styles.badge,
                  backgroundColor: getStatusColor(route.status) + '20',
                  color: getStatusColor(route.status)
                }}>
                  {route.status?.replace('_', ' ')}
                </span>
              </div>

              <div style={styles.cardBody}>
                <div style={styles.metric}>
                  <span style={styles.metricLabel}>Stops</span>
                  <span style={styles.metricValue}>{route.metrics?.totalStops || route.deliveries?.length || 0}</span>
                </div>
                <div style={styles.metric}>
                  <span style={styles.metricLabel}>Distance</span>
                  <span style={styles.metricValue}>{Math.round(route.metrics?.totalDistance || 0)} km</span>
                </div>
                <div style={styles.metric}>
                  <span style={styles.metricLabel}>Duration</span>
                  <span style={styles.metricValue}>{formatDuration(route.metrics?.totalDuration)}</span>
                </div>
                <div style={styles.metric}>
                  <span style={styles.metricLabel}>Cost</span>
                  <span style={styles.metricValue}>${(route.cost?.total || 0).toFixed(2)}</span>
                </div>
              </div>

              {route.driver?.name && (
                <div style={styles.driver}>
                  <span style={styles.driverIcon}>👤</span>
                  <span>{route.driver.name}</span>
                </div>
              )}

              <div style={styles.cardFooter}>
                <Link to={`/routes/${route._id}`} style={styles.viewBtn}>
                  View Details
                </Link>
                <div style={styles.actions}>
                  {(route.status === 'planned' || route.status === 'draft') && (
                    <button onClick={() => handleStartRoute(route._id)} style={styles.actionBtn}>
                      ▶️ Start
                    </button>
                  )}
                  {route.status === 'in_progress' && (
                    <button onClick={() => handleCompleteRoute(route._id)} style={styles.actionBtn}>
                      ✅ Complete
                    </button>
                  )}
                  {(route.status === 'draft' || route.status === 'planned') && (
                    <button onClick={() => handleDelete(route._id)} style={styles.deleteBtn}>
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { padding: '0' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  filters: { display: 'flex', gap: '12px' },
  select: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    backgroundColor: 'white'
  },
  addBtn: {
    padding: '10px 20px',
    backgroundColor: '#1a56db',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    textDecoration: 'none',
    display: 'inline-block'
  },
  loading: { textAlign: 'center', padding: '40px', color: '#64748b' },
  empty: {
    textAlign: 'center',
    padding: '60px',
    backgroundColor: 'white',
    borderRadius: '12px'
  },
  createLink: { color: '#1a56db', marginTop: '12px', display: 'inline-block' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px'
  },
  routeName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0
  },
  routeDate: {
    fontSize: '13px',
    color: '#64748b',
    margin: '4px 0 0'
  },
  badge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    textTransform: 'capitalize'
  },
  cardBody: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginBottom: '16px'
  },
  metric: {
    backgroundColor: '#f8fafc',
    padding: '10px',
    borderRadius: '8px'
  },
  metricLabel: {
    fontSize: '11px',
    color: '#64748b',
    display: 'block',
    marginBottom: '2px'
  },
  metricValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b'
  },
  driver: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px',
    backgroundColor: '#f1f5f9',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '16px'
  },
  driverIcon: { fontSize: '16px' },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '16px',
    borderTop: '1px solid #f1f5f9'
  },
  viewBtn: {
    color: '#1a56db',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500'
  },
  actions: {
    display: 'flex',
    gap: '8px'
  },
  actionBtn: {
    padding: '6px 12px',
    backgroundColor: '#f1f5f9',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    opacity: 0.6
  }
};

export default RoutesList;
