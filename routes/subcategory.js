const express = require("express");
const router = express.Router();
const subcategoryController = require("../controllers/subcategoryController");
const authenticateUser = require("../middleware/authMiddleware");

// Create subcategory (admin only - checked in controller)
router.post("/", authenticateUser, subcategoryController.createSubcategory);

// Get all subcategories
router.get("/", subcategoryController.getAllSubcategories);

// Get subcategories by category ID
router.get(
  "/category/:categoryId",
  subcategoryController.getSubcategoriesByCategory
);

// Get single subcategory by ID with tests
router.get("/:id", subcategoryController.getSubcategoryById);

// Update subcategory (admin only - checked in controller)
router.put("/:id", authenticateUser, subcategoryController.updateSubcategory);

// Delete subcategory (admin only - checked in controller)
router.delete(
  "/:id",
  authenticateUser,
  subcategoryController.deleteSubcategory
);

module.exports = router;
