const Subcategory = require("../models/Subcategory");
const Category = require("../models/Category");
const Test = require("../models/Test");
const mongoose = require("mongoose");

// Create a new subcategory
exports.createSubcategory = async (req, res) => {
  try {
    // Check admin role
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Only admins can create subcategories" });
    }

    const { name, description, categoryId } = req.body;

    if (!name || !categoryId) {
      return res.status(400).json({
        error: "Subcategory name and category ID are required",
      });
    }

    // Extract _id if categoryId is an object (populated category)
    let categoryIdValue = categoryId;
    if (typeof categoryId === "object" && categoryId._id) {
      categoryIdValue = categoryId._id;
      console.log("Extracted _id from object in create:", categoryIdValue);
    }

    // Convert to string if needed
    categoryIdValue = String(categoryIdValue);

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(categoryIdValue)) {
      console.log(
        "Invalid categoryId in create:",
        categoryIdValue,
        "Type:",
        typeof categoryIdValue
      );
      return res.status(400).json({ error: "Invalid category ID format" });
    }

    // Check if category exists
    const category = await Category.findById(categoryIdValue);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    const subcategory = new Subcategory({
      name: name.trim(),
      description: description ? description.trim() : "",
      categoryId: categoryIdValue, // Mongoose will automatically convert to ObjectId
    });

    await subcategory.save();

    res.status(201).json({
      message: "Subcategory created successfully",
      subcategory,
    });
  } catch (err) {
    console.error("Create subcategory error:", err);
    if (err.code === 11000) {
      return res.status(409).json({
        error: "Subcategory name already exists in this category",
      });
    }
    res.status(500).json({ error: "Failed to create subcategory" });
  }
};

// Get all subcategories
exports.getAllSubcategories = async (req, res) => {
  try {
    // Accept both 'categoryId' and 'category' as query params
    const categoryId = req.query.categoryId || req.query.category;
    const query = {};
    let categoryObjectId = null;

    console.log("Request query params:", req.query);
    console.log("CategoryId received:", categoryId);

    // Filter by categoryId if provided
    if (categoryId) {
      // Validate MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        console.log("Invalid categoryId format:", categoryId);
        return res.status(400).json({ error: "Invalid category ID format" });
      }

      categoryObjectId = new mongoose.Types.ObjectId(categoryId);
      query.categoryId = categoryObjectId;

      console.log("Query built:", JSON.stringify(query));
      console.log("CategoryId ObjectId:", categoryObjectId);
    }

    console.log("Final query being executed:", query);

    const subcategories = await Subcategory.find(query)
      .populate("categoryId", "name")
      .sort({ name: 1 });

    console.log(`Found ${subcategories.length} subcategories`);
    if (subcategories.length > 0) {
      console.log("First subcategory categoryId:", subcategories[0].categoryId);
    }

    res.json({
      subcategories,
      total: subcategories.length,
      ...(categoryObjectId && {
        filteredBy: { categoryId: categoryObjectId.toString() },
      }),
    });
  } catch (err) {
    console.error("Get subcategories error:", err);
    res.status(500).json({ error: "Failed to retrieve subcategories" });
  }
};

// Get subcategories by category ID
exports.getSubcategoriesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ error: "Invalid category ID format" });
    }

    // Check if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    const categoryObjectId = new mongoose.Types.ObjectId(categoryId);
    const subcategories = await Subcategory.find({
      categoryId: categoryObjectId,
    }).sort({ name: 1 });

    res.json({
      category: {
        _id: category._id,
        name: category.name,
        description: category.description,
      },
      subcategories,
    });
  } catch (err) {
    console.error("Get subcategories by category error:", err);
    res.status(500).json({ error: "Failed to retrieve subcategories" });
  }
};

// Get single subcategory by ID
exports.getSubcategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid subcategory ID format" });
    }

    const subcategory = await Subcategory.findById(id).populate(
      "categoryId",
      "name description"
    );

    if (!subcategory) {
      return res.status(404).json({ error: "Subcategory not found" });
    }

    // Get all tests related to this subcategory
    const subcategoryObjectId = new mongoose.Types.ObjectId(id);
    const tests = await Test.find({ subcategoryId: subcategoryObjectId }).sort({
      createdAt: -1,
    });

    res.json({
      subcategory,
      tests,
      testCount: tests.length,
    });
  } catch (err) {
    console.error("Get subcategory error:", err);
    res.status(500).json({ error: "Failed to retrieve subcategory" });
  }
};

// Update subcategory
exports.updateSubcategory = async (req, res) => {
  try {
    // Check admin role
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Only admins can update subcategories" });
    }

    const { id } = req.params;
    const { name, description, categoryId } = req.body;

    // Log received data for debugging
    console.log("Update subcategory request:", {
      id,
      name,
      description,
      categoryId,
    });

    // Validate subcategory ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid subcategory ID format" });
    }

    // Build update data object
    const updateData = {
      updatedAt: new Date(),
    };

    // Add name if provided
    if (name) {
      updateData.name = name.trim();
    }

    // Add description if provided (including empty string)
    if (description !== undefined) {
      updateData.description = description.trim();
    }

    // If categoryId is being updated, validate and add it
    if (categoryId !== undefined && categoryId !== null && categoryId !== "") {
      console.log(
        "Validating categoryId:",
        categoryId,
        "Type:",
        typeof categoryId
      );

      // Extract _id if categoryId is an object (populated category)
      let categoryIdValue = categoryId;
      if (typeof categoryId === "object" && categoryId._id) {
        categoryIdValue = categoryId._id;
        console.log("Extracted _id from object:", categoryIdValue);
      }

      // Convert to string if needed
      categoryIdValue = String(categoryIdValue);

      // Validate MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(categoryIdValue)) {
        console.log("Invalid categoryId format detected:", categoryIdValue);
        return res.status(400).json({ error: "Invalid category ID format" });
      }

      const category = await Category.findById(categoryIdValue);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }

      updateData.categoryId = categoryIdValue; // Mongoose will handle the conversion
    }

    const subcategory = await Subcategory.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("categoryId", "name description");

    if (!subcategory) {
      return res.status(404).json({ error: "Subcategory not found" });
    }

    res.json({
      message: "Subcategory updated successfully",
      subcategory,
    });
  } catch (err) {
    console.error("Update subcategory error:", err);
    if (err.code === 11000) {
      return res.status(409).json({
        error: "Subcategory name already exists in this category",
      });
    }
    res.status(500).json({ error: "Failed to update subcategory" });
  }
};

// Delete subcategory
exports.deleteSubcategory = async (req, res) => {
  try {
    // Check admin role
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Only admins can delete subcategories" });
    }

    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid subcategory ID format" });
    }

    const subcategory = await Subcategory.findById(id);
    if (!subcategory) {
      return res.status(404).json({ error: "Subcategory not found" });
    }

    // Check if there are tests in this subcategory
    const subcategoryObjectId = new mongoose.Types.ObjectId(id);
    const testCount = await Test.countDocuments({
      subcategoryId: subcategoryObjectId,
    });

    if (testCount > 0) {
      // Optionally: delete all tests under this subcategory or prevent deletion
      // For now, we'll delete the tests
      await Test.deleteMany({ subcategoryId: subcategoryObjectId });
    }

    await Subcategory.findByIdAndDelete(id);

    res.json({
      message: "Subcategory and related tests deleted successfully",
      deletedTests: testCount,
    });
  } catch (err) {
    console.error("Delete subcategory error:", err);
    res.status(500).json({ error: "Failed to delete subcategory" });
  }
};
