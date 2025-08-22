document.addEventListener('DOMContentLoaded', function() {
    const API_BASE = 'http://localhost:5000'; // Base API URL
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const logoutBtns = document.querySelectorAll('#logout-btn, #logout-btn-nav');
    const navbarContainer = document.getElementById('navbar-container');

    // Handle login
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch(`${API_BASE}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Login failed');
                }

                const data = await response.json();
                localStorage.setItem('token', data.token);
                localStorage.setItem('userId', data.userId);
                window.location.href = 'dashboard.html';
            } catch (error) {
                console.error('Login error:', error);
                document.getElementById('errorMessage').textContent = error.message || 'An error occurred during login';
            }
        });
    }

    // Handle signup
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password !== confirmPassword) {
                document.getElementById('errorMessage').textContent = 'Passwords do not match';
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Registration failed');
                }

                const data = await response.json();
                localStorage.setItem('token', data.token);
                localStorage.setItem('userId', data.userId);
                window.location.href = 'dashboard.html';
            } catch (error) {
                console.error('Registration error:', error);
                document.getElementById('errorMessage').textContent = error.message || 'An error occurred during registration';
            }
        });
    }

    // Load navbar and setup event listeners
    if (navbarContainer) {
        fetch('navbar.html')
            .then(response => response.text())
            .then(html => {
                navbarContainer.innerHTML = html;
                loadUserInfo();

                // Setup logout buttons
                document.querySelectorAll('#logout-btn, #logout-btn-nav').forEach(btn => {
                    btn.addEventListener('click', function(e) {
                        e.preventDefault();
                        logout();
                    });
                });

                // Setup trips link
                const tripsLink = document.getElementById('trips-link');
                if (tripsLink) {
                    tripsLink.addEventListener('click', async function(e) {
                        e.preventDefault();
                        try {
                            await loadTrips();
                            window.location.hash = '#trips';
                        } catch (error) {
                            console.error('Failed to load trips:', error);
                        }
                    });
                }
            });
    }
});

// Load user info
async function loadUserInfo() {
    const token = localStorage.getItem('token');
    if (!token) {
        logout();
        return;
    }

    try {
        const response = await makeAuthenticatedRequest('http://localhost:5000/api/auth/user');
        if (!response.ok) throw new Error('Failed to load user info');
        
        const user = await response.json();
        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay) {
            usernameDisplay.textContent = user.username;
        }

        if (document.getElementById('username')) {
            document.getElementById('username').value = user.username;
            document.getElementById('currentEmail').value = user.email;
        }
    } catch (error) {
        console.error('Error loading user info:', error);
        logout();
    }
}

// Load trips data
async function loadTrips() {
    try {
        const response = await makeAuthenticatedRequest('http://localhost:5000/api/trips');
        if (!response.ok) throw new Error('Failed to fetch trips');
        
        const trips = await response.json();
        const tripsContainer = document.getElementById('trips-container');
        
        if (tripsContainer) {
            tripsContainer.innerHTML = trips.map(trip => `
                <div class="trip-card">
                    <h3>${trip.trip_name}</h3>
                    <p><strong>Destination:</strong> ${trip.destination}</p>
                    <p><strong>Dates:</strong> ${new Date(trip.start_date).toLocaleDateString()} - ${new Date(trip.end_date).toLocaleDateString()}</p>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading trips:', error);
        throw error;
    }
}

// Logout user
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    window.location.href = 'login.html';
}

// Authenticated request helper
async function makeAuthenticatedRequest(url, method = 'GET', body = null) {
    const token = localStorage.getItem('token');
    if (!token) {
        logout();
        return null;
    }

    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);
        if (response.status === 401) {
            logout();
            return null;
        }
        return response;
    } catch (error) {
        console.error('Request failed:', error);
        throw error;
    }
}