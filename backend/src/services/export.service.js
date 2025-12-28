/**
 * Export Service
 * Generates exportable files in PDF, CSV, and iCal formats
 */

const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const ical = require('ical-generator').default;
const { logger } = require('../utils/logger');

class ExportService {
  /**
   * Export route plan to PDF
   */
  async exportToPDF(routePlan) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(24).font('Helvetica-Bold').text('FleetFlow', { align: 'center' });
        doc.fontSize(12).font('Helvetica').text('AI Logistics Route Optimizer', { align: 'center' });
        doc.moveDown(2);

        // Route Information
        doc.fontSize(18).font('Helvetica-Bold').text('Route Plan', { underline: true });
        doc.moveDown();

        doc.fontSize(12).font('Helvetica-Bold').text('Route Name: ', { continued: true });
        doc.font('Helvetica').text(routePlan.name || 'Unnamed Route');

        doc.font('Helvetica-Bold').text('Scheduled Date: ', { continued: true });
        doc.font('Helvetica').text(new Date(routePlan.scheduledDate).toLocaleDateString());

        doc.font('Helvetica-Bold').text('Status: ', { continued: true });
        doc.font('Helvetica').text(routePlan.status || 'Draft');

        if (routePlan.driver?.name) {
          doc.font('Helvetica-Bold').text('Driver: ', { continued: true });
          doc.font('Helvetica').text(routePlan.driver.name);
        }

        if (routePlan.vehicle?.type) {
          doc.font('Helvetica-Bold').text('Vehicle: ', { continued: true });
          doc.font('Helvetica').text(`${routePlan.vehicle.type} ${routePlan.vehicle.licensePlate || ''}`);
        }

        doc.moveDown(2);

        // Metrics Summary
        doc.fontSize(16).font('Helvetica-Bold').text('Route Summary', { underline: true });
        doc.moveDown();

        const metrics = routePlan.metrics || {};
        doc.fontSize(11).font('Helvetica');
        doc.text(`Total Distance: ${metrics.totalDistance || 0} km`);
        doc.text(`Estimated Duration: ${this.formatDuration(metrics.totalDuration || 0)}`);
        doc.text(`Total Stops: ${metrics.totalStops || 0}`);
        doc.text(`Estimated Fuel: ${metrics.estimatedFuelConsumption || 0} liters`);

        doc.moveDown(2);

        // Cost Analysis
        if (routePlan.cost) {
          doc.fontSize(16).font('Helvetica-Bold').text('Cost Analysis', { underline: true });
          doc.moveDown();
          doc.fontSize(11).font('Helvetica');
          doc.text(`Total Cost: ${routePlan.cost.currency || 'USD'} ${(routePlan.cost.total || 0).toFixed(2)}`);
          
          if (routePlan.cost.breakdown) {
            doc.text(`  - Fuel: ${(routePlan.cost.breakdown.fuel || 0).toFixed(2)}`);
            doc.text(`  - Tolls: ${(routePlan.cost.breakdown.tolls || 0).toFixed(2)}`);
            doc.text(`  - Labor: ${(routePlan.cost.breakdown.labor || 0).toFixed(2)}`);
          }
          doc.moveDown(2);
        }

        // Delivery Schedule
        doc.fontSize(16).font('Helvetica-Bold').text('Delivery Schedule', { underline: true });
        doc.moveDown();

        const deliveries = routePlan.deliveries || routePlan.route || [];
        
