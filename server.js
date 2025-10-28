const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./utils/db");

// Import routes
const authRoutes = require("./routes/auth");
const testRoutes = require("./routes/test");
const questionRoutes = require("./routes/question");
const attemptRoutes = require("./routes/attempt");
const performanceRoutes = require("./routes/performance");
const categoryRoutes = require("./routes/category");
const subcategoryRoutes = require("./routes/subcategory");

// Import middleware
const authenticateUser = require("./middleware/authMiddleware");

// Import utilities
const createDefaultAdmin = require("./utils/createDefaultAdmin");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Connect to MongoDB and create default admin
const initializeServer = async () => {
  const dbConnected = await connectDB();

  // Only create default admin if database is connected
  if (dbConnected) {
    await createDefaultAdmin();
  }
};

initializeServer();

// Middleware
app.use(
  cors({
    // "https://test-series-ujwal-academy.vercel.app"
    // http://localhost:5173
    origin: "https://test-series-ujwal-academy.vercel.app", // your frontend URL
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/subcategories", subcategoryRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/questions", authenticateUser, questionRoutes);
app.use("/api/attempts", authenticateUser, attemptRoutes);
app.use("/api/performance", performanceRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    message: "Server is running successfully",
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// Handle 404 routes
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
