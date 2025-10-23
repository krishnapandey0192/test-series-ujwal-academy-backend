const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  createTest,
  getAllTests,
  getTestById,
  updateTest,
  deleteTest,
} = require("../controllers/testController");
const authenticateUser = require("../middleware/authMiddleware");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "uploads/";
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      "test-questions-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

// File filter to only allow Excel files
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel", // .xls
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only Excel files (.xlsx, .xls) are allowed"), false);
  }
};

// Configure upload middleware
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Custom error handler for multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "UNEXPECTED_FIELD") {
      return res.status(400).json({
        error: `Unexpected file field. Expected field name: "questionsFile" or "file"`,
        details: `Received field: ${err.field}`,
      });
    }
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File size too large. Maximum size is 5MB",
      });
    }
    return res.status(400).json({
      error: "File upload error",
      details: err.message,
    });
  }
  next(err);
};

// Use upload.any() to accept any field name, then validate in controller
router.post("/",authenticateUser, upload.any(), handleMulterError, createTest);
router.get("/", getAllTests);

router.get("/:id", getTestById);
router.put("/:id",authenticateUser, updateTest);
router.delete("/:id",authenticateUser, deleteTest);

module.exports = router;
