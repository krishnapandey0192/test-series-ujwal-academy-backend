const Attempt = require("../models/Attempt");
const User = require("../models/User");
const Test = require("../models/Test");

exports.getAllStudentsTests = async (req, res) => {
  try {
    const { testTitle, studentName } = req.query;
    // Build query for attempts
    let attemptQuery = {};
    let testQuery = {};
    let userQuery = {};

    if (testTitle) testQuery.title = new RegExp(testTitle, "i");
    if (studentName) userQuery.name = new RegExp(studentName, "i");

    // Find matching tests and users
    const tests = testTitle ? await Test.find(testQuery).select("_id") : [];
    const users = studentName ? await User.find(userQuery).select("_id") : [];

    if (tests.length > 0) {
      attemptQuery.testId = { $in: tests.map((t) => t._id) };
    }
    // If studentName is provided, filter by users, else show all attempts (including those without a student name)
    if (studentName) {
      if (users.length > 0) {
        attemptQuery.studentId = { $in: users.map((u) => u._id) };
      } else {
        // If no users match, return empty result
        return res.json({ data: [] });
      }
    }

    // Use aggregation for optimized query
    const pipeline = [
      { $match: attemptQuery },
      {
        $lookup: {
          from: "users",
          localField: "studentId",
          foreignField: "_id",
          as: "studentInfo",
        },
      },
      { $unwind: "$studentInfo" },
      {
        $match: {
          "studentInfo.name": { $exists: true, $ne: "" },
          "studentInfo.email": { $exists: true, $ne: "" },
        },
      },
      {
        $lookup: {
          from: "tests",
          localField: "testId",
          foreignField: "_id",
          as: "testInfo",
        },
      },
      { $unwind: "$testInfo" },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          _id: 0,
          studentName: "$studentInfo.name",
          email: "$studentInfo.email",
          testTitle: "$testInfo.title",
          examType: "$testInfo.examType",
          duration: "$testInfo.duration",
          totalMarks: "$testInfo.totalMarks",
          questionCount: "$testInfo.questionCount",
          correctAnswers: 1,
          wrongAnswers: 1,
          unanswered: 1,
          score: 1,
          timeTaken: 1,
        },
      },
    ];
    const data = await Attempt.aggregate(pipeline);

    res.json({ data });
  } catch (err) {
    console.error("Get all students tests error:", err);
    res.status(500).json({ message: "Failed to fetch student test analysis." });
  }
};
