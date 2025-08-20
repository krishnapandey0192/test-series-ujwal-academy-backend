const Category = require("../models/Category");
const Test = require("../models/Test");
const mongoose = require("mongoose");

exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Category name is required" });
    }
    const category = new Category({ name: name.trim(), description });
    await category.save();
    res
      .status(201)
      .json({ message: "Category created successfully", category });
  } catch (err) {
    console.error("Create category error:", err);
    if (err.code === 11000) {
      return res.status(409).json({ error: "Category name already exists" });
    }
    res.status(500).json({ error: "Failed to create category" });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ categories });
  } catch (err) {
    console.error("Get categories error:", err);
    res.status(500).json({ error: "Failed to retrieve categories" });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid category ID format" });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Convert string ID to ObjectId for proper matching
    const categoryObjectId = new mongoose.Types.ObjectId(id);

    // Get all tests related to this category with proper ObjectId matching
    const tests = await Test.find({ categoryId: categoryObjectId }).sort({
      createdAt: -1,
    });

    res.json({ category, tests });
  } catch (err) {
    console.error("Get category error:", err);
    res.status(500).json({ error: "Failed to retrieve category" });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid category ID format" });
    }
    const category = await Category.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json({ message: "Category updated successfully", category });
  } catch (err) {
    console.error("Update category error:", err);
    res.status(500).json({ error: "Failed to update category" });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid category ID format" });
    }
    // Optionally: delete all tests under this category
    await Test.deleteMany({ categoryId: id });
    await Category.findByIdAndDelete(id);
    res.json({ message: "Category and related tests deleted successfully" });
  } catch (err) {
    console.error("Delete category error:", err);
    res.status(500).json({ error: "Failed to delete category" });
  }
};
