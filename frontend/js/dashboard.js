document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the dashboard page
    if (document.querySelector('.dashboard-container')) {
        // Initialize carousel
        initCarousel();
        
        // Load recent trips
        loadRecentTrips();
    }
});

function initCarousel() {
    const slides = document.querySelectorAll('.carousel-slide');
    const indicators = document.querySelectorAll('.indicator');
    let currentSlide = 0;
    
    function showSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        indicators.forEach(indicator => indicator.classList.remove('active'));
        
        slides[index].classList.add('active');
        indicators[index].classList.add('active');
        currentSlide = index;
    }
    
    // Next slide
    document.querySelector('.carousel-next').addEventListener('click', function() {
        let nextSlide = (currentSlide + 1) % slides.length;
        showSlide(nextSlide);
    });
    
    // Previous slide
    document.querySelector('.carousel-prev').addEventListener('click', function() {
        let prevSlide = (currentSlide - 1 + slides.length) % slides.length;
        showSlide(prevSlide);
    });
    
    // Indicator clicks
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', function() {
            showSlide(index);
        });
    });
    
    // Auto-advance every 5 seconds
    setInterval(function() {
        let nextSlide = (currentSlide + 1) % slides.length;
        showSlide(nextSlide);
    }, 5000);
}

async function loadRecentTrips() {
    try {
        const response = await makeAuthenticatedRequest('/api/trips');
        
        if (response && response.ok) {
            const trips = await response.json();
            const tripsList = document.getElementById('trips-list');
            
            if (trips.length === 0) {
                tripsList.innerHTML = '<p>You have no trips yet. <a href="tripdetails.html">Plan your first trip!</a></p>';
                return;
            }
            
            // Display up to 3 recent trips
            const recentTrips = trips.slice(0, 3);
            tripsList.innerHTML = '';
            
            recentTrips.forEach(trip => {
                const tripCard = document.createElement('div');
                tripCard.className = 'trip-card';
                
                // Calculate trip duration
                const startDate = new Date(trip.start_date);
                const endDate = new Date(trip.end_date);
                const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                
                tripCard.innerHTML = `
                    <img src="images/trip${Math.floor(Math.random() * 3) + 1}.png" alt="${trip.destination}">
                    <div class="trip-card-content">
                        <h3>${trip.trip_name}</h3>
                        <p><strong>Destination:</strong> ${trip.destination}</p>
                        <p><strong>Dates:</strong> ${formatDate(startDate)} - ${formatDate(endDate)}</p>
                        <div class="trip-meta">
                            <span>${duration} days</span>
                            <span>${trip.budget_type}</span>
                        </div>
                    </div>
                `;
                
                tripsList.appendChild(tripCard);
            });
            
            // If there are more trips, add a "View All" button
            if (trips.length > 3) {
                const viewAll = document.createElement('a');
                viewAll.href = 'dashboard.html#trips';
                viewAll.className = 'btn btn-secondary';
                viewAll.textContent = 'View All Trips';
                viewAll.style.marginTop = '20px';
                viewAll.style.display = 'inline-block';
                
                tripsList.parentElement.appendChild(viewAll);
            }
        }
    } catch (error) {
        console.error('Error loading recent trips:', error);
    }
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Add this to your existing dashboard.js
function loadTripsIntoSidebar() {
    const trips = JSON.parse(localStorage.getItem('userTrips')) || [];
    const tripsSubmenu = document.getElementById('trips-submenu');
    
    if (tripsSubmenu) {
        tripsSubmenu.innerHTML = trips.map(trip => `
            <li>
                <a href="tripdetails.html?tripId=${trip.id}" class="trip-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${trip.trip_name} (${trip.destination})</span>
                </a>
            </li>
        `).join('');
    }
}

// Call this when dashboard loads
document.addEventListener('DOMContentLoaded', function() {
    loadTripsIntoSidebar();
    
    // Listen for new trip events
    window.addEventListener('tripCreated', function(e) {
        loadTripsIntoSidebar();
    });
});