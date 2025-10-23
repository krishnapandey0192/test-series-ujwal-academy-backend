// models/Subcategory.js
const mongoose = require("mongoose");

const subcategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Subcategory name is required"],
      trim: true,
      minlength: [2, "Subcategory name must be at least 2 characters long"],
    },
    description: {
      type: String,
      trim: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category ID is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure unique subcategory names within a category
subcategorySchema.index({ name: 1, categoryId: 1 }, { unique: true });

module.exports = mongoose.model("Subcategory", subcategorySchema);
