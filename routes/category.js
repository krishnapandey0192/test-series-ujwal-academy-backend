const express = require("express");
const router = express.Router();
const {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");
const authenticateUser = require("../middleware/authMiddleware");

// CRUD routes for category
router.post("/", authenticateUser, createCategory);
router.get("/", getAllCategories);
router.get("/:id", getCategoryById);
router.put("/:id", authenticateUser, updateCategory);
router.delete("/:id", authenticateUser, deleteCategory);

module.exports = router;
