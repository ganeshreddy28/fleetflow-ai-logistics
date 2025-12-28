/**
 * Deliveries Page
 */

import React, { useState, useEffect } from 'react';
import { deliveriesAPI } from '../services/api';
import toast from 'react-hot-toast';

const Deliveries = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState({ status: '', priority: '' });
  const [formData, setFormData] = useState({
    address: { street: '', city: '', state: '', postalCode: '', country: 'USA' },
    location: { coordinates: [-122.4194, 37.7749] },
    timeWindow: { earliest: '', latest: '' },
    customer: { name: '', phone: '', email: '' },
    priority: 'normal',
    packageDetails: { type: 'standard', weight: '', description: '' },
    serviceTime: 10
  });

  useEffect(() => {
    fetchDeliveries();
  }, [filter]);

  const fetchDeliveries = async () => {
    try {
      const params = {};
      if (filter.status) params.status = filter.status;
      if (filter.priority) params.priority = filter.priority;
      
      const response = await deliveriesAPI.getAll(params);
      setDeliveries(response.data.data.deliveries);
    } catch (error) {
      toast.error('Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await deliveriesAPI.create(formData);
      toast.success('Delivery created successfully');
      setShowModal(false);
      resetForm();
      fetchDeliveries();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create delivery');
    }
  };

  const resetForm = () => {
    setFormData({
      address: { street: '', city: '', state: '', postalCode: '', country: 'USA' },
      location: { coordinates: [-122.4194, 37.7749] },
      timeWindow: { earliest: '', latest: '' },
      customer: { name: '', phone: '', email: '' },
      priority: 'normal',
      packageDetails: { type: 'standard', weight: '', description: '' },
      serviceTime: 10
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this delivery?')) {
      try {
        await deliveriesAPI.delete(id);
        toast.success('Delivery deleted');
        fetchDeliveries();
      } catch (error) {
        toast.error('Failed to delete delivery');
      }
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      assigned: '#3b82f6',
      in_transit: '#8b5cf6',
      delivered: '#10b981',
      failed: '#ef4444',
      cancelled: '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: '#ef4444',
      high: '#f59e0b',
      normal: '#3b82f6',
      low: '#6b7280'
    };
    return colors[priority] || '#6b7280';
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.filters}>
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            style={styles.select}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={filter.priority}
            onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
            style={styles.select}
          >
            <option value="">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>
        <button onClick={() => setShowModal(true)} style={styles.addBtn}>
          + Add Delivery
        </button>
      </div>

      {/* Deliveries Table */}
      {loading ? (
        <div style={styles.loading}>Loading deliveries...</div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Tracking</th>
                <th style={styles.th}>Customer</th>
                <th style={styles.th}>Address</th>
                <th style={styles.th}>Time Window</th>
                <th style={styles.th}>Priority</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.length === 0 ? (
                <tr>
                  <td colSpan="7" style={styles.empty}>No deliveries found</td>
                </tr>
              ) : (
                deliveries.map((delivery) => (
                  <tr key={delivery._id} style={styles.tr}>
                    <td style={styles.td}>
                      <span style={styles.tracking}>{delivery.trackingNumber}</span>
                    </td>
                    <td style={styles.td}>
                      <div>{delivery.customer?.name}</div>
                      <div style={styles.subText}>{delivery.customer?.phone}</div>
                    </td>
                    <td style={styles.td}>
                      <div>{delivery.address?.street}</div>
                      <div style={styles.subText}>
                        {delivery.address?.city}, {delivery.address?.state}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.subText}>
                        {delivery.timeWindow?.earliest && 
                          new Date(delivery.timeWindow.earliest).toLocaleString()}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: getPriorityColor(delivery.priority) + '20',
                        color: getPriorityColor(delivery.priority)
                      }}>
                        {delivery.priority}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: getStatusColor(delivery.status) + '20',
                        color: getStatusColor(delivery.status)
                      }}>
                        {delivery.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => handleDelete(delivery._id)}
                        style={styles.deleteBtn}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2>Add New Delivery</h2>
              <button onClick={() => setShowModal(false)} style={styles.closeBtn}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formSection}>
                <h3 style={styles.formSectionTitle}>Customer Information</h3>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label>Name *</label>
                    <input
                      type="text"
                      value={formData.customer.name}
                      onChange={(e) => setFormData({
                        ...formData,
                        customer: { ...formData.customer, name: e.target.value }
                      })}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label>Phone</label>
                    <input
                      type="text"
                      value={formData.customer.phone}
                      onChange={(e) => setFormData({
                        ...formData,
                        customer: { ...formData.customer, phone: e.target.value }
                      })}
                      style={styles.input}
                    />
                  </div>
                </div>
              </div>

              <div style={styles.formSection}>
                <h3 style={styles.formSectionTitle}>Address</h3>
                <div style={styles.formGroup}>
                  <label>Street *</label>
                  <input
                    type="text"
                    value={formData.address.street}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, street: e.target.value }
                    })}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label>City *</label>
                    <input
                      type="text"
                      value={formData.address.city}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: { ...formData.address, city: e.target.value }
                      })}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label>State</label>
                    <input
                      type="text"
                      value={formData.address.state}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: { ...formData.address, state: e.target.value }
                      })}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label>Postal Code</label>
                    <input
                      type="text"
                      value={formData.address.postalCode}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: { ...formData.address, postalCode: e.target.value }
                      })}
                      style={styles.input}
                    />
                  </div>
                </div>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label>Longitude *</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.location.coordinates[0]}
                      onChange={(e) => setFormData({
                        ...formData,
                        location: { coordinates: [parseFloat(e.target.value), formData.location.coordinates[1]] }
                      })}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label>Latitude *</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.location.coordinates[1]}
                      onChange={(e) => setFormData({
                        ...formData,
                        location: { coordinates: [formData.location.coordinates[0], parseFloat(e.target.value)] }
                      })}
                      style={styles.input}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={styles.formSection}>
                <h3 style={styles.formSectionTitle}>Time Window</h3>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label>Earliest *</label>
                    <input
                      type="datetime-local"
                      value={formData.timeWindow.earliest}
                      onChange={(e) => setFormData({
                        ...formData,
                        timeWindow: { ...formData.timeWindow, earliest: e.target.value }
                      })}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label>Latest *</label>
                    <input
                      type="datetime-local"
                      value={formData.timeWindow.latest}
                      onChange={(e) => setFormData({
                        ...formData,
                        timeWindow: { ...formData.timeWindow, latest: e.target.value }
                      })}
                      style={styles.input}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={styles.formSection}>
                <h3 style={styles.formSectionTitle}>Delivery Details</h3>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label>Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      style={styles.input}
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label>Package Type</label>
                    <select
                      value={formData.packageDetails.type}
                      onChange={(e) => setFormData({
                        ...formData,
                        packageDetails: { ...formData.packageDetails, type: e.target.value }
                      })}
                      style={styles.input}
                    >
                      <option value="standard">Standard</option>
                      <option value="fragile">Fragile</option>
                      <option value="perishable">Perishable</option>
                      <option value="hazardous">Hazardous</option>
                      <option value="oversized">Oversized</option>
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label>Service Time (min)</label>
                    <input
                      type="number"
                      value={formData.serviceTime}
                      onChange={(e) => setFormData({ ...formData, serviceTime: parseInt(e.target.value) })}
                      style={styles.input}
                    />
                  </div>
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setShowModal(false)} style={styles.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" style={styles.submitBtn}>
                  Create Delivery
                </button>
              </div>
            </form>
          </div>
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
    cursor: 'pointer'
  },
  loading: { textAlign: 'center', padding: '40px', color: '#64748b' },
  tableWrapper: {
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    padding: '14px 16px',
    backgroundColor: '#f8fafc',
    fontWeight: '600',
    fontSize: '13px',
    color: '#64748b',
    borderBottom: '1px solid #e2e8f0'
  },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '14px 16px', fontSize: '14px' },
  empty: { textAlign: 'center', padding: '40px', color: '#64748b' },
  tracking: {
    fontFamily: 'monospace',
    fontSize: '12px',
    backgroundColor: '#f1f5f9',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  subText: { fontSize: '12px', color: '#64748b', marginTop: '2px' },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    textTransform: 'capitalize'
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    opacity: 0.6
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e2e8f0'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#64748b'
  },
  form: { padding: '20px' },
  formSection: { marginBottom: '24px' },
  formSectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px'
  },
  formRow: { display: 'flex', gap: '12px' },
  formGroup: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '12px'
  },
  input: {
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '14px'
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    paddingTop: '20px',
    borderTop: '1px solid #e2e8f0'
  },
  cancelBtn: {
    padding: '10px 20px',
    backgroundColor: '#f1f5f9',
    color: '#374151',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  submitBtn: {
    padding: '10px 20px',
    backgroundColor: '#1a56db',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  }
};

export default Deliveries;
