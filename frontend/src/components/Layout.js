/**
 * Layout Component - Main app layout with navigation
 */

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Base nav items for all users
  const baseNavItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/deliveries', label: 'Deliveries', icon: '📦' },
    { path: '/routes', label: 'Routes', icon: '🛣️' },
    { path: '/optimize', label: 'Optimize', icon: '🤖' },
  ];

  // Add Users page for Admin only
  const navItems = user?.role === 'admin' 
    ? [...baseNavItems, { path: '/users', label: 'Users', icon: '👥' }]
    : baseNavItems;

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside style={{ ...styles.sidebar, width: sidebarOpen ? '240px' : '60px' }}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🚚</span>
          {sidebarOpen && <span style={styles.logoText}>FleetFlow</span>}
        </div>
        
        <nav style={styles.nav}>
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                ...styles.navItem,
                ...(location.pathname === item.path ? styles.navItemActive : {})
              }}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          {sidebarOpen && (
            <div style={styles.userInfo}>
              <div style={styles.userAvatar}>{user?.name?.[0] || 'U'}</div>
              <div>
                <div style={styles.userName}>{user?.name}</div>
                <div style={styles.userRole}>{user?.role}</div>
              </div>
            </div>
          )}
          <button onClick={handleLogout} style={styles.logoutBtn}>
            {sidebarOpen ? 'Logout' : '🚪'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={styles.main}>
        <header style={styles.header}>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            style={styles.menuBtn}
          >
            ☰
          </button>
          <h1 style={styles.pageTitle}>
            {navItems.find(i => i.path === location.pathname)?.label || 'FleetFlow'}
          </h1>
          <div style={styles.headerRight}>
            <span style={styles.companyId}>{user?.companyId}</span>
          </div>
        </header>
        
        <div style={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#f3f4f6'
  },
  sidebar: {
    backgroundColor: '#1e293b',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.3s ease',
    overflow: 'hidden'
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    padding: '20px',
    gap: '12px',
    borderBottom: '1px solid #334155'
  },
  logoIcon: {
    fontSize: '28px'
  },
  logoText: {
    fontSize: '20px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap'
  },
  nav: {
    flex: 1,
    padding: '16px 8px'
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    color: '#94a3b8',
    textDecoration: 'none',
    borderRadius: '8px',
    marginBottom: '4px',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap'
  },
  navItemActive: {
    backgroundColor: '#1a56db',
    color: 'white'
  },
  navIcon: {
    fontSize: '20px',
    minWidth: '24px'
  },
  sidebarFooter: {
    padding: '16px',
    borderTop: '1px solid #334155'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px'
  },
  userAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#1a56db',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold'
  },
  userName: {
    fontWeight: '500',
    fontSize: '14px'
  },
  userRole: {
    fontSize: '12px',
    color: '#94a3b8',
    textTransform: 'capitalize'
  },
  logoutBtn: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  header: {
    backgroundColor: 'white',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  menuBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '4px'
  },
  pageTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1e293b',
    flex: 1
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  companyId: {
    fontSize: '14px',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    padding: '6px 12px',
    borderRadius: '4px'
  },
  content: {
    flex: 1,
    padding: '24px',
    overflow: 'auto'
  }
};

export default Layout;