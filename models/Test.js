// models/Test.js
const mongoose = require("mongoose");

const testSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    subcategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
      default: null,
    },
    title: {
      type: String,
      required: [true, "Test title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters long"],
    },
    examType: {
      type: String,
      required: [true, "Exam type is required"],
      trim: true,
    },
    duration: {
      type: Number,
      required: [true, "Duration is required"],
      min: [1, "Duration must be at least 1 minute"],
    },
    totalMarks: {
      type: Number,
      required: [true, "Total marks is required"],
      min: [1, "Total marks must be at least 1"],
    },
    questionCount: {
      type: Number,
      required: [true, "Question count is required"],
      min: [1, "Must have at least 1 question"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Test", testSchema);
