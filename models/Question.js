// models/Question.js
const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: [true, "Test ID is required"],
    },
    sequence: {
      type: Number,
      required: true,
    },
    section: {
      type: String,
      required: [true, "Section is required"],
      trim: true,
    },
    questionText: {
      type: String,
      required: [true, "Question text is required"],
      trim: true,
      minlength: [10, "Question text must be at least 10 characters long"],
    },
    options: {
      type: [String],
      required: [true, "Options are required"],
      validate: {
        validator: function (v) {
          return v && v.length >= 2 && v.length <= 6;
        },
        message: "Must have between 2 and 6 options",
      },
    },
    correctAnswer: {
      type: String,
      required: [true, "Correct answer is required"],
      validate: {
        validator: function (v) {
          return this.options && this.options.includes(v);
        },
        message: "Correct answer must be one of the provided options",
      },
    },
    explanation: {
      type: String,
      trim: true,
    },
    marks: {
      type: Number,
      required: [true, "Marks are required"],
      min: [0.25, "Marks must be at least 0.25"],
    },
    negativeMarks: {
      type: Number,
      default: 0,
      min: [0, "Negative marks cannot be less than 0"],
    },
    uploadBatchId: {
      type: String,
      index: true,
    },
    difficulty: {
      type: String,
      enum: {
        values: ["easy", "medium", "hard"],
        message: "Difficulty must be easy, medium, or hard",
      },
      default: "medium",
    },
  },

  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Question", questionSchema);
