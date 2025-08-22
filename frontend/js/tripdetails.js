document.addEventListener('DOMContentLoaded', function () {
  const tripForm = document.getElementById('tripForm');
  const itineraryContainer = document.getElementById('itineraryContainer');
  const itineraryContent = document.getElementById('itineraryContent');

  // Set minimum date for date inputs (today)
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('startDate').min = today;
  document.getElementById('endDate').min = today;

  // Background images for destinations
  const destinationBackgrounds = {
    'Agra': 'https://images.unsplash.com/photo-1564507592333-c60657eea523?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80',
    'Goa': 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80',
    'Default': 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80'
  };

  // Helper: Retrieve token (use the same key as auth.js)
  function getToken() {
    return localStorage.getItem('token');
  }

  // Date validation
  document.getElementById('startDate').addEventListener('change', function () {
    const endDateInput = document.getElementById('endDate');
    endDateInput.min = this.value;
    if (new Date(endDateInput.value) < new Date(this.value)) {
      endDateInput.value = this.value;
    }
  });

  tripForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Get form values
    const tripName = document.getElementById('tripName').value;
    const destination = document.getElementById('destination').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const companionType = document.getElementById('companionType').value || 'solo';
    const peopleCount = parseInt(document.getElementById('peopleCount').value || '1', 10);
  const budgetType = document.getElementById('budgetType').value || 'moderate';
  const budget = document.getElementById('budget').value;

    // Validate dates
    if (new Date(startDate) > new Date(endDate)) {
      alert('End date cannot be before start date');
      return;
    }

    // Show loading
    document.getElementById('loadingIndicator').style.display = 'block';
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }

      // Send POST to backend
      const response = await fetch('http://localhost:5000/api/trips/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          trip_name: tripName,
          destination,
          start_date: startDate,
          end_date: endDate,
          budget_type: budgetType,
          companion_type: companionType,
          people_count: peopleCount,
          budget
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || `Server error: ${response.statusText}`);
      }

      const data = await response.json();

      // Hide loader and reset button
      document.getElementById('loadingIndicator').style.display = 'none';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Trip';

      // Display itinerary from backend response
      displayItineraryCard(data.trip, destination, startDate, endDate);
      showToast('Trip created successfully!', 'success');
    } catch (error) {
      console.error('Error:', error);
      document.getElementById('loadingIndicator').style.display = 'none';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Trip';
      showToast('Error: ' + error.message, 'error');
    }
  });

  async function displayItineraryCard(trip, destination, startDate, endDate) {
    itineraryContent.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'itinerary-card';
    card.id = 'itineraryToPrint';

    // Header
    const header = document.createElement('div');
    header.className = 'card-header-bg';
    header.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.5)), url(${destinationBackgrounds[destination] || destinationBackgrounds['Default']})`;
    header.innerHTML = `
      <div class="header-content">
        <div class="info-item">
          <span class="info-label">Destination:</span>
          <span class="info-value">${destination}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Dates:</span>
          <span class="info-value">${formatDate(startDate)} - ${formatDate(endDate)}</span>
        </div>
      </div>
    `;

    // Body
    const body = document.createElement('div');
    body.className = 'card-body';
    body.innerHTML = `<h2>Your Itinerary</h2>`;

    // If backend itinerary is null, fetch from itineraries.json
    let itineraryData = trip.itinerary;
    if (!itineraryData) {
      try {
        const res = await fetch('itineraries.json');
        const json = await res.json();
        const match = json.places.find(
          (item) => item.name.toLowerCase() === destination.toLowerCase()
        );
        if (match && match.activities && match.activities.length > 0) {
          // Render as beautiful table
          let table = '<table class="itinerary-table"><thead><tr><th>Day</th><th>Activity</th><th>Description</th><th>Duration</th></tr></thead><tbody>';
          match.activities.forEach((act, idx) => {
            table += `<tr><td>Day ${idx + 1}</td><td>${act.name}</td><td>${act.description}</td><td>${act.duration}</td></tr>`;
          });
          table += '</tbody></table>';
          body.innerHTML += table;
        } else {
          body.innerHTML += `<div class="itinerary-text">No itinerary available for this destination.</div>`;
        }
      } catch (err) {
        body.innerHTML += `<div class="itinerary-text">Unable to load itinerary.</div>`;
      }
    } else if (itineraryData && itineraryData.includes('Day 1:')) {
      // Parse and render as table (legacy fallback)
      const lines = itineraryData.split('\n');
      let table = '<table class="itinerary-table"><thead><tr><th>Day</th><th>Date</th><th>Morning</th><th>Afternoon</th><th>Evening</th></tr></thead><tbody>';
      let day, date, morning, afternoon, evening;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('Day ')) {
          if (day) {
            table += `<tr><td>${day}</td><td>${date}</td><td>${morning}</td><td>${afternoon}</td><td>${evening}</td></tr>`;
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
        table += `<tr><td>${day}</td><td>${date}</td><td>${morning}</td><td>${afternoon}</td><td>${evening}</td></tr>`;
      }
      table += '</tbody></table>';
      body.innerHTML += table;
    } else {
      body.innerHTML += `<pre class="itinerary-text">${itineraryData || 'No details available.'}</pre>`;
    }

    // Download button
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-btn';
    downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download as PDF';
    downloadBtn.onclick = function() { downloadItineraryPDF(trip.id); };

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(downloadBtn);
    itineraryContent.appendChild(card);
    itineraryContainer.style.display = 'block';
  }


  // No longer saving to localStorage; trips are managed by backend


  // Download itinerary PDF from backend
  async function downloadItineraryPDF(tripId) {
    const token = getToken();
    if (!token) {
      showToast('Authentication required. Please log in.', 'error');
      return;
    }
    try {
      const downloadBtn = document.querySelector('.download-btn');
      const originalButtonText = downloadBtn.innerHTML;
      downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
      downloadBtn.disabled = true;

      const response = await fetch(`http://localhost:5000/api/trips/${tripId}/itinerary/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to download PDF');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'itinerary.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('PDF downloaded successfully!', 'success');
      downloadBtn.innerHTML = originalButtonText;
      downloadBtn.disabled = false;
    } catch (error) {
      showToast('Error: ' + error.message, 'error');
      const downloadBtn = document.querySelector('.download-btn');
      if (downloadBtn) {
        downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download as PDF';
        downloadBtn.disabled = false;
      }
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  }
});
