const {
  getTestAnalysis,
} = require("../controllers/performanceTestAnalysisController");
const express = require("express");
const router = express.Router();
const {
  getStudentPerformance,
  getTestPerformance,
  getOverallAnalytics,
} = require("../controllers/performanceController");
const {
  getAllStudentsTests,
} = require("../controllers/studentAnalysisController");
const authenticateUser = require("../middleware/authMiddleware");

// More specific routes should come first
router.get("/analytics", getOverallAnalytics);
router.get("/all-students-tests", authenticateUser, getAllStudentsTests);
router.get("/test-analysis", authenticateUser, getTestAnalysis);
router.get("/student/:studentId/test/:testId", authenticateUser, getTestPerformance);
router.get("/student/:studentId", authenticateUser, getStudentPerformance);

module.exports = router;
