const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  getProfile,
  changePassword,
  getAllUsers,
  forgotPassword,
  resetPassword,
  testEmail,
} = require("../controllers/authController");
const authenticateUser = require("../middleware/authMiddleware");

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/test-email", testEmail); // Remove in production

// Protected routes
router.get("/profile", authenticateUser, getProfile);
router.put("/change-password", authenticateUser, changePassword);
router.get("/users", authenticateUser, getAllUsers);

module.exports = router;
