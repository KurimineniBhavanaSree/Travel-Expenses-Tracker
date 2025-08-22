// Diagnostic loader for expenses.js
// This script will log key DOM elements and errors to help debug why nothing is working.
document.addEventListener("DOMContentLoaded", () => {
  try {
    const tripDropdown = document.getElementById("tripDropdown");
    const baseCurrencySelector = document.getElementById("baseCurrency");
    const viewBtn = document.getElementById('viewExpensesBtn');
    const expenseForm = document.getElementById("expenseForm");
    const expensesContainer = document.getElementById("expensesContainer");
    const exchangeInfo = document.getElementById("exchangeRateInfo");
    const messageBox = document.getElementById("messageBox");
    console.log('tripDropdown:', tripDropdown);
    console.log('baseCurrencySelector:', baseCurrencySelector);
    console.log('viewBtn:', viewBtn);
    console.log('expenseForm:', expenseForm);
    console.log('expensesContainer:', expensesContainer);
    console.log('exchangeInfo:', exchangeInfo);
    console.log('messageBox:', messageBox);
    if (!tripDropdown || !baseCurrencySelector || !viewBtn || !expenseForm || !expensesContainer) {
      throw new Error('One or more required DOM elements are missing.');
    }
    viewBtn.onclick = function() {
      console.log('View Expenses button clicked');
      const tripId = tripDropdown.value;
      const baseCurrency = baseCurrencySelector.value;
      console.log('tripId:', tripId, 'baseCurrency:', baseCurrency);
    };
  } catch (e) {
    console.error('Diagnostic error:', e);
  }
});
