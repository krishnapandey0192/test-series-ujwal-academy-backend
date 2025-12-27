const Question = require("../models/Question");
const Test = require("../models/Test");
const crypto = require("crypto");
const { parseExcelFile } = require("../utils/uploadExcel");
const fs = require("fs");
const path = require("path");

// exports.getQuestionsByTest = async (req, res) => {
//   try {
//     const { testId } = req.params;
//     const { includeAnswers = false } = req.query;

//     if (!testId.match(/^[0-9a-fA-F]{24}$/)) {
//       return res.status(400).json({ error: "Invalid test ID format" });
//     }

//     // Check if test exists
//     const test = await Test.findById(testId);
//     if (!test) {
//       return res.status(404).json({ error: "Test not found" });
//     }

//     let questions = await Question.find({ testId })
//       .sort({ createdAt: 1 })
//       .lean();

//     // For students, hide correct answers and explanations unless specified
//     if (req.user.role === "student" && includeAnswers !== "true") {
//       questions = questions.map((q) => {
//         const { correctAnswer, explanation, ...questionWithoutAnswer } = q;
//         return questionWithoutAnswer;
//       });
//     }

//     res.json({
//       questions,
//       total: questions.length,
//       testTitle: test.title,
//       duration: test.duration,
//     });
//   } catch (err) {
//     console.error("Get questions error:", err);
//     res.status(500).json({ error: "Failed to retrieve questions" });
//   }
// };

exports.getQuestionsByTest = async (req, res) => {
  try {
    const { testId } = req.params;
    const { includeAnswers = false } = req.query;

    if (!testId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid test ID format" });
    }

    const test = await Test.findById(testId).lean();
    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    let questions = await Question.find({ testId })
      .sort({ sequence: 1 }) // ✅ FIXED
      .lean();

    const showAnswers =
      req.user.role === "admin" || includeAnswers === "true";

    // Hide answers for students
    if (req.user.role === "student" && !showAnswers) {
      questions = questions.map(({ correctAnswer, explanation, ...rest }) => rest);
    }

    res.json({
      questions,
      total: questions.length,
      testTitle: test.title,
      duration: test.duration,
    });
  } catch (err) {
    console.error("Get questions error:", err);
    res.status(500).json({ error: "Failed to retrieve questions" });
  }
};

exports.addQuestion = async (req, res) => {
  try {
    // Check admin role
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can add questions" });
    }

    // If a file is provided, treat this as bulk upload
    if (req.file) {
      return exports.bulkUploadQuestions(req, res);
    }

    const {
      testId,
      section,
      questionText,
      options,
      correctAnswer,
      explanation,
      marks,
      negativeMarks,
      difficulty,
    } = req.body;

    // Validation
    if (
      !testId ||
      !section ||
      !questionText ||
      !options ||
      !correctAnswer ||
      marks === undefined
    ) {
      return res.status(400).json({
        error:
          "Required fields: testId, section, questionText, options, correctAnswer, marks",
      });
    }

    if (!testId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid test ID format" });
    }

    // Check if test exists
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    // Validate options array
    if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
      return res
        .status(400)
        .json({ error: "Options must be an array with 2-6 items" });
    }

    // Validate correct answer
    if (!options.includes(correctAnswer)) {
      return res
        .status(400)
        .json({ error: "Correct answer must be one of the provided options" });
    }

    const question = new Question({
      testId,
      section: section.trim(),
      questionText: questionText.trim(),
      options: options.map((opt) => opt.trim()),
      correctAnswer: correctAnswer.trim(),
      explanation: explanation ? explanation.trim() : "",
      marks,
      negativeMarks: negativeMarks || 0,
      difficulty: difficulty || "medium",
    });

    await question.save();

    // Update test question count
    const questionCount = await Question.countDocuments({ testId });
    await Test.findByIdAndUpdate(testId, { questionCount });

    res.status(201).json({
      message: "Question added successfully",
      question,
    });
  } catch (err) {
    console.error("Add question error:", err);
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: errors.join(", ") });
    }
    res.status(500).json({ error: "Failed to add question" });
  }
};