        if (deliveries.length === 0) {
          doc.fontSize(11).font('Helvetica').text('No deliveries scheduled');
        } else {
          deliveries.forEach((delivery, index) => {
            // Check if we need a new page
            if (doc.y > 680) {
              doc.addPage();
            }

            doc.fontSize(12).font('Helvetica-Bold').text(`Stop ${index + 1}`, { continued: true });
            if (delivery.priority && delivery.priority !== 'normal') {
              doc.fontSize(10).font('Helvetica').text(` [${delivery.priority.toUpperCase()}]`);
            } else {
              doc.text('');
            }

            doc.fontSize(10).font('Helvetica');
            
            const address = delivery.address?.fullAddress || delivery.address || 'No address';
            doc.text(`Address: ${address}`);
            
            if (delivery.customer?.name) {
              doc.text(`Customer: ${delivery.customer.name}`);
            }
            
            if (delivery.timeWindow) {
              const earliest = new Date(delivery.timeWindow.earliest).toLocaleTimeString();
              const latest = new Date(delivery.timeWindow.latest).toLocaleTimeString();
              doc.text(`Time Window: ${earliest} - ${latest}`);
            }

            if (delivery.estimatedArrival) {
              doc.text(`ETA: ${new Date(delivery.estimatedArrival).toLocaleTimeString()}`);
            }

            if (delivery.packageDetails?.description) {
              doc.text(`Package: ${delivery.packageDetails.description}`);
            }

            if (delivery.trackingNumber) {
              doc.text(`Tracking: ${delivery.trackingNumber}`);
            }

            doc.moveDown();
          });
        }

        // Footer
        doc.fontSize(8).font('Helvetica');
        doc.text(`Generated by FleetFlow on ${new Date().toLocaleString()}`, 50, 750, { align: 'center' });

