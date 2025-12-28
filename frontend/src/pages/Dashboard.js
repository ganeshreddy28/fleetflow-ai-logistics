/**
 * Dashboard Page
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { analyticsAPI, deliveriesAPI } from '../services/api';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [dashboardRes, statsRes] = await Promise.all([
        analyticsAPI.getDashboard(),
        deliveriesAPI.getStats()
      ]);
      setDashboard(dashboardRes.data.data);
      setStats(statsRes.data.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading dashboard...</div>;
  }

  const summaryCards = [
    {
      title: 'Active Routes',
      value: dashboard?.summary?.routesInProgress || 0,
      icon: '🛣️',
      color: '#3b82f6'
    },
    {
      title: 'Active Drivers',
      value: dashboard?.summary?.activeDrivers || 0,
      icon: '👤',
      color: '#10b981'
    },
    {
      title: 'Delivery Rate',
      value: `${dashboard?.summary?.deliveryRate || 0}%`,
      icon: '📊',
      color: '#8b5cf6'
    },
    {
      title: 'Pending Deliveries',
      value: stats?.overall?.pending || 0,
      icon: '📦',
      color: '#f59e0b'
    }
  ];

  return (
    <div style={styles.container}>
      {/* Summary Cards */}
      <div style={styles.cardsGrid}>
        {summaryCards.map((card, index) => (
          <div key={index} style={styles.card}>
            <div style={{ ...styles.cardIcon, backgroundColor: card.color + '20' }}>
              <span style={{ color: card.color }}>{card.icon}</span>
            </div>
            <div style={styles.cardContent}>
              <p style={styles.cardTitle}>{card.title}</p>
              <p style={styles.cardValue}>{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Quick Actions</h2>
        <div style={styles.actionsGrid}>
          <Link to="/optimize" style={styles.actionCard}>
            <span style={styles.actionIcon}>🤖</span>
            <span style={styles.actionText}>Optimize New Route</span>
          </Link>
          <Link to="/deliveries" style={styles.actionCard}>
            <span style={styles.actionIcon}>📦</span>
            <span style={styles.actionText}>Add Deliveries</span>
          </Link>
          <Link to="/routes" style={styles.actionCard}>
            <span style={styles.actionIcon}>📋</span>
            <span style={styles.actionText}>View All Routes</span>
          </Link>
        </div>
      </div>

      {/* Today's Overview */}
      <div style={styles.gridTwo}>
        <div style={styles.panel}>
          <h3 style={styles.panelTitle}>Today's Routes</h3>
          <div style={styles.statsList}>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Planned</span>
              <span style={styles.statValue}>{dashboard?.today?.routes?.planned || 0}</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>In Progress</span>
              <span style={styles.statValue}>{dashboard?.today?.routes?.in_progress || 0}</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Completed</span>
              <span style={styles.statValue}>{dashboard?.today?.routes?.completed || 0}</span>
            </div>
          </div>
        </div>

        <div style={styles.panel}>
          <h3 style={styles.panelTitle}>Today's Deliveries</h3>
          <div style={styles.statsList}>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Pending</span>
              <span style={styles.statValue}>{dashboard?.today?.deliveries?.pending || 0}</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>In Transit</span>
              <span style={styles.statValue}>{dashboard?.today?.deliveries?.in_transit || 0}</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Delivered</span>
              <span style={styles.statValue}>{dashboard?.today?.deliveries?.delivered || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Performance */}
      <div style={styles.panel}>
        <h3 style={styles.panelTitle}>Weekly Performance</h3>
        <div style={styles.weeklyGrid}>
          {dashboard?.weeklyPerformance?.map((day, index) => (
            <div key={index} style={styles.dayCard}>
              <p style={styles.dayDate}>{new Date(day._id).toLocaleDateString('en-US', { weekday: 'short' })}</p>
              <p style={styles.dayRoutes}>{day.routes} routes</p>
              <p style={styles.dayCompleted}>{day.completed} completed</p>
              <p style={styles.dayDistance}>{Math.round(day.totalDistance || 0)} km</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#64748b'
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  cardIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px'
  },
  cardContent: {
    flex: 1
  },
  cardTitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 4px 0'
  },
  cardValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: 0
  },
  section: {
    marginTop: '8px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '16px'
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px'
  },
  actionCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    textDecoration: 'none',
    color: '#1e293b',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer'
  },
  actionIcon: {
    fontSize: '32px'
  },
  actionText: {
    fontSize: '14px',
    fontWeight: '500'
  },
  gridTwo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px'
  },
  panel: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  panelTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '16px'
  },
  statsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  statItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #f1f5f9'
  },
  statLabel: {
    color: '#64748b',
    fontSize: '14px'
  },
  statValue: {
    fontWeight: '600',
    color: '#1e293b'
  },
  weeklyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: '12px'
  },
  dayCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '12px',
    textAlign: 'center'
  },
  dayDate: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    marginBottom: '8px'
  },
  dayRoutes: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '4px 0'
  },
  dayCompleted: {
    fontSize: '12px',
    color: '#10b981',
    margin: '4px 0'
  },
  dayDistance: {
    fontSize: '12px',
    color: '#64748b',
    margin: '4px 0'
  }
};

export default Dashboard;
