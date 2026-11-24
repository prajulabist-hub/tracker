// ============================================================
// App.jsx – Main (and only) component for the Expense Tracker
// ------------------------------------------------------------
// This component handles:
//   • Fetching all expenses from the API when the page loads
//   • Adding a new expense (POST)
//   • Editing an existing expense (PUT)
//   • Deleting an expense (DELETE)
//   • Filtering expenses by category
//   • Calculating the running total
//   • Showing error messages if something goes wrong
// ============================================================

import { useState, useEffect } from 'react';
import './App.css';

// The base URL of our backend API.
// All fetch() calls below use this constant.
const API_URL = 'http://localhost:5001/api/expenses';

// The list of categories, used in dropdowns throughout the UI.
const CATEGORIES = ['Food', 'Transport', 'Study', 'Entertainment', 'Other'];

function App() {
  // ── State ──────────────────────────────────────────────────
  // expenses: array of expense objects fetched from the server
  const [expenses, setExpenses] = useState([]);

  // formData: values currently in the Add/Edit form
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'Other',
  });

  // editingId: if we are editing, this holds the _id of the expense being edited
  // If null, we are in "add" mode
  const [editingId, setEditingId] = useState(null);

  // filterCategory: which category to show in the list ("All" = show everything)
  const [filterCategory, setFilterCategory] = useState('All');

  // error: a string to display when something goes wrong (API error, etc.)
  const [error, setError] = useState('');

  // loading: true while we are waiting for an API call to finish
  const [loading, setLoading] = useState(false);

  // ── Fetch expenses on first render ────────────────────────
  // useEffect with an empty dependency array [] runs once when the component mounts.
  useEffect(() => {
    fetchExpenses();
  }, []);

  // ── API Helper Functions ───────────────────────────────────

  // GET all expenses from the server
  async function fetchExpenses() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(API_URL);
      // If the response status is not 2xx, throw an error
      if (!response.ok) throw new Error('Failed to fetch expenses');
      const data = await response.json();
      setExpenses(data); // update state with the fetched array
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // POST – add a new expense (called when form is submitted in "add" mode)
  async function addExpense(expenseData) {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // tell the server we're sending JSON
        body: JSON.stringify(expenseData),               // convert JS object to JSON string
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add expense');
      // Prepend the new expense to the top of the list (newest first)
      setExpenses((prev) => [data, ...prev]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // PUT – update an existing expense (called when form is submitted in "edit" mode)
  async function updateExpense(id, expenseData) {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update expense');
      // Replace the old expense in the array with the updated version
      setExpenses((prev) =>
        prev.map((exp) => (exp._id === id ? data : exp))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // DELETE – remove an expense by its id
  async function deleteExpense(id) {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete expense');
      // Remove the expense from the local state (no need to re-fetch)
      setExpenses((prev) => prev.filter((exp) => exp._id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Form Handlers ──────────────────────────────────────────

  // Called whenever the user types in an input or changes a select
  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  // Called when the form is submitted (either Add or Update)
  function handleSubmit(e) {
    e.preventDefault(); // prevent the default browser page reload

    // Build the payload object to send to the API
    const payload = {
      title: formData.title.trim(),
      amount: parseFloat(formData.amount), // convert the string input to a number
      category: formData.category,
    };

    if (editingId) {
      // We are editing – send a PUT request
      updateExpense(editingId, payload);
      cancelEdit(); // reset the form back to "add" mode
    } else {
      // We are adding – send a POST request
      addExpense(payload);
      resetForm();
    }
  }

  // Fill the form with an expense's data so the user can edit it
  function handleEdit(expense) {
    setEditingId(expense._id);
    setFormData({
      title: expense.title,
      amount: expense.amount,
      category: expense.category,
    });
    // Scroll the form into view so the user sees it
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Cancel editing and go back to "add" mode
  function cancelEdit() {
    setEditingId(null);
    resetForm();
  }

  // Clear the form fields
  function resetForm() {
    setFormData({ title: '', amount: '', category: 'Other' });
  }

  // ── Derived / Computed Values ──────────────────────────────

  // Filter the expenses array based on the selected category
  const filteredExpenses =
    filterCategory === 'All'
      ? expenses
      : expenses.filter((exp) => exp.category === filterCategory);

  // Calculate the running total (sum of all expense amounts)
  // toFixed(2) formats the number to 2 decimal places (e.g., 1500.00)
  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2);

  // ── Helper: format a date string into a readable format ───
  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  // ── Category badge color mapping ──────────────────────────
  const categoryColors = {
    Food: '#f97316',
    Transport: '#3b82f6',
    Study: '#8b5cf6',
    Entertainment: '#ec4899',
    Other: '#6b7280',
  };

  // ── JSX (what gets rendered on screen) ────────────────────
  return (
    <div className="app-container">

      {/* ── Page Header ─────────────────────────────────── */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-icon">💸</div>
          <div>
            <h1>Expense Tracker</h1>
            <p className="header-subtitle">Track your daily spending, stay on budget</p>
          </div>
        </div>
        <div className="total-badge">
          <span className="total-label">Total Spent</span>
          <span className="total-amount">Rs. {total}</span>
        </div>
      </header>

      <main className="main-content">

        {/* ── Error Message ───────────────────────────────── */}
        {/* Only shown when there is an error string */}
        {error && (
          <div className="error-box" role="alert">
            <span>⚠️ {error}</span>
            <button className="error-close" onClick={() => setError('')}>✕</button>
          </div>
        )}

        {/* ── Add / Edit Form ─────────────────────────────── */}
        <section className="form-card">
          <h2 className="section-title">
            {editingId ? '✏️ Edit Expense' : '➕ Add New Expense'}
          </h2>

          <form onSubmit={handleSubmit} className="expense-form">

            {/* Title input */}
            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input
                id="title"
                type="text"
                name="title"
                placeholder="e.g. Lunch, Bus fare, Textbook"
                value={formData.title}
                onChange={handleInputChange}
                required
                maxLength={100}
              />
            </div>

            {/* Amount input */}
            <div className="form-group">
              <label htmlFor="amount">Amount (Rs.)</label>
              <input
                id="amount"
                type="number"
                name="amount"
                placeholder="0.00"
                value={formData.amount}
                onChange={handleInputChange}
                required
                min="0"
                step="0.01"
              />
            </div>

            {/* Category dropdown */}
            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Form buttons */}
            <div className="form-actions">
              <button
                id="submit-btn"
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : editingId ? '✔ Update Expense' : '+ Add Expense'}
              </button>

              {/* Show Cancel only in edit mode */}
              {editingId && (
                <button
                  id="cancel-btn"
                  type="button"
                  className="btn btn-secondary"
                  onClick={cancelEdit}
                >
                  ✕ Cancel
                </button>
              )}
            </div>

          </form>
        </section>

        {/* ── Expense List ────────────────────────────────── */}
        <section className="list-card">
          <div className="list-header">
            <h2 className="section-title">📋 Expenses</h2>

            {/* Category filter dropdown */}
            <div className="filter-group">
              <label htmlFor="filter">Filter:</label>
              <select
                id="filter"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="filter-select"
              >
                <option value="All">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Loading state */}
          {loading && expenses.length === 0 && (
            <p className="empty-state">Loading expenses...</p>
          )}

          {/* Empty state */}
          {!loading && filteredExpenses.length === 0 && (
            <p className="empty-state">
              {filterCategory === 'All'
                ? 'No expenses yet. Add your first one above! 👆'
                : `No expenses in the "${filterCategory}" category.`}
            </p>
          )}

          {/* The list of expense cards */}
          <ul className="expense-list">
            {filteredExpenses.map((expense) => (
              <li key={expense._id} className="expense-item">

                {/* Left side: category badge + title + date */}
                <div className="expense-info">
                  <span
                    className="category-badge"
                    style={{ backgroundColor: categoryColors[expense.category] }}
                  >
                    {expense.category}
                  </span>
                  <div>
                    <p className="expense-title">{expense.title}</p>
                    <p className="expense-date">{formatDate(expense.date)}</p>
                  </div>
                </div>

                {/* Right side: amount + buttons */}
                <div className="expense-actions">
                  <span className="expense-amount">Rs. {expense.amount.toFixed(2)}</span>
                  <button
                    className="btn btn-edit"
                    onClick={() => handleEdit(expense)}
                    title="Edit this expense"
                    id={`edit-${expense._id}`}
                  >
                    ✏️
                  </button>
                  <button
                    className="btn btn-delete"
                    onClick={() => deleteExpense(expense._id)}
                    title="Delete this expense"
                    id={`delete-${expense._id}`}
                  >
                    🗑️
                  </button>
                </div>

              </li>
            ))}
          </ul>

          {/* Filtered total (if filtering) */}
          {filterCategory !== 'All' && filteredExpenses.length > 0 && (
            <div className="filtered-total">
              {filterCategory} total: Rs.{' '}
              {filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
            </div>
          )}

        </section>
      </main>
    </div>
  );
}

export default App;
