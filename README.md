# Test Management System - Backend

A comprehensive backend system for managing online tests and student performance tracking.

## Features

- **User Authentication**: Registration, login with JWT tokens
- **Test Management**: Create, read, update, delete tests (Admin only)
- **Question Management**: Add, edit, delete questions for tests
- **Attempt Tracking**: Submit and track test attempts
- **Performance Analytics**: Detailed performance insights and analytics
- **Role-based Access**: Student and Admin roles with appropriate permissions

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd Testing/Backend
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

- `MONGO_URI`: Your MongoDB connection string
- `JWT_SECRET`: A secure secret key for JWT tokens
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development/production)

4. Start the server:

```bash
# Development mode with nodemon
npm run dev

# Production mode
npm start
```

The server will start on **port 8000** by default. You can access:

- **Health Check**: http://localhost:8000/api/health
- **API Base URL**: http://localhost:8000/api

> **Note**: If port 8000 is in use, check the `PORT_MANAGEMENT.md` guide for instructions on changing ports or killing processes.

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)

### Tests

- `GET /api/tests` - Get all tests (protected)
- `POST /api/tests` - Create a new test (admin only)
- `GET /api/tests/:id` - Get test by ID (protected)
- `PUT /api/tests/:id` - Update test (admin only)
- `DELETE /api/tests/:id` - Delete test (admin only)

### Questions

- `GET /api/questions/:testId` - Get questions for a test (protected)
- `POST /api/questions` - Add a question (admin only)
- `PUT /api/questions/:id` - Update question (admin only)
- `DELETE /api/questions/:id` - Delete question (admin only)

### Attempts

- `POST /api/attempts/submit` - Submit test attempt (protected)
- `GET /api/attempts/student/:id` - Get student attempts (protected)
- `GET /api/attempts/:id` - Get attempt details (protected)

### Performance

- `GET /api/performance/:studentId` - Get student performance (protected)
- `GET /api/performance/:studentId/:testId` - Get test-specific performance (protected)
- `GET /api/performance/analytics` - Get overall analytics (admin only)

## Data Models

### User

```javascript
{
  name: String (required, min: 2 characters),
  email: String (required, unique, valid email),
  password: String (required, min: 6 characters, hashed),
  role: String (enum: ["student", "admin"], default: "student"),
  timestamps: true
}
```

### Test

```javascript
{
  title: String (required, min: 3 characters),
  examType: String (required),
  duration: Number (required, min: 1 minute),
  totalMarks: Number (required, min: 1),
  questionCount: Number (required, min: 1),
  isActive: Boolean (default: true),
  timestamps: true
}
```

### Question

```javascript
{
  testId: ObjectId (required, ref: "Test"),
  section: String (required),
  questionText: String (required, min: 10 characters),
  options: [String] (required, 2-6 options),
  correctAnswer: String (required, must be one of options),
  explanation: String (optional),
  marks: Number (required, min: 0.25),
  negativeMarks: Number (default: 0, min: 0),
  difficulty: String (enum: ["easy", "medium", "hard"], default: "medium"),
  timestamps: true
}
```

### Attempt

```javascript
{
  studentId: ObjectId (required, ref: "User"),
  testId: ObjectId (required, ref: "Test"),
  answers: [{
    questionId: ObjectId (required, ref: "Question"),
    selectedOption: String (required),
    isCorrect: Boolean (required),
    marksAwarded: Number (default: 0)
  }],
  score: Number (required, min: 0),
  timeTaken: Number (required, min: 0),
  totalQuestions: Number (required),
  correctAnswers: Number (default: 0),
  wrongAnswers: Number (default: 0),
  unanswered: Number (default: 0),
  timestamps: true
}
```

### Performance

```javascript
{
  studentId: ObjectId (required, unique, ref: "User"),
  totalTests: Number (default: 0, min: 0),
  totalScore: Number (default: 0, min: 0),
  averageScore: Number (default: 0, min: 0),
  topScore: Number (default: 0, min: 0),
  weakAreas: [String] (default: []),
  strongAreas: [String] (default: []),
  lastTestDate: Date,
  testHistory: [{
    testId: ObjectId (ref: "Test"),
    score: Number,
    percentage: Number,
    completedAt: Date (default: Date.now)
  }],
  timestamps: true
}
```

## Security Features

- **Password Hashing**: Using bcryptjs with salt rounds of 12
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Comprehensive validation on all inputs
- **Role-based Access Control**: Different permissions for students and admins
- **MongoDB Injection Prevention**: Using Mongoose with proper validation
- **Error Handling**: Comprehensive error handling and logging

## Error Handling

The API returns consistent error responses:

```javascript
{
  "error": "Error message description"
}
```

Common HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

## Development

### Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

### Database Setup

Make sure MongoDB is running and accessible via the connection string in your `.env` file.

### Environment Variables

Ensure all required environment variables are set:

- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - JWT secret key (use a strong random string)
- `PORT` - Server port
- `NODE_ENV` - Environment mode

## Production Considerations

1. Use a strong, unique JWT_SECRET
2. Set up proper MongoDB security (authentication, authorization)
3. Implement rate limiting
4. Set up HTTPS
5. Configure proper CORS settings
6. Implement logging and monitoring
7. Set up database backups
8. Use environment-specific configurations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.
