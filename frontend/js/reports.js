document.addEventListener('DOMContentLoaded', function() {
    // Chart.js setup (existing code)
    if (document.getElementById('expenseChart')) {
        const ctx = document.getElementById('expenseChart').getContext('2d');
        let expenseChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: []
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { enabled: true }
                },
                scales: {
                    x: { stacked: false },
                    y: { beginAtZero: true }
                }
            }
        });

        // Trip type and trip name logic
        const tripType = document.getElementById('reportType');
        const tripName = document.getElementById('tripName');
        // Load trips from backend (authenticated)
        const token = localStorage.getItem('token');
        fetch('http://localhost:5000/api/trips/mytrips', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                tripName.innerHTML = '';
                (data.trips || []).forEach(trip => {
                    const opt = document.createElement('option');
                    opt.value = trip.id;
                    opt.textContent = trip.trip_name;
                    tripName.appendChild(opt);
                });
            });

        // Change select mode based on trip type
        function updateTripSelectMode() {
            if (tripType.value === 'trip') {
                tripName.setAttribute('multiple', 'multiple');
                tripName.size = 4;
                // Add visual cue for multi-select
                tripName.title = 'Hold Ctrl (Windows) or Command (Mac) to select multiple trips';
            } else {
                if (tripName.hasAttribute('multiple')) {
                    // Remove all but the first selected option
                    let firstSelected = Array.from(tripName.selectedOptions)[0];
                    Array.from(tripName.options).forEach(opt => opt.selected = false);
                    if (firstSelected) firstSelected.selected = true;
                }
                tripName.removeAttribute('multiple');
                tripName.size = 1;
                tripName.title = '';
            }
        }
        tripType.addEventListener('change', updateTripSelectMode);
        updateTripSelectMode();

        // Set up report generation
        document.getElementById('generateReport').addEventListener('click', function() {
            generateReport(expenseChart);
        });
        // Set up download buttons
        document.getElementById('downloadPDF').addEventListener('click', function(e) {
            e.preventDefault();
            downloadPDF(expenseChart);
        });
        document.getElementById('downloadExcel').addEventListener('click', function(e) {
            e.preventDefault();
            downloadExcel();
        });
    }
});

