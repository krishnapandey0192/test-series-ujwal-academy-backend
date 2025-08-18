const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected successfully");
    return true; // Return true on successful connection
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    console.log("Please make sure MongoDB is installed and running");
    console.log(
      "To install MongoDB, visit: https://www.mongodb.com/try/download/community"
    );
    // Don't exit in development to allow server to start for testing
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
    return false; // Return false on failed connection
  }
};

module.exports = connectDB;
