const Test = require("../models/Test");
const Question = require("../models/Question");

exports.createTest = async (req, res) => {
  try {
    const { categoryId, title, examType, duration, totalMarks, questionCount } =
      req.body;

    // Validation
    if (
      !categoryId ||
      !title ||
      !examType ||
      !duration ||
      !totalMarks ||
      !questionCount
    ) {
      return res.status(400).json({
        error:
          "All fields are required: categoryId, title, examType, duration, totalMarks, questionCount",
      });
    }

    if (!categoryId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid category ID format" });
    }

    // Check admin role
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can create tests" });
    }

    const test = new Test({
      categoryId,
      title: title.trim(),
      examType: examType.trim(),
      duration,
      totalMarks,
      questionCount,
    });

    await test.save();
    res.status(201).json({
      message: "Test created successfully",
      test,
    });
  } catch (err) {
    console.error("Create test error:", err);
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: errors.join(", ") });
    }
    res.status(500).json({ error: "Failed to create test" });
  }
};

exports.getAllTests = async (req, res) => {
  try {
    const { page = 1, limit = 10, examType, isActive } = req.query;
    const query = {};

    if (examType) query.examType = new RegExp(examType, "i");
    if (isActive !== undefined) query.isActive = isActive === "true";

    const tests = await Test.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Test.countDocuments(query);

    res.json({
      tests,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
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

    const test = await Test.findById(id);
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
