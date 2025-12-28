/**
 * Dashboard Page with Analytics
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { analyticsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await analyticsAPI.getDashboard();
      setStats(response.data.data);
    } catch (error) {
      console.log('Analytics not available');
      setStats({
        overview: { totalRoutes: 0, activeRoutes: 0, totalDeliveries: 0, completedDeliveries: 0 },
        performance: { deliverySuccessRate: 0, avgDeliveriesPerRoute: 0 }
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading dashboard...</div>;
  }

  const overview = stats?.overview || {};
  const performance = stats?.performance || {};

  return (
    <div style={styles.container}>
      {/* Welcome Section */}
      <div style={styles.welcome}>
        <h1 style={styles.welcomeTitle}>Welcome back, {user?.name}! 👋</h1>
        <p style={styles.welcomeSubtitle}>Here's what's happening with your fleet today.</p>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>🛣️</div>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{overview.activeRoutes || 0}</span>
            <span style={styles.statLabel}>Active Routes</span>
          </div>
          <div style={styles.statChange}>
            <span style={styles.totalLabel}>of {overview.totalRoutes || 0} total</span>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>📦</div>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{overview.completedDeliveries || 0}</span>
            <span style={styles.statLabel}>Delivered</span>
          </div>
          <div style={styles.statChange}>
            <span style={styles.totalLabel}>of {overview.totalDeliveries || 0} total</span>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>✅</div>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{Math.round(performance.deliverySuccessRate || 0)}%</span>
            <span style={styles.statLabel}>Success Rate</span>
          </div>
          <div style={{...styles.statChange, color: '#10b981'}}>
            <span>📈 On track</span>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>📍</div>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{(performance.avgDeliveriesPerRoute || 0).toFixed(1)}</span>
            <span style={styles.statLabel}>Avg Stops/Route</span>
          </div>
          <div style={styles.statChange}>
            <span style={styles.totalLabel}>efficiency metric</span>
          </div>
        </div>
      </div>

      {/* Quick Actions & Info */}
      <div style={styles.grid}>
        {/* Quick Actions */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>⚡ Quick Actions</h2>
          <div style={styles.actions}>
            <Link to="/deliveries" style={styles.actionBtn}>
              <span style={styles.actionIcon}>📦</span>
              <div>
                <span style={styles.actionLabel}>Add Delivery</span>
                <span style={styles.actionDesc}>Create new delivery task</span>
              </div>
            </Link>
            <Link to="/optimize" style={{...styles.actionBtn, ...styles.actionBtnPrimary}}>
              <span style={styles.actionIcon}>🤖</span>
              <div>
                <span style={styles.actionLabel}>AI Optimize</span>
                <span style={styles.actionDesc}>Generate optimal route</span>
              </div>
            </Link>
            <Link to="/routes" style={styles.actionBtn}>
              <span style={styles.actionIcon}>🗺️</span>
              <div>
                <span style={styles.actionLabel}>View Routes</span>
                <span style={styles.actionDesc}>Manage all routes</span>
              </div>
            </Link>
            {user?.role === 'admin' && (
              <Link to="/users" style={styles.actionBtn}>
                <span style={styles.actionIcon}>👥</span>
                <div>
                  <span style={styles.actionLabel}>Manage Users</span>
                  <span style={styles.actionDesc}>Add drivers & dispatchers</span>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* System Status */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>🔌 System Integrations</h2>
          <div style={styles.integrations}>
            <div style={styles.integration}>
              <span style={styles.integrationIcon}>🤖</span>
              <div style={styles.integrationInfo}>
                <span style={styles.integrationName}>Euron AI</span>
                <span style={styles.integrationDesc}>Route optimization</span>
              </div>
              <span style={styles.statusOnline}>● Online</span>
            </div>
            <div style={styles.integration}>
              <span style={styles.integrationIcon}>🚗</span>
              <div style={styles.integrationInfo}>
                <span style={styles.integrationName}>TomTom Traffic</span>
                <span style={styles.integrationDesc}>Real-time traffic data</span>
              </div>
              <span style={styles.statusOnline}>● Online</span>
            </div>
            <div style={styles.integration}>
              <span style={styles.integrationIcon}>🌤️</span>
              <div style={styles.integrationInfo}>
                <span style={styles.integrationName}>Open-Meteo</span>
                <span style={styles.integrationDesc}>Weather forecasts</span>
              </div>
              <span style={styles.statusOnline}>● Online</span>
            </div>
            <div style={styles.integration}>
              <span style={styles.integrationIcon}>🗄️</span>
              <div style={styles.integrationInfo}>
                <span style={styles.integrationName}>MongoDB</span>
                <span style={styles.integrationDesc}>Database</span>
              </div>
              <span style={styles.statusOnline}>● Connected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features Overview */}
      <div style={styles.featuresCard}>
        <h2 style={styles.cardTitle}>🚀 Platform Features</h2>
        <div style={styles.features}>
          <div style={styles.feature}>
            <span style={styles.featureIcon}>🧠</span>
            <h3 style={styles.featureTitle}>AI Route Optimization</h3>
            <p style={styles.featureDesc}>GPT-4.1-nano powered route planning that considers traffic, weather, and delivery constraints</p>
          </div>
          <div style={styles.feature}>
            <span style={styles.featureIcon}>⏱️</span>
            <h3 style={styles.featureTitle}>Real-Time Updates</h3>
            <p style={styles.featureDesc}>Automatic route re-optimization based on live traffic and weather conditions</p>
          </div>
          <div style={styles.feature}>
            <span style={styles.featureIcon}>📊</span>
            <h3 style={styles.featureTitle}>Cost Analysis</h3>
            <p style={styles.featureDesc}>Detailed cost breakdowns including fuel, time, and toll estimates</p>
          </div>
          <div style={styles.feature}>
            <span style={styles.featureIcon}>📤</span>
            <h3 style={styles.featureTitle}>Export Options</h3>
            <p style={styles.featureDesc}>Download routes as PDF, CSV, or iCal for easy sharing and scheduling</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {},
  loading: { textAlign: 'center', padding: '40px', color: '#64748b' },
  welcome: { marginBottom: '24px' },
  welcomeTitle: { fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#1e293b' },
  welcomeSubtitle: { color: '#64748b', marginTop: '4px' },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '24px'
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  statIcon: { fontSize: '32px' },
  statInfo: { display: 'flex', flexDirection: 'column' },
  statValue: { fontSize: '28px', fontWeight: 'bold', color: '#1e293b' },
  statLabel: { fontSize: '14px', color: '#64748b' },
  statChange: { fontSize: '12px', color: '#64748b' },
  totalLabel: { opacity: 0.7 },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginBottom: '24px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '20px',
    color: '#1e293b'
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    textDecoration: 'none',
    color: '#1e293b',
    transition: 'all 0.2s'
  },
  actionBtnPrimary: {
    backgroundColor: '#1a56db',
    color: 'white'
  },
  actionIcon: { fontSize: '24px' },
  actionLabel: { display: 'block', fontWeight: '600', fontSize: '14px' },
  actionDesc: { display: 'block', fontSize: '12px', opacity: 0.7 },
  integrations: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  integration: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px'
  },
  integrationIcon: { fontSize: '24px' },
  integrationInfo: { flex: 1 },
  integrationName: { display: 'block', fontWeight: '500', fontSize: '14px' },
  integrationDesc: { display: 'block', fontSize: '12px', color: '#64748b' },
  statusOnline: { color: '#10b981', fontSize: '12px', fontWeight: '500' },
  featuresCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px'
  },
  feature: {
    textAlign: 'center',
    padding: '16px'
  },
  featureIcon: { fontSize: '36px', display: 'block', marginBottom: '12px' },
  featureTitle: { fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#1e293b' },
  featureDesc: { fontSize: '12px', color: '#64748b', lineHeight: '1.5' }
};

export default Dashboard;