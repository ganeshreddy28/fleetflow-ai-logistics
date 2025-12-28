/**
 * Route Map Component - Interactive map showing delivery stops
 */

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom numbered marker
const createNumberedIcon = (number, color = '#1a56db') => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 12px;
      border: 3px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    ">${number}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

// Start location icon
const startIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    background-color: #10b981;
    color: white;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    border: 3px solid white;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
  ">🏢</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const RouteMap = ({ deliveries = [], startLocation = null, height = '400px' }) => {
  // Extract coordinates from deliveries
  const points = deliveries
    .filter(d => d.location?.coordinates?.length === 2)
    .map(d => ({
      lat: d.location.coordinates[1],
      lng: d.location.coordinates[0],
      delivery: d
    }));

  // Calculate map center
  const getCenter = () => {
    if (startLocation?.coordinates?.length === 2) {
      return [startLocation.coordinates[1], startLocation.coordinates[0]];
    }
    if (points.length > 0) {
      const avgLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
      const avgLng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;
      return [avgLat, avgLng];
    }
    return [37.7749, -122.4194]; // Default: San Francisco
  };

  // Create polyline coordinates
  const polylinePositions = [];
  if (startLocation?.coordinates?.length === 2) {
    polylinePositions.push([startLocation.coordinates[1], startLocation.coordinates[0]]);
  }
  points.forEach(p => {
    polylinePositions.push([p.lat, p.lng]);
  });

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: '#ef4444',
      high: '#f59e0b',
      normal: '#1a56db',
      low: '#6b7280'
    };
    return colors[priority] || '#1a56db';
  };

  return (
    <div style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
      <MapContainer
        center={getCenter()}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Start Location Marker */}
        {startLocation?.coordinates?.length === 2 && (
          <Marker
            position={[startLocation.coordinates[1], startLocation.coordinates[0]]}
            icon={startIcon}
          >
            <Popup>
              <strong>🏢 Start Location</strong><br />
              Warehouse / Depot
            </Popup>
          </Marker>
        )}

        {/* Delivery Markers */}
        {points.map((point, index) => (
          <Marker
            key={index}
            position={[point.lat, point.lng]}
            icon={createNumberedIcon(index + 1, getPriorityColor(point.delivery.priority))}
          >
            <Popup>
              <div style={{ minWidth: '150px' }}>
                <strong>Stop #{index + 1}</strong><br />
                <span style={{ fontSize: '14px' }}>{point.delivery.customer?.name}</span><br />
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {point.delivery.address?.street}<br />
                  {point.delivery.address?.city}, {point.delivery.address?.state}
                </span><br />
                <span style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: getPriorityColor(point.delivery.priority) + '20',
                  color: getPriorityColor(point.delivery.priority)
                }}>
                  {point.delivery.priority} priority
                </span>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Route Line */}
        {polylinePositions.length > 1 && (
          <Polyline
            positions={polylinePositions}
            color="#1a56db"
            weight={4}
            opacity={0.7}
            dashArray="10, 10"
          />
        )}
      </MapContainer>
    </div>
  );
};

export default RouteMap;