        doc.end();
      } catch (error) {
        logger.error(`PDF export error: ${error.message}`);
        reject(error);
      }
    });
  }

  /**
   * Export route plan to CSV
   */
  async exportToCSV(routePlan) {
    try {
      const deliveries = routePlan.deliveries || routePlan.route || [];

      const data = deliveries.map((delivery, index) => ({
        'Stop #': index + 1,
        'Tracking Number': delivery.trackingNumber || '',
        'Customer Name': delivery.customer?.name || '',
        'Address': delivery.address?.fullAddress || delivery.address?.street || '',
        'City': delivery.address?.city || '',
        'Postal Code': delivery.address?.postalCode || '',
        'Time Window Start': delivery.timeWindow?.earliest ? new Date(delivery.timeWindow.earliest).toLocaleString() : '',
        'Time Window End': delivery.timeWindow?.latest ? new Date(delivery.timeWindow.latest).toLocaleString() : '',
        'ETA': delivery.estimatedArrival ? new Date(delivery.estimatedArrival).toLocaleString() : '',
        'Priority': delivery.priority || 'normal',
        'Status': delivery.status || 'pending',
        'Package Type': delivery.packageDetails?.type || 'standard',
        'Weight (kg)': delivery.packageDetails?.weight || '',
        'Service Time (min)': delivery.serviceTime || 10,
        'Special Instructions': delivery.packageDetails?.specialInstructions || '',
        'Customer Phone': delivery.customer?.phone || '',
        'Customer Email': delivery.customer?.email || ''
      }));

      // Add summary row
      data.push({
        'Stop #': 'SUMMARY',
        'Tracking Number': '',
        'Customer Name': `Total Stops: ${deliveries.length}`,
        'Address': `Total Distance: ${routePlan.metrics?.totalDistance || 0} km`,
        'City': `Duration: ${this.formatDuration(routePlan.metrics?.totalDuration || 0)}`,
        'Postal Code': `Cost: ${routePlan.cost?.total || 0}`,
        'Time Window Start': '',
        'Time Window End': '',
        'ETA': '',
        'Priority': '',
        'Status': routePlan.status || '',
        'Package Type': '',
        'Weight (kg)': '',
        'Service Time (min)': '',
        'Special Instructions': '',
        'Customer Phone': '',
        'Customer Email': ''
      });

      const parser = new Parser({
        fields: Object.keys(data[0])
      });

      return parser.parse(data);
    } catch (error) {
      logger.error(`CSV export error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Export route plan to iCal format
   */
  async exportToICal(routePlan) {
    try {
      const calendar = ical({
        name: `FleetFlow - ${routePlan.name || 'Route Plan'}`,
        prodId: { company: 'FleetFlow', product: 'AI Route Optimizer' },
        timezone: 'UTC'
      });

      const deliveries = routePlan.deliveries || routePlan.route || [];
      const baseDate = new Date(routePlan.scheduledDate);

      // Add main route event
      const routeStart = routePlan.startTime ? new Date(routePlan.startTime) : baseDate;
      const routeEnd = routePlan.endTime ? new Date(routePlan.endTime) : new Date(baseDate.getTime() + (routePlan.metrics?.totalDuration || 480) * 60000);

      calendar.createEvent({
        start: routeStart,
        end: routeEnd,
        summary: `🚚 ${routePlan.name || 'Route Plan'}`,
        description: `FleetFlow Route Plan\nStops: ${deliveries.length}\nDistance: ${routePlan.metrics?.totalDistance || 0} km\nDriver: ${routePlan.driver?.name || 'Unassigned'}`,
        location: deliveries[0]?.address?.fullAddress || '',
        url: '',
        categories: [{ name: 'FleetFlow Route' }],
        status: routePlan.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'
      });

      // Add individual delivery events
      deliveries.forEach((delivery, index) => {
        const startTime = delivery.estimatedArrival ? 
          new Date(delivery.estimatedArrival) : 
          new Date(routeStart.getTime() + (index * 30 * 60000));
        
        const endTime = new Date(startTime.getTime() + (delivery.serviceTime || 10) * 60000);

        calendar.createEvent({
          start: startTime,
          end: endTime,
          summary: `📦 Stop ${index + 1}: ${delivery.customer?.name || 'Delivery'}`,
          description: [
            `Tracking: ${delivery.trackingNumber || 'N/A'}`,
            `Priority: ${delivery.priority || 'normal'}`,
            `Package: ${delivery.packageDetails?.type || 'standard'}`,
            delivery.packageDetails?.specialInstructions ? `Instructions: ${delivery.packageDetails.specialInstructions}` : '',
            delivery.customer?.phone ? `Phone: ${delivery.customer.phone}` : ''
          ].filter(Boolean).join('\n'),
          location: delivery.address?.fullAddress || '',
          categories: [{ name: 'Delivery' }],
          status: delivery.status === 'delivered' ? 'COMPLETED' : 
                  delivery.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED',
          alarms: [{
            type: 'display',
            trigger: 600 // 10 minutes before
          }]
        });
      });

      return calendar.toString();
    } catch (error) {
      logger.error(`iCal export error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Export deliveries list to CSV
   */
  async exportDeliveriesToCSV(deliveries) {
    try {
      const data = deliveries.map((delivery, index) => ({
        '#': index + 1,
        'Tracking Number': delivery.trackingNumber || '',
        'Customer': delivery.customer?.name || '',
        'Phone': delivery.customer?.phone || '',
        'Email': delivery.customer?.email || '',
        'Street': delivery.address?.street || '',
        'City': delivery.address?.city || '',
        'State': delivery.address?.state || '',
        'Postal Code': delivery.address?.postalCode || '',
        'Country': delivery.address?.country || '',
        'Latitude': delivery.location?.coordinates?.[1] || '',
        'Longitude': delivery.location?.coordinates?.[0] || '',
        'Time Window Start': delivery.timeWindow?.earliest || '',
        'Time Window End': delivery.timeWindow?.latest || '',
        'Priority': delivery.priority || 'normal',
        'Status': delivery.status || 'pending',
        'Package Type': delivery.packageDetails?.type || '',
        'Weight': delivery.packageDetails?.weight || '',
        'Volume': delivery.packageDetails?.volume || '',
        'Quantity': delivery.packageDetails?.quantity || 1,
        'Description': delivery.packageDetails?.description || '',
        'Special Instructions': delivery.packageDetails?.specialInstructions || '',
        'Service Time': delivery.serviceTime || 10,
        'Signature Required': delivery.requirements?.signatureRequired ? 'Yes' : 'No',
        'Photo Required': delivery.requirements?.photoRequired ? 'Yes' : 'No',
        'Created At': delivery.createdAt || ''
      }));

      const parser = new Parser({ fields: Object.keys(data[0] || {}) });
      return parser.parse(data);
    } catch (error) {
      logger.error(`Deliveries CSV export error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Format duration in minutes to human readable
   */
  formatDuration(minutes) {
    if (!minutes || minutes <= 0) return '0 min';
    
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} hr`;
    return `${hours} hr ${mins} min`;
  }
}

module.exports = new ExportService();
