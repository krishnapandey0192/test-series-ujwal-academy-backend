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

// More specific routes should come first
router.get("/analytics", getOverallAnalytics);
router.get("/all-students-tests", getAllStudentsTests);
router.get("/student/:studentId/test/:testId", getTestPerformance);
router.get("/student/:studentId", getStudentPerformance);

module.exports = router;
