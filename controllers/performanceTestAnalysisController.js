const Attempt = require("../models/Attempt");
const User = require("../models/User");
const Test = require("../models/Test");
const Question = require("../models/Question");

exports.getTestAnalysis = async (req, res) => {
  try {
    const { testId, userId } = req.query;
    if (!testId || !userId) {
      return res
        .status(400)
        .json({ message: "testId and userId are required" });
    }
    // Find attempt
    const attempt = await Attempt.findOne({ testId, studentId: userId })
      .populate("studentId", "name email")
      .populate("testId", "title")
      .lean();
    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }
    // Get all questions for the test
    const questions = await Question.find({ testId }).lean();
    // Build analysis array
    const answerMap = new Map();
    attempt.answers.forEach((ans) => {
      answerMap.set(ans.questionId.toString(), ans);
    });
    const analysis = questions.map((q, idx) => {
      const ans = answerMap.get(q._id.toString());
      let selectedOption = -1;
      let isCorrect = false;
      if (ans) {
        selectedOption = q.options.indexOf(ans.selectedOption);
        isCorrect = ans.isCorrect;
      }
      const correctOption = q.options.indexOf(q.correctAnswer);
      return {
        questionId: q._id,
        questionText: q.questionText,
        options: q.options,
        selectedOption,
        correctOption,
        isCorrect,
        explanation: q.explanation || "",
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        difficulty: q.difficulty,
      };
    });
    // Prepare response
    res.json({
      data: {
        testTitle: attempt.testId.title,
        student: {
          name: attempt.studentId.name,
          email: attempt.studentId.email,
        },
        correctCount: attempt.correctAnswers,
        totalQuestions: attempt.totalQuestions,
        analysis,
      },
    });
  } catch (err) {
    console.error("Test analysis error:", err);
    res.status(500).json({ message: "Failed to fetch test analysis." });
  }
};
