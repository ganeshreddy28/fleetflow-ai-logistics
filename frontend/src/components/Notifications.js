/**
 * Notifications Component - Real-time alerts for route delays and updates
 */

import React, { useState, useEffect } from 'react';
import { routesAPI } from '../services/api';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await routesAPI.getAll({ status: 'in_progress' });
      const activeRoutes = response.data.data.routes || [];
      
      const newNotifications = [];
      
      for (const route of activeRoutes) {
        // Check for delays
        if (route.realTimeUpdates?.recalculationSuggested) {
          newNotifications.push({
            id: `delay-${route._id}`,
            type: 'warning',
            title: 'Route Delay Detected',
            message: `${route.name}: ${route.realTimeUpdates.recalculationReason || 'Traffic or weather delay'}`,
            time: new Date(route.realTimeUpdates.updatedAt || Date.now()),
            routeId: route._id,
            read: false
          });
        }
        
        // Check for weather alerts
        if (route.realTimeUpdates?.weatherData?.current?.condition === 'heavy_rain' ||
            route.realTimeUpdates?.weatherData?.current?.condition === 'snow') {
          newNotifications.push({
            id: `weather-${route._id}`,
            type: 'alert',
            title: 'Weather Alert',
            message: `${route.name}: Severe weather conditions detected`,
            time: new Date(),
            routeId: route._id,
            read: false
          });
        }

        // Check for traffic congestion
        if (route.realTimeUpdates?.trafficData?.congestionLevel === 'severe') {
          newNotifications.push({
            id: `traffic-${route._id}`,
            type: 'warning',
            title: 'Heavy Traffic',
            message: `${route.name}: Severe traffic congestion on route`,
            time: new Date(),
            routeId: route._id,
            read: false
          });
        }
      }

      // Add system notifications
      if (activeRoutes.length > 0) {
        newNotifications.push({
          id: 'active-routes',
          type: 'info',
          title: 'Active Routes',
          message: `You have ${activeRoutes.length} route(s) in progress`,
          time: new Date(),
          read: true
        });
      }

      setNotifications(prev => {
        // Merge with existing, avoid duplicates
        const existingIds = prev.map(n => n.id);
        const unique = newNotifications.filter(n => !existingIds.includes(n.id));
        return [...unique, ...prev].slice(0, 20); // Keep max 20
      });

      setUnreadCount(newNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.log('Could not fetch notifications');
    }
  };

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'warning': return '⚠️';
      case 'alert': return '🚨';
      case 'success': return '✅';
      case 'info': return 'ℹ️';
      default: return '🔔';
    }
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div style={styles.container}>
      <button onClick={() => setIsOpen(!isOpen)} style={styles.bellBtn}>
        🔔
        {unreadCount > 0 && (
          <span style={styles.badge}>{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div style={styles.dropdown}>
          <div style={styles.header}>
            <h3 style={styles.title}>Notifications</h3>
            <div style={styles.headerActions}>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} style={styles.headerBtn}>
                  Mark all read
                </button>
              )}
              <button onClick={clearAll} style={styles.headerBtn}>
                Clear
              </button>
            </div>
          </div>

          <div style={styles.list}>
            {notifications.length === 0 ? (
              <div style={styles.empty}>
                <span style={styles.emptyIcon}>🔕</span>
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  style={{
                    ...styles.item,
                    ...(notification.read ? {} : styles.unread)
                  }}
                  onClick={() => markAsRead(notification.id)}
                >
                  <span style={styles.icon}>{getIcon(notification.type)}</span>
                  <div style={styles.content}>
                    <p style={styles.itemTitle}>{notification.title}</p>
                    <p style={styles.itemMessage}>{notification.message}</p>
                    <span style={styles.time}>{getTimeAgo(notification.time)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    position: 'relative'
  },
  bellBtn: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    position: 'relative',
    padding: '8px'
  },
  badge: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    backgroundColor: '#ef4444',
    color: 'white',
    fontSize: '10px',
    fontWeight: 'bold',
    padding: '2px 6px',
    borderRadius: '10px',
    minWidth: '16px',
    textAlign: 'center'
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    width: '360px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
    zIndex: 1000,
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid #e2e8f0'
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600'
  },
  headerActions: {
    display: 'flex',
    gap: '8px'
  },
  headerBtn: {
    background: 'none',
    border: 'none',
    color: '#1a56db',
    fontSize: '12px',
    cursor: 'pointer'
  },
  list: {
    maxHeight: '400px',
    overflowY: 'auto'
  },
  empty: {
    padding: '40px',
    textAlign: 'center',
    color: '#64748b'
  },
  emptyIcon: {
    fontSize: '32px',
    display: 'block',
    marginBottom: '8px'
  },
  item: {
    display: 'flex',
    gap: '12px',
    padding: '14px 16px',
    borderBottom: '1px solid #f1f5f9',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  unread: {
    backgroundColor: '#eff6ff'
  },
  icon: {
    fontSize: '20px',
    flexShrink: 0
  },
  content: {
    flex: 1,
    minWidth: 0
  },
  itemTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b'
  },
  itemMessage: {
    margin: '4px 0 0',
    fontSize: '13px',
    color: '#64748b',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  time: {
    fontSize: '11px',
    color: '#94a3b8'
  }
};

export default Notifications;