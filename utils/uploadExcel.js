const xlsx = require("xlsx");
const fs = require("fs");

// exports.parseExcelFile = (filePath) => {
//   try {
//     // Check if file exists
//     if (!fs.existsSync(filePath)) {
//       throw new Error("File not found");
//     }

//     // Read the Excel file
//     const workbook = xlsx.readFile(filePath);

//     if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
//       throw new Error("No sheets found in Excel file");
//     }

//     // Get the first sheet
//     const sheetName = workbook.SheetNames[0];
//     const worksheet = workbook.Sheets[sheetName];

//     // Convert sheet to JSON
//     const data = xlsx.utils.sheet_to_json(worksheet, {
//       header: 1, // Use first row as headers
//       defval: "", // Default value for empty cells
//       blankrows: false, // Skip blank rows
//     });

//     if (data.length < 2) {
//       throw new Error(
//         "Excel file must contain at least a header row and one data row"
//       );
//     }

//     // Get headers from first row
//     const headers = data[0];
//     const rows = data.slice(1);

//     // Convert to object format
//     const questions = rows.map((row, index) => {
//       const question = {};
//       headers.forEach((header, colIndex) => {
//         if (header && row[colIndex] !== undefined) {
//           // Normalize header names
//           const normalizedHeader = header
//             .toString()
//             .toLowerCase()
//             .trim()
//             .replace(/\s+/g, "")
//             .replace(/[^a-z0-9]/g, "");

//           let value = row[colIndex];
//           if (value !== null && value !== undefined) {
//             value = value.toString().trim();
//           }

//           // Map common header variations
//           switch (normalizedHeader) {
//             case "question":
//             case "questiontext":
//             case "quest":
//               question.questionText = value;
//               break;
//             case "section":
//             case "category":
//             case "subject":
//               question.section = value;
//               break;
//             case "option1":
//             case "optiona":
//             case "a":
//               question.option1 = value;
//               break;
//             case "option2":
//             case "optionb":
//             case "b":
//               question.option2 = value;
//               break;
//             case "option3":
//             case "optionc":
//             case "c":
//               question.option3 = value;
//               break;
//             case "option4":
//             case "optiond":
//             case "d":
//               question.option4 = value;
//               break;
//             case "option5":
//             case "optione":
//             case "e":
//               question.option5 = value;
//               break;
//             case "option6":
//             case "optionf":
//             case "f":
//               question.option6 = value;
//               break;
//             case "correctanswer":
//             case "correct":
//             case "answer":
//             case "ans":
//               question.correctAnswer = value;
//               break;
//             case "explanation":
//             case "explain":
//             case "solution":
//               question.explanation = value;
//               break;
//             case "marks":
//             case "mark":
//             case "points":
//               question.marks = parseFloat(value) || 1;
//               break;
//             case "negativemarks":
//             case "negativemark":
//             case "negative":
//               question.negativeMarks = parseFloat(value) || 0;
//               break;
//             case "difficulty":
//             case "level":
//               const diff = value.toLowerCase();
//               if (["easy", "medium", "hard"].includes(diff)) {
//                 question.difficulty = diff;
//               } else {
//                 question.difficulty = "medium";
//               }
//               break;
//             default:
//               // Store any other headers as-is
//               question[header] = value;
//           }
//         }
//       });

//       return question;
//     });

//     // Filter out completely empty questions
//     const validQuestions = questions.filter(
//       (q) => q.questionText && q.questionText.trim().length > 0
//     );

//     return validQuestions;
//   } catch (error) {
//     console.error("Excel parsing error:", error);
//     throw new Error(`Failed to parse Excel file: ${error.message}`);
//   }
// };

// Helper function to create sample Excel template

exports.parseExcelFile = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error("File not found");
    }

    const workbook = xlsx.readFile(filePath);
    if (!workbook.SheetNames?.length) {
      throw new Error("No sheets found in Excel file");
    }

    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    const data = xlsx.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
      blankrows: false,
    });

    if (data.length < 2) {
      throw new Error("Excel must have header + at least one row");
    }

    const headers = data[0].map(normalizeHeader);
    const rows = data.slice(1);

    const headerMap = {
      question: "questionText",
      questiontext: "questionText",
      quest: "questionText",

      section: "section",
      category: "section",
      subject: "section",

      option1: "option1",
      optiona: "option1",
      a: "option1",

      option2: "option2",
      optionb: "option2",
      b: "option2",

      option3: "option3",
      optionc: "option3",
      c: "option3",

      option4: "option4",
      optiond: "option4",
      d: "option4",

      option5: "option5",
      optione: "option5",
      e: "option5",

      option6: "option6",
      optionf: "option6",
      f: "option6",

      correctanswer: "correctAnswer",
      correct: "correctAnswer",
      answer: "correctAnswer",
      ans: "correctAnswer",

      explanation: "explanation",
      explain: "explanation",
      solution: "explanation",

      marks: "marks",
      mark: "marks",
      points: "marks",

      negativemarks: "negativeMarks",
      negativemark: "negativeMarks",
      negative: "negativeMarks",

      difficulty: "difficulty",
      level: "difficulty",
    };

    const questions = rows.map((row, index) => {
      const question = {
        sequence: index + 1, // 🔥 IMPORTANT
      };

      headers.forEach((header, colIndex) => {
        const value = row[colIndex]?.toString().trim();
        if (!header || !value) return;

        const field = headerMap[header];

        if (!field) {
          question[header] = value;
          return;
        }

        switch (field) {
          case "marks":
            question.marks = parseFloat(value) || 1;
            break;

          case "negativeMarks":
            question.negativeMarks = parseFloat(value) || 0;
            break;

          case "difficulty":
            const diff = value.toLowerCase();
            question.difficulty = ["easy", "medium", "hard"].includes(diff)
              ? diff
              : "medium";
            break;

          default:
            question[field] = value;
        }
      });

      return question;
    });

    return questions;
  } catch (error) {
    throw error;
  }
};

function normalizeHeader(header) {
  return header
    ?.toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
}


exports.createSampleTemplate = () => {
  const sampleData = [
    {
      "Question Text": "What is the capital of India?",
      Section: "Geography",
      "Option A": "Mumbai",
      "Option B": "Delhi",
      "Option C": "Kolkata",
      "Option D": "Chennai",
      "Correct Answer": "Delhi",
      Explanation: "Delhi is the capital city of India.",
      Marks: 1,
      "Negative Marks": 0.25,
      Difficulty: "easy",
    },
    {
      "Question Text":
        "Which programming language is known as the mother of all languages?",
      Section: "Computer Science",
      "Option A": "C",
      "Option B": "Java",
      "Option C": "Python",
      "Option D": "Assembly",
      "Correct Answer": "C",
      Explanation:
        "C is often considered the mother of modern programming languages.",
      Marks: 2,
      "Negative Marks": 0.5,
      Difficulty: "medium",
    },
  ];

  return sampleData;
};
