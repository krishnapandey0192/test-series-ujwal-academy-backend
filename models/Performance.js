// models/Performance.js
const mongoose = require("mongoose");

const performanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student ID is required"],
      unique: true,
    },
    totalTests: {
      type: Number,
      default: 0,
      min: [0, "Total tests cannot be negative"],
    },
    totalScore: {
      type: Number,
      default: 0,
      min: [0, "Total score cannot be negative"],
    },
    averageScore: {
      type: Number,
      default: 0,
      min: [0, "Average score cannot be negative"],
    },
    topScore: {
      type: Number,
      default: 0,
      min: [0, "Top score cannot be negative"],
    },
    weakAreas: {
      type: [String],
      default: [],
    },
    strongAreas: {
      type: [String],
      default: [],
    },
    lastTestDate: {
      type: Date,
    },
    testHistory: [
      {
        testId: { type: mongoose.Schema.Types.ObjectId, ref: "Test" },
        score: Number,
        percentage: Number,
        completedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Performance", performanceSchema);
