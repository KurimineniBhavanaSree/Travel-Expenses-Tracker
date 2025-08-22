// Wait for the DOM to load
document.addEventListener("DOMContentLoaded", function () {
    renderTrips();
    preventPastDates();

    // Listen for dynamically created trips from tripdetails.js
    window.addEventListener("tripCreated", function () {
        renderTrips(); // Re-render trips when a new one is added
    });
});

// Format date into readable format
function formatDate(dateString) {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Render all trips from backend for the logged-in user
async function renderTrips() {
    const tripsContainer = document.getElementById("trips-container");
    const token = localStorage.getItem('token');
    if (!token) {
        tripsContainer.innerHTML = `<div class="no-trips"><p>Please log in to view your trips.</p></div>`;
        return;
    }
    try {
        const response = await fetch('http://localhost:5000/api/trips/mytrips', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch trips');
        const data = await response.json();
        const trips = data.trips || [];
        if (trips.length === 0) {
            tripsContainer.innerHTML = `
                <div class="no-trips">
                    <i class="fas fa-suitcase-rolling"></i>
                    <p>No trips found. Start planning your next adventure!</p>
                </div>
            `;
            return;
        }
        tripsContainer.innerHTML = trips.map(trip => `
            <div class="trip-card">
                <div class="trip-header">
                    <h3>${trip.trip_name}</h3>
                    <div class="trip-actions">
                        <button onclick="editTrip('${trip.id}')"><i class="fas fa-edit"></i></button>
                        <button onclick="deleteTrip('${trip.id}')"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
                <div class="trip-destination">${trip.destination}</div>
                <div class="trip-dates">
                    ${formatDate(trip.start_date)} to ${formatDate(trip.end_date)}
                </div>
            </div>
        `).join("");
    } catch (err) {
        tripsContainer.innerHTML = `<div class="no-trips"><p>Error loading trips: ${err.message}</p></div>`;
    }
}

// Confirm and delete a trip by ID (from backend)
window.deleteTrip = async function (id) {
    const confirmDelete = confirm("Are you sure you want to delete this trip?");
    if (!confirmDelete) return;
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please log in.');
        return;
    }
    try {
        const response = await fetch(`http://localhost:5000/api/trips/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to delete trip');
        alert('Trip deleted successfully!');
        renderTrips();
    } catch (err) {
        alert('Error deleting trip: ' + err.message);
    }
};

// Open the Edit Trip modal with pre-filled values (fetch from backend)
window.editTrip = async function (id) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please log in.');
        return;
    }
    try {
        const response = await fetch(`http://localhost:5000/api/trips/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch trip');
        const data = await response.json();
        const trip = data.trip;
        document.getElementById("editTripId").value = trip.id;
        document.getElementById("editTripName").value = trip.trip_name;
        document.getElementById("editTripDestination").value = trip.destination;
        document.getElementById("editTripStartDate").value = trip.start_date;
        document.getElementById("editTripEndDate").value = trip.end_date;
        // Set min dates to today to prevent past dates
        const today = new Date().toISOString().split("T")[0];
        document.getElementById("editTripStartDate").setAttribute("min", today);
        document.getElementById("editTripEndDate").setAttribute("min", today);
        document.getElementById("editModal").style.display = "block";
    } catch (err) {
        alert('Error loading trip: ' + err.message);
    }
};

// Close the Edit Modal
window.closeEditModal = function () {
    document.getElementById("editModal").style.display = "none";
};

// Save changes to the edited trip (update via backend)
document.getElementById("editTripForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const id = document.getElementById("editTripId").value;
    const trip_name = document.getElementById("editTripName").value;
    const destination = document.getElementById("editTripDestination").value;
    const start_date = document.getElementById("editTripStartDate").value;
    const end_date = document.getElementById("editTripEndDate").value;
    // Validation for dates
    const today = new Date().toISOString().split("T")[0];
    if (start_date < today || end_date < today) {
        alert("Start and End dates cannot be in the past.");
        return;
    }
    if (end_date < start_date) {
        alert("End date cannot be before Start date.");
        return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please log in.');
        return;
    }
    try {
        const response = await fetch(`http://localhost:5000/api/trips/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ trip_name, destination, start_date, end_date })
        });
        if (!response.ok) throw new Error('Failed to update trip');
        renderTrips();
        closeEditModal();
        alert("Trip updated successfully!");
    } catch (err) {
        alert('Error updating trip: ' + err.message);
    }
});

// Prevent selecting past dates in the modal (initial setup)
function preventPastDates() {
    const today = new Date().toISOString().split("T")[0];
    const startInput = document.getElementById("editTripStartDate");
    const endInput = document.getElementById("editTripEndDate");

    if (startInput && endInput) {
        startInput.setAttribute("min", today);
        endInput.setAttribute("min", today);
    }
}
