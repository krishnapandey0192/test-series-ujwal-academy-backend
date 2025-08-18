const Attempt = require("../models/Attempt");
const Performance = require("../models/Performance");
const Test = require("../models/Test");

exports.getStudentPerformance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const currentUserId = req.user.userId;

    // Students can only view their own performance, admins can view any
    if (req.user.role === "student" && studentId !== currentUserId) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!studentId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid student ID format" });
    }

    // Get performance record
    let performance = await Performance.findOne({ studentId });

    if (!performance) {
      // Create initial performance record
      performance = new Performance({ studentId });
      await performance.save();
    }

    // Get recent attempts for additional insights
    const recentAttempts = await Attempt.find({ studentId })
      .populate("testId", "title examType totalMarks")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Calculate additional statistics
    const attemptsByExamType = {};
    const monthlyProgress = {};

    for (const attempt of recentAttempts) {
      if (attempt.testId) {
        // Group by exam type
        const examType = attempt.testId.examType;
        if (!attemptsByExamType[examType]) {
          attemptsByExamType[examType] = [];
        }
        attemptsByExamType[examType].push({
          score: attempt.score,
          percentage: (
            (attempt.score / attempt.testId.totalMarks) *
            100
          ).toFixed(2),
          date: attempt.createdAt,
        });

        // Group by month
        const month = new Date(attempt.createdAt).toISOString().slice(0, 7);
        if (!monthlyProgress[month]) {
          monthlyProgress[month] = { totalScore: 0, count: 0 };
        }
        monthlyProgress[month].totalScore += attempt.score;
        monthlyProgress[month].count += 1;
      }
    }

    res.json({
      studentId,
      performance: {
        totalTests: performance.totalTests,
        totalScore: performance.totalScore,
        averageScore: parseFloat(performance.averageScore.toFixed(2)),
        topScore: performance.topScore,
        weakAreas: performance.weakAreas,
        strongAreas: performance.strongAreas,
        lastTestDate: performance.lastTestDate,
        testHistory: performance.testHistory,
      },
      insights: {
        recentAttempts,
        attemptsByExamType,
        monthlyProgress: Object.entries(monthlyProgress).map(
          ([month, data]) => ({
            month,
            averageScore: (data.totalScore / data.count).toFixed(2),
            testsAttempted: data.count,
          })
        ),
      },
    });
  } catch (err) {
    console.error("Get student performance error:", err);
    res.status(500).json({ error: "Failed to retrieve student performance" });
  }
};

exports.getTestPerformance = async (req, res) => {
  try {
    const { studentId, testId } = req.params;
    const currentUserId = req.user.userId;

    // Students can only view their own performance, admins can view any
    if (req.user.role === "student" && studentId !== currentUserId) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (
      !studentId.match(/^[0-9a-fA-F]{24}$/) ||
      !testId.match(/^[0-9a-fA-F]{24}$/)
    ) {
      return res
        .status(400)
        .json({ error: "Invalid student ID or test ID format" });
    }

    const attempt = await Attempt.findOne({ studentId, testId })
      .populate("testId", "title examType totalMarks duration")
      .populate(
        "answers.questionId",
        "questionText options correctAnswer explanation section difficulty"
      )
      .lean();

    if (!attempt) {
      return res.status(404).json({ error: "Test attempt not found" });
    }

    // Calculate section-wise performance
    const sectionPerformance = {};
    const difficultyPerformance = { easy: 0, medium: 0, hard: 0 };
    const difficultyTotal = { easy: 0, medium: 0, hard: 0 };

    for (const answer of attempt.answers) {
      if (answer.questionId) {
        const section = answer.questionId.section;
        const difficulty = answer.questionId.difficulty;

        // Section performance
        if (!sectionPerformance[section]) {
          sectionPerformance[section] = { correct: 0, total: 0 };
        }
        sectionPerformance[section].total += 1;
        if (answer.isCorrect) {
          sectionPerformance[section].correct += 1;
        }

        // Difficulty performance
        difficultyTotal[difficulty] += 1;
        if (answer.isCorrect) {
          difficultyPerformance[difficulty] += 1;
        }
      }
    }

    const percentage = attempt.testId
      ? ((attempt.score / attempt.testId.totalMarks) * 100).toFixed(2)
      : 0;
    const timeEfficiency = attempt.testId
      ? ((attempt.timeTaken / (attempt.testId.duration * 60)) * 100).toFixed(2)
      : 0;

    res.json({
      attempt: {
        ...attempt,
        percentage,
        timeEfficiency: `${timeEfficiency}%`,
      },
      analytics: {
        sectionPerformance: Object.entries(sectionPerformance).map(
          ([section, data]) => ({
            section,
            correct: data.correct,
            total: data.total,
            percentage: ((data.correct / data.total) * 100).toFixed(2),
          })
        ),
        difficultyPerformance: Object.entries(difficultyPerformance).map(
          ([difficulty, correct]) => ({
            difficulty,
            correct,
            total: difficultyTotal[difficulty],
            percentage:
              difficultyTotal[difficulty] > 0
                ? ((correct / difficultyTotal[difficulty]) * 100).toFixed(2)
                : 0,
          })
        ),
      },
    });
  } catch (err) {
    console.error("Get test performance error:", err);
    res.status(500).json({ error: "Failed to retrieve test performance" });
  }
};

exports.getOverallAnalytics = async (req, res) => {
  try {
    // Only admins can view overall analytics
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }

    const totalTests = await Test.countDocuments();
    const totalAttempts = await Attempt.countDocuments();
    const totalStudents = await Performance.countDocuments();

    // Get top performers
    const topPerformers = await Performance.find()
      .populate("studentId", "name email")
      .sort({ averageScore: -1 })
      .limit(10)
      .lean();

    // Get test popularity
    const testPopularity = await Attempt.aggregate([
      {
        $group: {
          _id: "$testId",
          attemptCount: { $sum: 1 },
          averageScore: { $avg: "$score" },
        },
      },
      {
        $lookup: {
          from: "tests",
          localField: "_id",
          foreignField: "_id",
          as: "testInfo",
        },
      },
      {
        $unwind: "$testInfo",
      },
      {
        $sort: { attemptCount: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    res.json({
      overview: {
        totalTests,
        totalAttempts,
        totalStudents,
      },
      topPerformers: topPerformers.map((p) => ({
        student: p.studentId,
        averageScore: parseFloat(p.averageScore.toFixed(2)),
        totalTests: p.totalTests,
        topScore: p.topScore,
      })),
      popularTests: testPopularity.map((t) => ({
        test: {
          id: t._id,
          title: t.testInfo.title,
          examType: t.testInfo.examType,
        },
        attemptCount: t.attemptCount,
        averageScore: parseFloat(t.averageScore.toFixed(2)),
      })),
    });
  } catch (err) {
    console.error("Get overall analytics error:", err);
    res.status(500).json({ error: "Failed to retrieve analytics" });
  }
};
