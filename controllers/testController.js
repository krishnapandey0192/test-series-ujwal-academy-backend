const Test = require("../models/Test");
const Question = require("../models/Question");
const Subcategory = require("../models/Subcategory");
const mongoose = require("mongoose");
const { parseExcelFile } = require("../utils/uploadExcel");
const fs = require("fs");
const path = require("path");

exports.createTest = async (req, res) => {
  try {
    const {
      categoryId,
      subcategoryId,
      title,
      examType,
      duration,
      totalMarks,
      questionCount,
    } = req.body;

    // Handle file from upload.any() - check for file in req.files array
    let file = null;
    if (req.files && req.files.length > 0) {
      // Take the first file regardless of field name
      file = req.files[0];
    } else if (req.file) {
      // Fallback to req.file if using upload.single()
      file = req.file;
    }

    // Validation
    if (
      !categoryId ||
      !title ||
      !examType ||
      !duration ||
      !totalMarks ||
      !questionCount
    ) {
      // Clean up uploaded file if validation fails
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(400).json({
        error:
          "All fields are required: categoryId, title, examType, duration, totalMarks, questionCount",
      });
    }

    if (!categoryId.match(/^[0-9a-fA-F]{24}$/)) {
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(400).json({ error: "Invalid category ID format" });
    }

    // Validate subcategoryId if provided
    if (subcategoryId && !subcategoryId.match(/^[0-9a-fA-F]{24}$/)) {
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(400).json({ error: "Invalid subcategory ID format" });
    }

    // Check admin role
    if (req.user.role !== "admin") {
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(403).json({ error: "Only admins can create tests" });
    }

    // Create the test first
    const test = new Test({
      categoryId,
      subcategoryId: subcategoryId || null,
      title: title.trim(),
      examType: examType.trim(),
      duration,
      totalMarks,
      questionCount: parseInt(questionCount), // Use provided count initially
    });

    await test.save();

    // If Excel file is provided, parse and create questions
    let createdQuestions = [];
    if (file) {
      try {
        // Validate file type
        const allowedTypes = [".xlsx", ".xls"];
        const fileExt = path.extname(file.originalname).toLowerCase();
        if (!allowedTypes.includes(fileExt)) {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          // Delete the test since question upload failed
          await Test.findByIdAndDelete(test._id);
          return res
            .status(400)
            .json({ error: "Only Excel files (.xlsx, .xls) are allowed" });
        }

        // Parse Excel file
        let questions;
        try {
          questions = parseExcelFile(file.path);
        } catch (parseError) {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          // Delete the test since question upload failed
          await Test.findByIdAndDelete(test._id);
          return res.status(400).json({
            error: "Failed to parse Excel file. Please check the file format.",
          });
        }

        if (!questions || questions.length === 0) {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          // Delete the test since no questions found
          await Test.findByIdAndDelete(test._id);
          return res
            .status(400)
            .json({ error: "No questions found in the Excel file" });
        }

        const formattedQuestions = [];
        const errors = [];

        questions.forEach((q, index) => {
          const rowNumber = index + 2; // Assuming row 1 is headers

          // Validate required fields
          if (!q.questionText) {
            errors.push(`Row ${rowNumber}: Question text is required`);
            return;
          }

          const options = [
            q.option1,
            q.option2,
            q.option3,
            q.option4,
            q.option5,
            q.option6,
          ].filter(Boolean);

          if (options.length < 2) {
            errors.push(`Row ${rowNumber}: At least 2 options are required`);
            return;
          }

          if (!q.correctAnswer) {
            errors.push(`Row ${rowNumber}: Correct answer is required`);
            return;
          }

          if (!options.includes(q.correctAnswer)) {
            errors.push(
              `Row ${rowNumber}: Correct answer must be one of the provided options`
            );
            return;
          }

          formattedQuestions.push({
            testId: test._id,
            section: q.section || "General",
            questionText: q.questionText.toString().trim(),
            options: options.map((opt) => opt.toString().trim()),
            correctAnswer: q.correctAnswer.toString().trim(),
            explanation: q.explanation ? q.explanation.toString().trim() : "",
            marks: parseFloat(q.marks) || 1,
            negativeMarks: parseFloat(q.negativeMarks) || 0,
            difficulty: q.difficulty || "medium",
          });
        });

        // Clean up uploaded file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }

        if (errors.length > 0) {
          // Delete the test since question validation failed
          await Test.findByIdAndDelete(test._id);
          return res.status(400).json({
            error: "Validation errors found in Excel file",
            details: errors,
          });
        }

        if (formattedQuestions.length === 0) {
          // Delete the test since no valid questions found
          await Test.findByIdAndDelete(test._id);
          return res
            .status(400)
            .json({ error: "No valid questions found to upload" });
        }

        // Validate question count matches
        if (formattedQuestions.length !== parseInt(questionCount)) {
          // Delete the test since question count mismatch
          await Test.findByIdAndDelete(test._id);
          return res.status(400).json({
            error: `Question count mismatch. Expected ${questionCount} questions but found ${formattedQuestions.length} in Excel file`,
          });
        }

        // Insert questions
        createdQuestions = await Question.insertMany(formattedQuestions);

        // Update test question count
        test.questionCount = createdQuestions.length;
        await test.save();

        return res.status(201).json({
          message: "Test and questions created successfully",
          test,
          questionsCreated: createdQuestions.length,
          questions: createdQuestions,
        });
      } catch (fileError) {
        console.error("File processing error:", fileError);
        // Clean up file in case of error
        if (file && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        // Delete the test since question creation failed
        await Test.findByIdAndDelete(test._id);
        return res.status(500).json({
          error: "Failed to process questions file",
          details: fileError.message,
        });
      }
    } else {
      // No file provided, just return the test
      return res.status(201).json({
        message: "Test created successfully (without questions)",
        test,
        note: "You can add questions later using the bulk upload endpoint or add them individually",
      });
    }
  } catch (err) {
    console.error("Create test error:", err);

    // Clean up file in case of error
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    } else if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: errors.join(", ") });
    }
    res.status(500).json({ error: "Failed to create test" });
  }
};

