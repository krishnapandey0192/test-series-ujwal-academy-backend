# Question Upload Guide

## Overview

The Question Management System supports both individual question creation and bulk upload via Excel files.

## Individual Question Creation

### API Endpoint

```
POST /api/questions
Content-Type: application/json
Authorization: Bearer <admin_token>
```

### Request Body

```json
{
  "testId": "60d5ec49f1b2c8b1f8e4e123",
  "section": "Mathematics",
  "questionText": "What is 2 + 2?",
  "options": ["3", "4", "5", "6"],
  "correctAnswer": "4",
  "explanation": "Basic addition: 2 + 2 = 4",
  "marks": 1,
  "negativeMarks": 0.25,
  "difficulty": "easy"
}
```

## Bulk Upload via Excel

### API Endpoint

```
POST /api/questions
Content-Type: multipart/form-data
Authorization: Bearer <admin_token>
```

### Form Data

- `file`: Excel file (.xlsx or .xls)
- `testId`: Test ID (string)

### Excel File Format

The Excel file should have the following columns (case-insensitive):

| Column Name    | Required | Description                      | Example                         |
| -------------- | -------- | -------------------------------- | ------------------------------- |
| Question Text  | Yes      | The question content             | "What is the capital of India?" |
| Section        | No       | Question category                | "Geography"                     |
| Option A       | Yes      | First option                     | "Mumbai"                        |
| Option B       | Yes      | Second option                    | "Delhi"                         |
| Option C       | No       | Third option                     | "Kolkata"                       |
| Option D       | No       | Fourth option                    | "Chennai"                       |
| Option E       | No       | Fifth option                     | "Bangalore"                     |
| Option F       | No       | Sixth option                     | "Hyderabad"                     |
| Correct Answer | Yes      | The correct option text          | "Delhi"                         |
| Explanation    | No       | Answer explanation               | "Delhi is the capital of India" |
| Marks          | No       | Points for correct answer        | 1                               |
| Negative Marks | No       | Points deducted for wrong answer | 0.25                            |
| Difficulty     | No       | Question difficulty              | "easy", "medium", or "hard"     |

### Alternative Column Names

The system recognizes various column name formats:

**Question Text**: Question, QuestionText, Quest
**Options**: Option1/OptionA/A, Option2/OptionB/B, etc.
**Correct Answer**: CorrectAnswer, Correct, Answer, Ans
**Explanation**: Explanation, Explain, Solution
**Marks**: Marks, Mark, Points
**Negative Marks**: NegativeMarks, NegativeMark, Negative
**Difficulty**: Difficulty, Level

### Sample Excel Template

You can download a sample template:

```
GET /api/questions/template/download
```

## File Upload Specifications

- **File Types**: .xlsx, .xls
- **File Size**: Maximum 5MB
- **Encoding**: UTF-8 recommended
- **Rows**: Minimum 2 rows (1 header + 1 data)

## Validation Rules

1. **Question Text**: Required, minimum 10 characters
2. **Options**: At least 2 options, maximum 6 options
3. **Correct Answer**: Must match one of the provided options exactly
4. **Marks**: Must be a positive number (default: 1)
5. **Negative Marks**: Must be non-negative (default: 0)
6. **Difficulty**: Must be "easy", "medium", or "hard" (default: "medium")
7. **Test ID**: Must be a valid MongoDB ObjectId

## Error Handling

### Common Errors

- **File Format Error**: Only Excel files are allowed
- **File Size Error**: File exceeds 5MB limit
- **Parse Error**: Invalid Excel format or corrupted file
- **Validation Error**: Missing required fields or invalid data
- **Permission Error**: Only admins can upload questions

### Error Response Format

```json
{
  "error": "Validation errors found",
  "details": [
    "Row 2: Question text is required",
    "Row 3: Correct answer must be one of the provided options"
  ]
}
```

## Success Response

```json
{
  "message": "Questions uploaded successfully",
  "total": 25,
  "testId": "60d5ec49f1b2c8b1f8e4e123"
}
```

## API Examples

### Using cURL

**Individual Question:**

```bash
curl -X POST http://localhost:3002/api/questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "testId": "60d5ec49f1b2c8b1f8e4e123",
    "section": "Math",
    "questionText": "What is 5 + 3?",
    "options": ["7", "8", "9", "10"],
    "correctAnswer": "8",
    "marks": 1
  }'
```

**Bulk Upload:**

```bash
curl -X POST http://localhost:3002/api/questions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@questions.xlsx" \
  -F "testId=60d5ec49f1b2c8b1f8e4e123"
```

**Download Template:**

```bash
curl -O http://localhost:3002/api/questions/template/download
```

## Best Practices

1. **Always test with sample data first**
2. **Use the template as a starting point**
3. **Keep backup of your Excel files**
4. **Validate data before upload**
5. **Use meaningful section names**
6. **Provide clear explanations for complex questions**
7. **Set appropriate difficulty levels**
8. **Review uploaded questions before test activation**

## Troubleshooting

### File Not Uploading

- Check file format (.xlsx or .xls only)
- Verify file size (under 5MB)
- Ensure you have admin permissions

### Validation Errors

- Check required columns are present
- Verify correct answer matches one of the options
- Ensure question text is not empty

### Server Errors

- Check server logs for detailed error messages
- Verify MongoDB connection
- Ensure uploads directory exists and is writable