exports.bulkUploadQuestions = async (req, res) => {
  try {
    // Check admin role
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Only admins can upload questions" });
    }

    const { testId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "Excel file is required" });
    }

    if (!testId || !testId.match(/^[0-9a-fA-F]{24}$/)) {
      fs.existsSync(file.path) && fs.unlinkSync(file.path);
      return res.status(400).json({ error: "Invalid test ID" });
    }

    // Check if test exists
    const test = await Test.findById(testId);
    if (!test) {
      fs.existsSync(file.path) && fs.unlinkSync(file.path);
      return res.status(404).json({ error: "Test not found" });
    }

    // Validate file type
    const allowedTypes = [".xlsx", ".xls"];
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (!allowedTypes.includes(fileExt)) {
      fs.existsSync(file.path) && fs.unlinkSync(file.path);
      return res
        .status(400)
        .json({ error: "Only Excel files (.xlsx, .xls) are allowed" });
    }

    // 🔍 Check if questions already exist
    const existingCount = await Question.countDocuments({ testId });

    // Parse Excel
    let questions;
    try {
      questions = parseExcelFile(file.path);
    } catch {
      fs.existsSync(file.path) && fs.unlinkSync(file.path);
      return res.status(400).json({
        error: "Failed to parse Excel file",
      });
    }

    fs.existsSync(file.path) && fs.unlinkSync(file.path);

    if (!questions || questions.length === 0) {
      return res
        .status(400)
        .json({ error: "No questions found in the Excel file" });
    }

    const uploadBatchId = crypto.randomUUID();
    const formattedQuestions = [];
    const errors = [];

    questions.forEach((q, index) => {
      const rowNumber = index + 2;

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

      if (!q.correctAnswer || !options.includes(q.correctAnswer)) {
        errors.push(
          `Row ${rowNumber}: Correct answer must be one of the options`
        );
        return;
      }

      formattedQuestions.push({
        testId,
        uploadBatchId,
        sequence: q.sequence ?? index + 1,
        section: q.section || "General",
        questionText: q.questionText.toString().trim(),
        options: options.map((o) => o.toString().trim()),
        correctAnswer: q.correctAnswer.toString().trim(),
        explanation: q.explanation ? q.explanation.toString().trim() : "",
        marks: parseFloat(q.marks) || 1,
        negativeMarks: parseFloat(q.negativeMarks) || 0,
        difficulty: q.difficulty || "medium",
      });
    });

    if (errors.length) {
      return res.status(400).json({
        error: "Validation errors found",
        details: errors,
      });
    }

    // 1️⃣ INSERT NEW QUESTIONS FIRST (SAFE)
    await Question.insertMany(formattedQuestions);

    // 2️⃣ DELETE OLD QUESTIONS ONLY IF THEY EXIST
    if (existingCount > 0) {
      await Question.deleteMany({
        testId,
        uploadBatchId: { $ne: uploadBatchId },
      });
    }

    // 3️⃣ CLEAN TEMP FLAG
    await Question.updateMany(
      { testId, uploadBatchId },
      { $unset: { uploadBatchId: 1 } }
    );

    // 4️⃣ UPDATE TEST META
    await Test.findByIdAndUpdate(testId, {
      questionCount: formattedQuestions.length,
    });

    res.status(201).json({
      message:
        existingCount > 0
          ? "Questions replaced successfully"
          : "Questions uploaded successfully",
      total: formattedQuestions.length,
      testId,
    });
  } catch (err) {
    console.error("Bulk upload error:", err);

    // ❗ FAIL-SAFE: old questions still exist
    res.status(500).json({
      error: "Upload failed. Existing questions are safe.",
    });
  }
};


exports.updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    // Check admin role
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Only admins can update questions" });
    }

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid question ID format" });
    }

    const question = await Question.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    res.json({
      message: "Question updated successfully",
      question,
    });
  } catch (err) {
    console.error("Update question error:", err);
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: errors.join(", ") });
    }
    res.status(500).json({ error: "Failed to update question" });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    // Check admin role
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Only admins can delete questions" });
    }

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid question ID format" });
    }

    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    await Question.findByIdAndDelete(id);

    // Update test question count
    const questionCount = await Question.countDocuments({
      testId: question.testId,
    });
    await Test.findByIdAndUpdate(question.testId, { questionCount });

    res.json({ message: "Question deleted successfully" });
  } catch (err) {
    console.error("Delete question error:", err);
    res.status(500).json({ error: "Failed to delete question" });
  }
};
