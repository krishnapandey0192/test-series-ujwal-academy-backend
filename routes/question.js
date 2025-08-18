const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

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
    cb(null, "questions-" + uniqueSuffix + path.extname(file.originalname));
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

const {
  getQuestionsByTest,
  addQuestion,
  updateQuestion,
  deleteQuestion,
} = require("../controllers/questionController");

const { createSampleTemplate } = require("../utils/uploadExcel");
const xlsx = require("xlsx");

// Routes
router.get("/:testId", getQuestionsByTest);
router.post("/", upload.single("file"), addQuestion);
router.put("/:id", updateQuestion);
router.delete("/:id", deleteQuestion);

// Route to download sample Excel template
router.get("/template/download", (req, res) => {
  try {
    const sampleData = createSampleTemplate();

    // Create workbook and worksheet
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(sampleData);

    // Add worksheet to workbook
    xlsx.utils.book_append_sheet(wb, ws, "Questions");

    // Generate buffer
    const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=question-upload-template.xlsx"
    );

    // Send file
    res.send(buffer);
  } catch (error) {
    console.error("Template generation error:", error);
    res.status(500).json({ error: "Failed to generate template" });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "File too large. Maximum size is 5MB." });
    }
    return res.status(400).json({ error: error.message });
  }

  if (error.message.includes("Excel files")) {
    return res.status(400).json({ error: error.message });
  }

  next(error);
});

module.exports = router;
