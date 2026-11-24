// ============================================================
// server.js  –  Main entry point for the Express backend
// ------------------------------------------------------------
// This file:
//   1. Loads environment variables from .env
//   2. Connects to MongoDB using Mongoose
//   3. Sets up Express middleware (cors, json parsing)
//   4. Mounts all API routes under /api/expenses
//   5. Starts listening on the configured PORT
// ============================================================

// Load values from .env into process.env
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// Import the Expense model (the MongoDB schema blueprint)
const Expense = require("./models/Expense");

// ── App setup ────────────────────────────────────────────────
const app = express();

// Allow requests from any origin (needed for the React frontend)
app.use(cors());

// Parse incoming request bodies as JSON
app.use(express.json());

// ── Helper: format validation errors into a readable string ──
// Mongoose validation errors are stored in err.errors object.
// This helper extracts all error messages into one string.
function getValidationMessage(err) {
  return Object.values(err.errors)
    .map((e) => e.message)
    .join(", ");
}

// ============================================================
// ROUTES
// ============================================================

// ── GET /api/expenses ────────────────────────────────────────
// Returns all expenses, sorted by date (newest first)
app.get("/api/expenses", async (req, res) => {
  try {
    // -1 means descending (newest date first)
    const expenses = await Expense.find().sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

// ── POST /api/expenses ───────────────────────────────────────
// Creates a new expense from the request body
// Returns 201 (Created) on success, 400 (Bad Request) if validation fails
app.post("/api/expenses", async (req, res) => {
  try {
    // Create a new Expense document with data from the request body
    const expense = new Expense({
      title: req.body.title,
      amount: req.body.amount,
      category: req.body.category,
      date: req.body.date, // optional; defaults to now
    });

    // Save it to the database (Mongoose validates before saving)
    const saved = await expense.save();

    // 201 = "Created" – the standard status code for new resources
    res.status(201).json(saved);
  } catch (err) {
    // Mongoose validation error (e.g., missing title, negative amount)
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: getValidationMessage(err) });
    }
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

// ── PUT /api/expenses/:id ────────────────────────────────────
// Updates an existing expense by its MongoDB _id
// { new: true }          → return the updated document (not the old one)
// { runValidators: true } → still run schema validation on the new data
app.put("/api/expenses/:id", async (req, res) => {
  try {
    const updated = await Expense.findByIdAndUpdate(
      req.params.id,       // which document to update
      {
        title: req.body.title,
        amount: req.body.amount,
        category: req.body.category,
        date: req.body.date,
      },
      { new: true, runValidators: true }
    );

    // If no document was found with that id, return 404
    if (!updated) {
      return res.status(404).json({ error: "Expense not found" });
    }

    res.json(updated);
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: getValidationMessage(err) });
    }
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

// ── DELETE /api/expenses/:id ─────────────────────────────────
// Deletes an expense by its MongoDB _id
app.delete("/api/expenses/:id", async (req, res) => {
  try {
    const deleted = await Expense.findByIdAndDelete(req.params.id);

    // If nothing was found with that id, return 404
    if (!deleted) {
      return res.status(404).json({ error: "Expense not found" });
    }

    // Return the deleted document so the client knows what was removed
    res.json({ message: "Expense deleted", expense: deleted });
  } catch (err) {
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

// ============================================================
// DATABASE → SERVER startup
// Connect to MongoDB first, THEN start listening for requests.
// This prevents the app from accepting requests before the DB is ready.
// ============================================================
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1); // exit with error code so nodemon shows the problem
  });
