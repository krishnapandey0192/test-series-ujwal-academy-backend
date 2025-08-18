const express = require("express");
const router = express.Router();
const {
  submitAttempt,
  getStudentAttempts,
  getAttemptDetails,
} = require("../controllers/attemptController");

// More specific routes should come first
router.post("/submit", submitAttempt);
router.get("/student/:id", getStudentAttempts);
router.get("/details/:id", getAttemptDetails);

module.exports = router;
