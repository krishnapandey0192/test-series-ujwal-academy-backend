const User = require("../models/User");
const bcrypt = require("bcryptjs");

const createDefaultAdmin = async () => {
  try {
    // Check if any admin user exists
    const existingAdmin = await User.findOne({ role: "admin" });

    if (existingAdmin) {
      console.log("ℹ️  Admin user already exists:", existingAdmin.email);
      return existingAdmin;
    }

    // Get default admin credentials from environment or use defaults
    const defaultAdmin = {
      name: process.env.DEFAULT_ADMIN_NAME || "System Administrator",
      email: process.env.DEFAULT_ADMIN_EMAIL || "admin@ttms.com",
      password: process.env.DEFAULT_ADMIN_PASSWORD || "admin123456",
      role: "admin",
      mobile: process.env.DEFAULT_ADMIN_MOBILE || "9999999999",
    };

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(defaultAdmin.email)) {
      console.error("❌ Invalid admin email format");
      return null;
    }

    // Validate password strength
    if (defaultAdmin.password.length < 6) {
      console.error("❌ Admin password must be at least 6 characters");
      return null;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(defaultAdmin.password, 12);

    // Create the admin user
    const adminUser = new User({
      name: defaultAdmin.name.trim(),
      email: defaultAdmin.email.toLowerCase().trim(),
      password: hashedPassword,
      role: defaultAdmin.role,
      mobile: defaultAdmin.mobile.trim(),
    });

    await adminUser.save();

    console.log("🎉 ========================================");
    console.log("✅ Default admin user created successfully!");
    console.log("🎉 ========================================");
    console.log("👤 Name:", defaultAdmin.name);
    console.log("📧 Email:", defaultAdmin.email);
    console.log("📱 Mobile:", defaultAdmin.mobile);
    console.log("🔑 Password:", defaultAdmin.password);
    console.log("🛡️  Role: Administrator");
    console.log("🎉 ========================================");
    console.log("⚠️  SECURITY NOTICE:");
    console.log("   Please login and change the default password!");
    console.log("   Use: PUT /api/auth/change-password");
    console.log("🎉 ========================================");

    return adminUser;
  } catch (error) {
    if (error.code === 11000) {
      console.log("ℹ️  Admin user with this email already exists");
      return null;
    }
    console.error("❌ Error creating default admin:", error.message);
    return null;
  }
};

module.exports = createDefaultAdmin;
