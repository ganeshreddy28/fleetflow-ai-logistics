/**
 * Draggable Delivery List - Manually reorder route stops
 */

import React, { useState } from 'react';

const DraggableDeliveryList = ({ deliveries, onReorder, onSave, saving }) => {
  const [items, setItems] = useState(deliveries);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedIndex(null);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = [...items];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);

    setDraggedIndex(index);
    setItems(newItems);
    setHasChanges(true);
  };

  const handleSave = () => {
    onReorder(items);
    onSave(items);
    setHasChanges(false);
  };

  const handleReset = () => {
    setItems(deliveries);
    setHasChanges(false);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: '#ef4444',
      high: '#f59e0b',
      normal: '#1a56db',
      low: '#6b7280'
    };
    return colors[priority] || '#6b7280';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>📋 Reorder Stops (Drag & Drop)</h3>
        {hasChanges && (
          <div style={styles.actions}>
            <button onClick={handleReset} style={styles.resetBtn}>
              Reset
            </button>
            <button onClick={handleSave} style={styles.saveBtn} disabled={saving}>
              {saving ? 'Saving...' : '💾 Save Order'}
            </button>
          </div>
        )}
      </div>

      <p style={styles.hint}>
        💡 Drag and drop to manually adjust the delivery sequence
      </p>

      <div style={styles.list}>
        {items.map((delivery, index) => (
          <div
            key={delivery._id || index}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            style={{
              ...styles.item,
              ...(draggedIndex === index ? styles.dragging : {})
            }}
          >
            <div style={styles.dragHandle}>⋮⋮</div>
            <div style={{
              ...styles.number,
              backgroundColor: getPriorityColor(delivery.priority)
            }}>
              {index + 1}
            </div>
            <div style={styles.info}>
              <p style={styles.customer}>{delivery.customer?.name || 'Customer'}</p>
              <p style={styles.address}>
                {delivery.address?.street}, {delivery.address?.city}
              </p>
            </div>
            <div style={styles.meta}>
              <span style={{
                ...styles.priority,
                color: getPriorityColor(delivery.priority),
                backgroundColor: getPriorityColor(delivery.priority) + '15'
              }}>
                {delivery.priority}
              </span>
              {delivery.timeWindow?.earliest && (
                <span style={styles.time}>
                  {new Date(delivery.timeWindow.earliest).toLocaleTimeString([], 
                    {hour: '2-digit', minute:'2-digit'})}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {hasChanges && (
        <div style={styles.warning}>
          ⚠️ You have unsaved changes to the route order
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600'
  },
  actions: {
    display: 'flex',
    gap: '8px'
  },
  resetBtn: {
    padding: '8px 16px',
    backgroundColor: '#f1f5f9',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px'
  },
  saveBtn: {
    padding: '8px 16px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500'
  },
  hint: {
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '16px'
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    cursor: 'grab',
    transition: 'all 0.2s',
    border: '2px solid transparent'
  },
  dragging: {
    backgroundColor: '#eff6ff',
    borderColor: '#1a56db',
    transform: 'scale(1.02)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  },
  dragHandle: {
    color: '#94a3b8',
    fontSize: '16px',
    cursor: 'grab',
    userSelect: 'none'
  },
  number: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#1a56db',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '12px',
    flexShrink: 0
  },
  info: {
    flex: 1,
    minWidth: 0
  },
  customer: {
    margin: 0,
    fontWeight: '600',
    fontSize: '14px'
  },
  address: {
    margin: '2px 0 0',
    fontSize: '12px',
    color: '#64748b',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  meta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px'
  },
  priority: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '10px',
    textTransform: 'capitalize',
    fontWeight: '500'
  },
  time: {
    fontSize: '11px',
    color: '#64748b'
  },
  warning: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#92400e',
    textAlign: 'center'
  }
};

export default DraggableDeliveryList;