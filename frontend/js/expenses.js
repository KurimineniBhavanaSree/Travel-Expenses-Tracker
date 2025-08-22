document.addEventListener("DOMContentLoaded", () => {

  // Declare DOM elements first
  const tripDropdown = document.getElementById("tripDropdown");
  const baseCurrencySelector = document.getElementById("baseCurrency");
  const viewBtn = document.getElementById('viewExpensesBtn');
  const expenseForm = document.getElementById("expenseForm");
  const expensesContainer = document.getElementById("expensesContainer");
  const exchangeInfo = document.getElementById("exchangeRateInfo");
  const messageBox = document.getElementById("messageBox");

  let trips = [];
  let expenses = [];
  let editingExpenseId = null;

  // Attach click handler to static View Expenses button
  if (viewBtn) {
    viewBtn.onclick = function() {
      const tripId = tripDropdown.value;
      const baseCurrency = baseCurrencySelector.value;
      if (tripId) renderExpenses(tripId, baseCurrency);
      else showMessage('Please select a trip.');
    };
  }

  function getToken() {
    return localStorage.getItem('token');
  }

  async function loadTrips() {
    tripDropdown.innerHTML = '<option value="">Select Trip</option>';
    const token = getToken();
    if (!token) return;
    try {
      const response = await fetch('http://localhost:5000/api/trips/mytrips', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch trips');
      const data = await response.json();
      trips = data.trips || [];
      trips.forEach(trip => {
        const option = document.createElement("option");
        option.value = trip.id;
        option.textContent = trip.trip_name;
        option.setAttribute('data-start', trip.start_date);
        option.setAttribute('data-end', trip.end_date);
        tripDropdown.appendChild(option);
      });
    } catch (err) {
      tripDropdown.innerHTML = '<option value="">Error loading trips</option>';
    }
  }

  async function renderExpenses(tripId, baseCurrency) {
    expensesContainer.innerHTML = "";
    if (!tripId) return;
    const token = getToken();
    if (!token) return;
    try {
      const response = await fetch(`http://localhost:5000/api/expenses?trip_id=${tripId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
        if (!response.ok) {
          const errorText = await response.text();
          if (errorText && errorText.toLowerCase().includes('jwt expired')) {
            alert('Session expired. Please log in again.');
            localStorage.removeItem('token');
            window.location.href = '/frontend/login.html';
            return;
          }
          throw new Error('Failed to fetch expenses');
        }
      expenses = await response.json();
    } catch (err) {
      expensesContainer.innerHTML = `<p>Error loading expenses: ${err.message}</p>`;
      return;
    }

    if (expenses.length === 0) {
      expensesContainer.innerHTML = "<p>No expenses for this trip.</p>";
      return;
    }

    // Fetch exchange rates for all currencies to baseCurrency
    let rates = {};
    if (baseCurrency) {
      const uniqueCurrencies = [...new Set(expenses.map(e => e.currency).filter(c => c !== baseCurrency))];
      await Promise.all(uniqueCurrencies.map(async (cur) => {
        if (cur !== baseCurrency) {
          try {
            const url = `https://api.exchangerate-api.com/v4/latest/${cur}`;
            const res = await fetch(url);
            const data = await res.json();
            rates[cur] = data.rates[baseCurrency] || 1;
          } catch {
            rates[cur] = 1;
          }
        }
      }));
    }

    // Show exchange rate info, one per line
    if (baseCurrency && Object.keys(rates).length > 0) {
      let info = '';
      for (const cur in rates) {
        if (cur !== baseCurrency) info += `1 ${cur} = ${rates[cur].toFixed(4)} ${baseCurrency}\n`;
      }
      exchangeInfo.innerText = info.trim();
      exchangeInfo.style.whiteSpace = 'pre-line';
    } else {
      exchangeInfo.innerText = '';
    }

    // Always render the table, but only one heading
    expensesContainer.innerHTML = '';
    const table = document.createElement("table");
    table.className = "expenses-table";
    table.innerHTML = `
      <tr>
        <th>Date</th>
        <th>Description</th>
        <th>Amount</th>
        <th>Currency</th>
        <th>Base Currency</th>
        <th>Currency Rate</th>
        <th>Category</th>
        <th>Actions</th>
      </tr>
    `;

    expenses.forEach((exp) => {
      const row = document.createElement("tr");
      let baseAmount = exp.base_amount || exp.amount;
      let baseCur = exp.base_currency || exp.currency;
      let rate = Number(exp.exchange_rate);
      if (isNaN(rate) || rate === 0) rate = 1;
      let rateText = (exp.currency === baseCur)
        ? `1 ${baseCur} = 1 ${baseCur}`
        : `1 ${exp.currency} = ${rate.toFixed(4)} ${baseCur}`;
      row.innerHTML = `
        <td>${exp.expense_date}</td>
        <td>${exp.description}</td>
        <td>${exp.amount}</td>
        <td>${exp.currency}</td>
        <td>${baseAmount} (${baseCur})</td>
        <td>${rateText}</td>
        <td>${exp.category}</td>
        <td>
          <button class="edit-btn clean-btn">✏️ Edit</button>
          <button class="delete-btn clean-btn delete-btn-alt">🗑️ Delete</button>
        </td>
      `;
      row.querySelector(".edit-btn").addEventListener("click", async () => {
        try {
          await editExpense(exp.id);
        } catch (err) {
          showMessage('Could not load expense for editing. It may have been deleted.');
        }
      });
      row.querySelector(".delete-btn").addEventListener("click", async () => {
        try {
          await deleteExpense(exp.id);
        } catch (err) {
          showMessage('Could not delete expense. It may have already been deleted.');
        }
      });
      table.appendChild(row);
    });

    const heading = document.createElement("h3");
    heading.textContent = `Expenses for selected trip`;
    expensesContainer.appendChild(heading);
    expensesContainer.appendChild(table);
  }

  async function getExchangeRate(from, to) {
    if (from === to) return 1;
    const url = `https://api.exchangerate-api.com/v4/latest/${from}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.rates[to] || 1;
  }

  expenseForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const tripId = tripDropdown.value;
    const amount = parseFloat(document.getElementById("expenseAmount").value);
    const currency = document.getElementById("expenseCurrency").value;
    const description = document.getElementById("expenseDescription").value;
    const date = document.getElementById("expenseDate").value;
    const category = document.getElementById("expenseCategory").value;
    const baseCur = baseCurrencySelector.value;

    if (!tripId || !currency) {
      alert("Please select a trip and expense currency.");
      return;
    }
    if (!baseCur) {
      showMessage("Please select a base currency when adding an expense.");
      return;
    }

    const token = getToken();
    if (!token) {
      alert('Please log in.');
      return;
    }

    try {
      let url = 'http://localhost:5000/api/expenses';
      let method = 'POST';
      if (editingExpenseId) {
        url += `/${editingExpenseId}`;
        method = 'PUT';
      }

      let rate = 1;
      let baseAmount = amount;
      if (baseCur !== currency) {
        rate = await getExchangeRate(currency, baseCur);
        baseAmount = (amount * rate).toFixed(2);
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          trip_id: tripId,
          amount,
          currency,
          description,
          expense_date: date,
          category,
          base_amount: baseAmount,
          base_currency: baseCur,
          exchange_rate: rate
        })
      });

        if (!response.ok) {
          const errorText = await response.text();
          if (errorText && errorText.toLowerCase().includes('jwt expired')) {
            alert('Session expired. Please log in again.');
            localStorage.removeItem('token');
            window.location.href = '/frontend/login.html';
            return;
          }
          throw new Error('Failed to save expense');
        }

      showMessage(editingExpenseId ? "Expense updated successfully!" : "Expense added successfully!");
      editingExpenseId = null;
      renderExpenses(tripId, baseCur);
      expenseForm.reset();
    } catch (err) {
      showMessage('Error: ' + err.message);
    }
  });

  // Event listeners for dropdown changes
  tripDropdown.addEventListener("change", () => {
    const tripId = tripDropdown.value;
    const baseCurrency = baseCurrencySelector.value;
    if (tripId) renderExpenses(tripId, baseCurrency);
  });

  baseCurrencySelector.addEventListener("change", () => {
    const tripId = tripDropdown.value;
    const baseCurrency = baseCurrencySelector.value;
    if (tripId) renderExpenses(tripId, baseCurrency);
  });

  // Global functions
  window.editExpense = function (expenseId) {
    const exp = expenses.find(e => e.id === expenseId);
    if (!exp) return;
    editingExpenseId = expenseId;
    tripDropdown.value = exp.trip_id;
    document.getElementById("expenseAmount").value = exp.amount;
    document.getElementById("expenseCurrency").value = exp.currency;
    document.getElementById("expenseDescription").value = exp.description;
  document.getElementById("expenseDate").value = exp.expense_date ? exp.expense_date.substring(0, 10) : '';
    document.getElementById("expenseCategory").value = exp.category;
    showMessage("Edit the form and submit to update the expense.");
  };

  window.deleteExpense = async function (expenseId) {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    const token = getToken();
    if (!token) {
      alert('Please log in.');
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
        if (!response.ok) {
          const errorText = await response.text();
          if (errorText && errorText.toLowerCase().includes('jwt expired')) {
            alert('Session expired. Please log in again.');
            localStorage.removeItem('token');
            window.location.href = '/frontend/login.html';
            return;
          }
          throw new Error('Failed to delete expense');
        }
      showMessage("Expense deleted successfully!");
      renderExpenses(tripDropdown.value, baseCurrencySelector.value);
    } catch (err) {
      showMessage('Error: ' + err.message);
    }
  };

  function showMessage(msg) {
    messageBox.textContent = msg;
    messageBox.style.display = "block";
    messageBox.style.position = "fixed";
    messageBox.style.top = "30px";
    messageBox.style.right = "30px";
    messageBox.style.background = "#007bff";
    messageBox.style.color = "#fff";
    messageBox.style.padding = "12px 24px";
    messageBox.style.borderRadius = "8px";
    messageBox.style.fontWeight = "bold";
    messageBox.style.zIndex = 9999;
    setTimeout(() => {
      messageBox.style.display = "none";
    }, 3000);
  }

  // Load trips on page load
  loadTrips();
});