exports.getAllTests = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      examType,
      isActive,
      categoryId,
      subcategoryId,
    } = req.query;

    // Validate required query params
    if (!categoryId || !subcategoryId) {
      return res.status(400).json({
        error: "Both categoryId and subcategoryId are required",
      });
    }

    // Validate IDs
    if (
      !mongoose.Types.ObjectId.isValid(categoryId) ||
      !mongoose.Types.ObjectId.isValid(subcategoryId)
    ) {
      return res
        .status(400)
        .json({ error: "Invalid category or subcategory ID" });
    }

    // Check subcategory relation
    const subcategory = await Subcategory.findById(subcategoryId).select(
      "categoryId"
    );
    if (!subcategory) {
      return res.status(404).json({ error: "Subcategory not found" });
    }

    // Ensure subcategory belongs to category
    if (subcategory.categoryId.toString() !== categoryId.toString()) {
      return res.json({
        tests: [],
        totalPages: 0,
        currentPage: Number(page),
        total: 0,
        message:
          "No tests found — subcategory does not belong to the given category",
      });
    }

    // Build query
    const query = {
      categoryId: new mongoose.Types.ObjectId(categoryId),
      subcategoryId: new mongoose.Types.ObjectId(subcategoryId),
    };

    if (examType) query.examType = new RegExp(examType, "i");
    if (isActive !== undefined) query.isActive = isActive === "true";

    // Debug log
    console.log("Final Test Query:", query);

    // Fetch tests
    const tests = await Test.find(query)
      .populate("categoryId", "name")
      .populate("subcategoryId", "name")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    const total = await Test.countDocuments(query);

    return res.json({
      tests,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      total,
    });
  } catch (err) {
    console.error("Get tests error:", err);
    res.status(500).json({ error: "Failed to retrieve tests" });
  }
};

exports.getTestById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid test ID format" });
    }

    const test = await Test.findById(id)
      .populate("categoryId", "name description")
      .populate("subcategoryId", "name description");

    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    res.json({ test });
  } catch (err) {
    console.error("Get test error:", err);
    res.status(500).json({ error: "Failed to retrieve test" });
  }
};

exports.updateTest = async (req, res) => {
  try {
    const { id } = req.params;

    // Check admin role
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can update tests" });
    }

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid test ID format" });
    }

    const test = await Test.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    res.json({
      message: "Test updated successfully",
      test,
    });
  } catch (err) {
    console.error("Update test error:", err);
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: errors.join(", ") });
    }
    res.status(500).json({ error: "Failed to update test" });
  }
};

exports.deleteTest = async (req, res) => {
  try {
    const { id } = req.params;

    // Check admin role
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can delete tests" });
    }

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid test ID format" });
    }

    const test = await Test.findById(id);
    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    // Delete associated questions
    await Question.deleteMany({ testId: id });

    // Delete the test
    await Test.findByIdAndDelete(id);

    res.json({ message: "Test and associated questions deleted successfully" });
  } catch (err) {
    console.error("Delete test error:", err);
    res.status(500).json({ error: "Failed to delete test" });
  }
};