// Helper: fetch trip details by id
async function fetchTripDetails(tripId) {
    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:5000/api/trips/${tripId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    return data.trip;
}

// Helper: fetch expenses for a trip
async function fetchExpenses(tripId) {
    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:5000/api/expenses?trip_id=${tripId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
}

// Main report generation logic
async function generateReport(expenseChart) {
    const tripType = document.getElementById('reportType').value;
    const tripNameSelect = document.getElementById('tripName');
    let selectedTripIds = Array.from(tripNameSelect.selectedOptions).map(opt => opt.value).filter(Boolean);
    if (selectedTripIds.length === 0) {
        showNotification('Please select at least one trip.', false);
        return;
    }
    // Fetch trip details and expenses
    let trips = await Promise.all(selectedTripIds.map(id => fetchTripDetails(id)));
    let allExpenses = await Promise.all(selectedTripIds.map(id => fetchExpenses(id)));

    // Prepare data for chart and table

    let summaryRows = [];
    let totalBudget = 0, totalSpent = 0;
    let chartData = [];
    if (tripType === 'category') {
        // Only one trip allowed
        document.getElementById('expenseChart').style.display = '';
        document.getElementById('plotlyChart').style.display = 'none';
        const trip = trips[0];
        const expenses = allExpenses[0];
        // Group by category
        const catMap = {};
        expenses.forEach(e => {
            if (!catMap[e.category]) catMap[e.category] = 0;
            catMap[e.category] += Number(e.amount);
        });
        let chartLabels = [], chartColors = [];
        chartData = [];
        for (const cat in catMap) {
            chartLabels.push(cat);
            chartData.push(catMap[cat]);
            chartColors.push(randomColor());
            summaryRows.push([cat, catMap[cat].toFixed(2), '']);
        }
        totalBudget = Number(trip.budget) || 0;
        totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
        // Update chart for category
        expenseChart.data.labels = chartLabels;
        expenseChart.data.datasets = [{
            label: trip.trip_name,
            data: chartData,
            backgroundColor: chartColors
        }];
        expenseChart.options.type = 'doughnut';
        expenseChart.update();
    } else {
        // By Trip: compare multiple trips (bar only)
        document.getElementById('expenseChart').style.display = 'none';
        document.getElementById('plotlyChart').style.display = '';
        let allCategories = new Set();
        allExpenses.forEach(expenses => {
            expenses.forEach(e => allCategories.add(e.category));
        });
        allCategories = Array.from(allCategories);
        let traces = trips.map((trip, idx) => {
            const expenses = allExpenses[idx];
            let catMap = {};
            expenses.forEach(e => {
                if (!catMap[e.category]) catMap[e.category] = 0;
                catMap[e.category] += Number(e.amount);
            });
            let data = allCategories.map(cat => catMap[cat] || 0);
            const spent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
            summaryRows.push([
                trip.trip_name,
                (Number(trip.budget) || 0).toFixed(2),
                spent.toFixed(2),
                ((Number(trip.budget) || 0) - spent).toFixed(2)
            ]);
            totalBudget += Number(trip.budget) || 0;
            totalSpent += spent;
            return {
                x: allCategories,
                y: data,
                name: trip.trip_name,
                type: 'bar',
                marker: { color: randomColor() },
            };
        });
        const layout = {
            barmode: 'group',
            title: 'Trip Comparison by Category',
            scene: {
                xaxis: { title: 'Category' },
                yaxis: { title: 'Amount' },
                zaxis: { title: 'Trip' }
            },
            xaxis: { title: 'Category' },
            yaxis: { title: 'Amount' },
            legend: { orientation: 'h' },
        };
        Plotly.newPlot('plotlyChart', traces, layout);
    }

    // Show chart and summary
    document.querySelector('.chart-container').style.display = 'block';
    document.querySelector('.report-content').style.display = 'block';
    document.querySelector('.expense-summary').style.display = 'block';

    // Build summary table
    const summaryTable = document.getElementById('summaryTable');
    let thead = '', tbody = '';
    if (tripType === 'category') {
        thead = `<tr><th>Category</th><th>Total Amount</th><th>Percentage</th></tr>`;
        const total = chartData.reduce((a, b) => a + b, 0);
        summaryRows.forEach(row => {
            const percent = total ? ((row[1] / total) * 100).toFixed(1) + '%' : '0%';
            tbody += `<tr><td>${row[0]}</td><td>${row[1]}</td><td>${percent}</td></tr>`;
        });
    } else {
        thead = `<tr><th>Trip Name</th><th>Total Budget</th><th>Total Spent</th><th>Remaining</th></tr>`;
        summaryRows.forEach(row => {
            tbody += `<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td><td>${row[3]}</td></tr>`;
        });
    }
    summaryTable.innerHTML = `<thead>${thead}</thead><tbody>${tbody}</tbody>`;
}

// Helper: random color for charts
function randomColor() {
    const colors = [
        '#6c5ce7', '#00b894', '#fdcb6e', '#00bcd4', '#e17055', '#0984e3', '#fd79a8', '#636e72', '#fab1a0', '#b2bec3'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

function downloadExcel() {
    try {
        const tripName = document.getElementById('tripName').value;
        const reportType = document.getElementById('reportType').value;
        
        // Prepare data
        const table = document.getElementById('summaryTable');
        const rows = table.querySelectorAll('tr');
        const data = [];
        
        // Get headers
        const headers = [];
        table.querySelectorAll('th').forEach(th => headers.push(th.textContent));
        data.push(headers);
        
        // Get rows
        rows.forEach((row, index) => {
            if (index === 0) return; // Skip header row
            
            const rowData = [];
            row.querySelectorAll('td').forEach(td => rowData.push(td.textContent));
            data.push(rowData);
        });
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // Add chart image (not directly supported, but we can add a note)
        if (ws['!merges']) ws['!merges'] = [];
        ws['!merges'].push({ s: { r: data.length + 1, c: 0 }, e: { r: data.length + 1, c: headers.length - 1 } });
        XLSX.utils.sheet_add_aoa(ws, [[`Chart available in the PDF version of this report`]], { origin: { r: data.length + 1, c: 0 } });
        
        XLSX.utils.book_append_sheet(wb, ws, "Expense Summary");
        
        // Generate and download
        XLSX.writeFile(wb, `Expense_Report_${tripName}_${new Date().toISOString().slice(0,10)}.xlsx`);
        
        // Show success notification
        showNotification('Excel report downloaded successfully!');
        
    } catch (error) {
        console.error('Error generating Excel:', error);
        showNotification('Error generating Excel report', false);
    }
}
