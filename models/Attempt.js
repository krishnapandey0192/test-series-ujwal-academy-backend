// models/Attempt.js
const mongoose = require("mongoose");

const attemptSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student ID is required"],
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: [true, "Test ID is required"],
    },
    answers: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Question",
          required: true,
        },
        selectedOption: {
          type: String,
          required: true,
        },
        isCorrect: {
          type: Boolean,
          required: true,
        },
        marksAwarded: {
          type: Number,
          default: 0,
        },
      },
    ],
    score: {
      type: Number,
      required: [true, "Score is required"],
      min: [0, "Score cannot be negative"],
    },
    timeTaken: {
      type: Number,
      required: [true, "Time taken is required"],
      min: [0, "Time taken cannot be negative"],
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    correctAnswers: {
      type: Number,
      default: 0,
    },
    wrongAnswers: {
      type: Number,
      default: 0,
    },
    unanswered: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
attemptSchema.index({ studentId: 1, testId: 1 });

module.exports = mongoose.model("Attempt", attemptSchema);
