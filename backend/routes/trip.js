
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const tripController = require('../controllers/tripController');

// Create a trip (requires authentication)
router.post('/create', auth, tripController.createTrip);

// Get all trips for the logged-in user
router.get('/mytrips', auth, tripController.getTrips);

// Get a single trip by id (must belong to user)
router.get('/:id', auth, tripController.getTripById);

// Update a trip (must belong to user)
router.put('/:id', auth, tripController.updateTrip);

// Delete a trip (must belong to user)
router.delete('/:id', auth, tripController.deleteTrip);

// Download itinerary as PDF
router.get('/:id/itinerary/pdf', auth, tripController.downloadItineraryPDF);

module.exports = router;
