const Attempt = require("../models/Attempt");
const Question = require("../models/Question");
const Test = require("../models/Test");
const Performance = require("../models/Performance");

exports.submitAttempt = async (req, res) => {
  try {
    const { testId, answers, timeTaken } = req.body;
    const studentId = req.user.userId;

    // Validation
    if (!testId || !answers || !timeTaken) {
      return res.status(400).json({
        error: "Required fields: testId, answers, timeTaken",
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

    // Check if student already attempted this test
    const existingAttempt = await Attempt.findOne({ studentId, testId });
    if (existingAttempt) {
      return res
        .status(409)
        .json({ error: "You have already attempted this test" });
    }

    // Get all questions for this test
    const questions = await Question.find({ testId });
    const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

    let score = 0;
    let correctAnswers = 0;
    let wrongAnswers = 0;
    const processedAnswers = [];

    // Process each answer
    for (const answer of answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) continue;

      const isCorrect = answer.selectedOption === question.correctAnswer;
      let marksAwarded = 0;

      if (isCorrect) {
        marksAwarded = question.marks;
        correctAnswers++;
      } else if (answer.selectedOption) {
        marksAwarded = -question.negativeMarks;
        wrongAnswers++;
      }

      score += marksAwarded;

      processedAnswers.push({
        questionId: answer.questionId,
        selectedOption: answer.selectedOption,
        isCorrect,
        marksAwarded,
      });
    }

    const unanswered = questions.length - (correctAnswers + wrongAnswers);

    // Create attempt
    const attempt = new Attempt({
      studentId,
      testId,
      answers: processedAnswers,
      score: Math.max(0, score), // Ensure score is not negative
      timeTaken,
      totalQuestions: questions.length,
      correctAnswers,
      wrongAnswers,
      unanswered,
    });

    await attempt.save();

    // Update student performance
    await updateStudentPerformance(studentId, attempt, test);

    res.status(201).json({
      message: "Attempt submitted successfully",
      attempt: {
        id: attempt._id,
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
        correctAnswers: attempt.correctAnswers,
        wrongAnswers: attempt.wrongAnswers,
        unanswered: attempt.unanswered,
        percentage: ((attempt.score / test.totalMarks) * 100).toFixed(2),
      },
    });
  } catch (err) {
    console.error("Submit attempt error:", err);
    res.status(500).json({ error: "Failed to submit attempt" });
  }
};

exports.getStudentAttempts = async (req, res) => {
  try {
    const studentId = req.params.id;
    const currentUserId = req.user.userId;

    // Students can only view their own attempts, admins can view any
    if (req.user.role === "student" && studentId !== currentUserId) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!studentId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid student ID format" });
    }

    const attempts = await Attempt.find({ studentId })
      .populate("testId", "title examType totalMarks")
      .sort({ createdAt: -1 })
      .lean();

    const formattedAttempts = attempts.map((attempt) => ({
      ...attempt,
      percentage: attempt.testId
        ? ((attempt.score / attempt.testId.totalMarks) * 100).toFixed(2)
        : 0,
    }));

    res.json({
      attempts: formattedAttempts,
      total: attempts.length,
    });
  } catch (err) {
    console.error("Get student attempts error:", err);
    res.status(500).json({ error: "Failed to retrieve attempts" });
  }
};

exports.getAttemptDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.userId;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid attempt ID format" });
    }

    const attempt = await Attempt.findById(id)
      .populate("testId", "title examType totalMarks")
      .populate(
        "answers.questionId",
        "questionText options correctAnswer explanation"
      )
      .lean();

    if (!attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    // Students can only view their own attempts, admins can view any
    if (
      req.user.role === "student" &&
      attempt.studentId.toString() !== currentUserId
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    const percentage = attempt.testId
      ? ((attempt.score / attempt.testId.totalMarks) * 100).toFixed(2)
      : 0;

    res.json({
      attempt: {
        ...attempt,
        percentage,
      },
    });
  } catch (err) {
    console.error("Get attempt details error:", err);
    res.status(500).json({ error: "Failed to retrieve attempt details" });
  }
};

// Helper function to update student performance
async function updateStudentPerformance(studentId, attempt, test) {
  try {
    let performance = await Performance.findOne({ studentId });

    if (!performance) {
      performance = new Performance({ studentId });
    }

    performance.totalTests += 1;
    performance.totalScore += attempt.score;
    performance.averageScore = performance.totalScore / performance.totalTests;
    performance.topScore = Math.max(performance.topScore, attempt.score);
    performance.lastTestDate = new Date();

    // Add to test history
    performance.testHistory.push({
      testId: attempt.testId,
      score: attempt.score,
      percentage: (attempt.score / test.totalMarks) * 100,
      completedAt: new Date(),
    });

    // Keep only last 10 test records
    if (performance.testHistory.length > 10) {
      performance.testHistory = performance.testHistory.slice(-10);
    }

    await performance.save();
  } catch (err) {
    console.error("Update performance error:", err);
  }
}
