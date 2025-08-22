// backend/controllers/tripController.js
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { Trip } = require('../models');
const { generateItinerary } = require('../utils/aiItinerary'); // your existing util

const tripController = {
  async createTrip(req, res) {
    try {
      const userId = req.user && req.user.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });


      const {
        trip_name,
        destination,
        start_date,
        end_date,
        budget_type,
        people_count,
        companion_type,
        budget
      } = req.body;

      if (!trip_name || !destination || !start_date || !end_date) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const itinerary = await generateItinerary({
        destination,
        start_date,
        end_date,
        budget_type,
        companion_type,
        people_count
      });



      // Debug log for all fields
      console.log('Creating trip with:', {
        user_id: userId,
        trip_name,
        destination,
        start_date,
        end_date,
        budget_type,
        people_count,
        companion_type,
        budget,
        itinerary
      });

      // Ensure all fields are defined (set to null if missing)
      const tripRow = await Trip.create({
        user_id: userId,
        trip_name: trip_name || null,
        destination: destination || null,
        start_date: start_date || null,
        end_date: end_date || null,
        budget_type: budget_type || null,
        people_count: people_count || null,
        companion_type: companion_type || null,
        budget: budget || null,
        itinerary: itinerary || null
      });

      return res.status(201).json({ message: 'Trip created', trip: tripRow });
    } catch (err) {
      console.error('createTrip error:', err);
      return res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  async getTrips(req, res) {
    try {
      const userId = req.user && req.user.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });
      const trips = await Trip.findByUser(userId);
      return res.json({ trips });
    } catch (err) {
      console.error('getTrips error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
  },

  async getTripById(req, res) {
    try {
      const userId = req.user && req.user.id;
      const id = req.params.id;
      const trip = await Trip.findById(id);
      if (!trip) return res.status(404).json({ message: 'Trip not found' });
      if (String(trip.user_id) !== String(userId))
        return res.status(403).json({ message: 'Forbidden' });
      res.json({ trip });
    } catch (err) {
      console.error('getTrip error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async updateTrip(req, res) {
    try {
      const userId = req.user && req.user.id;
      const id = req.params.id;
      const trip = await Trip.findById(id);
      if (!trip) return res.status(404).json({ message: 'Trip not found' });
      if (String(trip.user_id) !== String(userId))
        return res.status(403).json({ message: 'Forbidden' });
      const fields = req.body;
      await Trip.update(id, userId, fields);
      const updatedTrip = await Trip.findById(id);
      res.json({ message: 'Trip updated successfully', trip: updatedTrip });
    } catch (err) {
      console.error('updateTrip error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async downloadItineraryPDF(req, res) {
    try {
      const userId = req.user && req.user.id;
      const id = req.params.id;
      const trip = await Trip.findById(id);
      if (!trip) return res.status(404).json({ message: 'Trip not found' });
      if (String(trip.user_id) !== String(userId))
        return res.status(403).json({ message: 'Forbidden' });

      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      const fileName = `${trip.trip_name.replace(/\s+/g, '_')}_itinerary.pdf`;
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      doc.pipe(res);

      doc.fontSize(20).text(`Trip Itinerary: ${trip.trip_name}`, { underline: true });
      doc.moveDown();

      doc.fontSize(12).text(`Destination: ${trip.destination}`);
      doc.text(`Dates: ${trip.start_date} to ${trip.end_date}`);
      doc.text(`Travelers: ${trip.people_count} ${trip.companion_type}`);
      doc.moveDown();

      // Try to load activities from itineraries.json if itinerary is null
      let renderedTable = false;
      if (!trip.itinerary) {
        try {
          const itinerariesPath = path.join(__dirname, '../../frontend/itineraries.json');
          if (fs.existsSync(itinerariesPath)) {
            const raw = fs.readFileSync(itinerariesPath, 'utf8');
            const itineraries = JSON.parse(raw);
            const match = itineraries.places.find(
              (item) => item.name.toLowerCase() === trip.destination.toLowerCase()
            );
            if (match && match.activities && match.activities.length > 0) {
              doc.fontSize(14).text('Itinerary:', { underline: true });
              doc.moveDown(0.5);
              // Table header background
              const tableTop = doc.y;
              const colWidths = [50, 120, 220, 80];
              const startX = 50;
              doc.rect(startX, tableTop, colWidths.reduce((a, b) => a + b), 22).fillAndStroke('#4a6fa5', '#4a6fa5');
              doc.fillColor('#fff').fontSize(11)
                .text('Day', startX + 2, tableTop + 6, { width: colWidths[0] - 4, align: 'left' })
                .text('Activity', startX + colWidths[0] + 2, tableTop + 6, { width: colWidths[1] - 4, align: 'left' })
                .text('Description', startX + colWidths[0] + colWidths[1] + 2, tableTop + 6, { width: colWidths[2] - 4, align: 'left' })
                .text('Duration', startX + colWidths[0] + colWidths[1] + colWidths[2] + 2, tableTop + 6, { width: colWidths[3] - 4, align: 'left' });
              doc.fillColor('#000');
              let y = tableTop + 22;
              match.activities.forEach((act, idx) => {
                // Row background
                if (idx % 2 === 0) {
                  doc.rect(startX, y, colWidths.reduce((a, b) => a + b), 20).fillAndStroke('#f6f8fa', '#e3e3e3');
                  doc.fillColor('#000');
                }
                doc.fontSize(10)
                  .text(`Day ${idx + 1}`, startX + 2, y + 5, { width: colWidths[0] - 4, align: 'left' })
                  .text(act.name, startX + colWidths[0] + 2, y + 5, { width: colWidths[1] - 4, align: 'left' })
                  .text(act.description, startX + colWidths[0] + colWidths[1] + 2, y + 5, { width: colWidths[2] - 4, align: 'left' })
                  .text(act.duration, startX + colWidths[0] + colWidths[1] + colWidths[2] + 2, y + 5, { width: colWidths[3] - 4, align: 'left' });
                y += 20;
                doc.fillColor('#000');
              });
              doc.y = y + 10;
              renderedTable = true;
            }
          }
        } catch (err) {
          // fallback to text below
        }
      }

      // If itinerary is a text fallback, try to render as table if possible
      if (!renderedTable && trip.itinerary && trip.itinerary.includes('Day 1:')) {
        doc.fontSize(14).text('Itinerary:', { underline: true });
        doc.moveDown(0.5);
        // Table header background
        const tableTop = doc.y;
        const colWidths = [50, 100, 100, 100, 100];
        const startX = 50;
        doc.rect(startX, tableTop, colWidths.reduce((a, b) => a + b), 22).fillAndStroke('#4a6fa5', '#4a6fa5');
        doc.fillColor('#fff').fontSize(11)
          .text('Day', startX + 2, tableTop + 6, { width: colWidths[0] - 4, align: 'left' })
          .text('Date', startX + colWidths[0] + 2, tableTop + 6, { width: colWidths[1] - 4, align: 'left' })
          .text('Morning', startX + colWidths[0] + colWidths[1] + 2, tableTop + 6, { width: colWidths[2] - 4, align: 'left' })
          .text('Afternoon', startX + colWidths[0] + colWidths[1] + colWidths[2] + 2, tableTop + 6, { width: colWidths[3] - 4, align: 'left' })
          .text('Evening', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2, tableTop + 6, { width: colWidths[4] - 4, align: 'left' });
        doc.fillColor('#000');
        let y = tableTop + 22;
        // Parse lines
        const lines = trip.itinerary.split('\n');
        let day, date, morning, afternoon, evening;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.startsWith('Day ')) {
            if (day) {
              // Row background
              if (((parseInt(day.replace('Day ', '')) - 1) % 2) === 0) {
                doc.rect(startX, y, colWidths.reduce((a, b) => a + b), 20).fillAndStroke('#f6f8fa', '#e3e3e3');
                doc.fillColor('#000');
              }
              doc.fontSize(10)
                .text(day, startX + 2, y + 5, { width: colWidths[0] - 4, align: 'left' })
                .text(date, startX + colWidths[0] + 2, y + 5, { width: colWidths[1] - 4, align: 'left' })
                .text(morning, startX + colWidths[0] + colWidths[1] + 2, y + 5, { width: colWidths[2] - 4, align: 'left' })
                .text(afternoon, startX + colWidths[0] + colWidths[1] + colWidths[2] + 2, y + 5, { width: colWidths[3] - 4, align: 'left' })
                .text(evening, startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2, y + 5, { width: colWidths[4] - 4, align: 'left' });
              y += 20;
              doc.fillColor('#000');
            }
            day = line.split(':')[0];
            date = line.split(':')[1]?.trim() || '';
            morning = afternoon = evening = '';
          } else if (line.startsWith('- Morning:')) {
            morning = line.replace('- Morning:', '').trim();
          } else if (line.startsWith('- Afternoon:')) {
            afternoon = line.replace('- Afternoon:', '').trim();
          } else if (line.startsWith('- Evening:')) {
            evening = line.replace('- Evening:', '').trim();
          }
        }
        // Add last day
        if (day) {
          if (((parseInt(day.replace('Day ', '')) - 1) % 2) === 0) {
            doc.rect(startX, y, colWidths.reduce((a, b) => a + b), 20).fillAndStroke('#f6f8fa', '#e3e3e3');
            doc.fillColor('#000');
          }
          doc.fontSize(10)
            .text(day, startX + 2, y + 5, { width: colWidths[0] - 4, align: 'left' })
            .text(date, startX + colWidths[0] + 2, y + 5, { width: colWidths[1] - 4, align: 'left' })
            .text(morning, startX + colWidths[0] + colWidths[1] + 2, y + 5, { width: colWidths[2] - 4, align: 'left' })
            .text(afternoon, startX + colWidths[0] + colWidths[1] + colWidths[2] + 2, y + 5, { width: colWidths[3] - 4, align: 'left' })
            .text(evening, startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2, y + 5, { width: colWidths[4] - 4, align: 'left' });
          y += 20;
          doc.fillColor('#000');
        }
        doc.y = y + 10;
        renderedTable = true;
      }

      // Fallback: just print text
      if (!renderedTable) {
        doc.fontSize(11).text(trip.itinerary || 'No itinerary available', {
          align: 'left',
          lineGap: 4
        });
      }

      doc.end();
    } catch (err) {
      console.error('downloadItinerary error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // ✅ Added deleteTrip function
  async deleteTrip(req, res) {
    try {
      const userId = req.user && req.user.id;
      const id = req.params.id;

      const trip = await Trip.findById(id);
      if (!trip) return res.status(404).json({ message: 'Trip not found' });
      if (String(trip.user_id) !== String(userId))
        return res.status(403).json({ message: 'Forbidden' });

      await Trip.delete(id);
      res.json({ message: 'Trip deleted successfully' });
    } catch (err) {
      console.error('deleteTrip error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = tripController;
