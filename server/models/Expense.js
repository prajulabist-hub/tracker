// ============================================================
// Expense Model
// ------------------------------------------------------------
// This file defines the shape of an "expense" document
// that will be stored in MongoDB using Mongoose.
// Think of this like a blueprint (schema) for every record.
// ============================================================

const mongoose = require("mongoose");

// Define the schema (structure) for an expense document
const expenseSchema = new mongoose.Schema(
  {
    // Title of the expense (e.g., "Lunch", "Bus fare")
    title: {
      type: String,
      required: [true, "Title is required"], // cannot be empty
      trim: true, // removes extra spaces at start/end
    },

    // How much was spent (must be 0 or more)
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },

    // Which category this expense belongs to
    category: {
      type: String,
      enum: ["Food", "Transport", "Study", "Entertainment", "Other"], // only these values allowed
      default: "Other", // if not specified, defaults to "Other"
    },

    // When the expense happened (auto-set to now if not provided)
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // Mongoose automatically adds "createdAt" and "updatedAt" timestamps
    timestamps: true,
  }
);

// Create and export the model based on the schema
// "Expense" becomes the collection name "expenses" in MongoDB
module.exports = mongoose.model("Expense", expenseSchema);
