const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendMail } = require("../utils/email");

exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, role, mobile } = req.body;

    // Validation
    if (!name || !email || !password || !mobile) {
      return res.status(400).json({
        error: "Name, email, password, and mobile number are required",
      });
    }

    // Validate mobile number format (10 digits)
    const mobileRegex = /^\d{10}$/;
    if (!mobileRegex.test(mobile.trim())) {
      return res
        .status(400)
        .json({ error: "Please enter a valid 10-digit mobile number" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res
        .status(409)
        .json({ error: "User with this email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role || "student",
      mobile: mobile.trim(),
    });

    await user.save();

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Registration error:", err);
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: errors.join(", ") });
    }
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password"
    );
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ error: "Failed to get user profile" });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "New password must be at least 6 characters long" });
    }

    // Find user with password
    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await User.findByIdAndUpdate(userId, {
      password: hashedNewPassword,
      updatedAt: new Date(),
    });

    res.json({
      message: "Password changed successfully",
    });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Failed to change password" });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    // Only admins can view all users
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }

    const { page = 1, limit = 10, role, search } = req.query;
    const query = {};

    // Filter by role if specified
    if (role && ["student", "admin"].includes(role)) {
      query.role = role;
    }

    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    });
  } catch (err) {
    console.error("Get all users error:", err);
    res.status(500).json({ error: "Failed to retrieve users" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    // Always respond with success to prevent email enumeration
    if (!user) {
      return res.json({ message: "If an account exists, a reset email has been sent" });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = expiresAt;
    await user.save({ validateModifiedOnly: true });

    const frontendBase = process.env.FRONTEND_URL || "http://localhost:5174";
    const resetUrl = `${frontendBase}/reset-password?token=${rawToken}`;

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - Ujjawal Academy</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f8fafc;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 40px 30px;
                text-align: center;
                color: white;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                margin-bottom: 8px;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }
            .tagline {
                font-size: 14px;
                opacity: 0.9;
                font-weight: 300;
            }
            .content {
                padding: 40px 30px;
            }
            .greeting {
                font-size: 24px;
                color: #2d3748;
                margin-bottom: 20px;
                font-weight: 600;
            }
            .message {
                font-size: 16px;
                color: #4a5568;
                margin-bottom: 30px;
                line-height: 1.7;
            }
            .highlight {
                background: linear-gradient(120deg, #a8edea 0%, #fed6e3 100%);
                padding: 20px;
                border-radius: 8px;
                margin: 25px 0;
                border-left: 4px solid #667eea;
            }
            .button-container {
                text-align: center;
                margin: 35px 0;
            }
            .reset-button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-decoration: none;
                padding: 16px 32px;
                border-radius: 50px;
                font-weight: 600;
                font-size: 16px;
                box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
                transition: all 0.3s ease;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .reset-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 25px rgba(102, 126, 234, 0.6);
            }
            .link-container {
                background: #f7fafc;
                padding: 20px;
                border-radius: 8px;
                margin: 25px 0;
                border: 1px solid #e2e8f0;
            }
            .link-label {
                font-size: 14px;
                color: #718096;
                margin-bottom: 10px;
                font-weight: 500;
            }
            .reset-link {
                color: #667eea;
                text-decoration: none;
                word-break: break-all;
                font-size: 14px;
                padding: 8px 12px;
                background: white;
                border-radius: 4px;
                border: 1px solid #e2e8f0;
                display: block;
            }
            .warning {
                background: #fff5f5;
                border: 1px solid #fed7d7;
                border-radius: 8px;
                padding: 20px;
                margin: 25px 0;
            }
            .warning-icon {
                color: #e53e3e;
                font-weight: bold;
                margin-right: 8px;
            }
            .footer {
                background: #2d3748;
                color: #a0aec0;
                padding: 30px;
                text-align: center;
                font-size: 14px;
        }
            .footer-logo {
                color: #667eea;
                font-weight: bold;
                font-size: 18px;
                margin-bottom: 10px;
            }
            .social-links {
                margin: 20px 0;
            }
            .social-links a {
                color: #a0aec0;
                text-decoration: none;
                margin: 0 10px;
                font-size: 16px;
            }
            .expiry-notice {
                background: #ebf8ff;
                border: 1px solid #90cdf4;
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
                text-align: center;
            }
            .expiry-notice .icon {
                color: #3182ce;
                font-size: 20px;
                margin-bottom: 8px;
            }
            @media (max-width: 600px) {
                .container {
                    margin: 10px;
                    border-radius: 8px;
                }
                .header, .content, .footer {
                    padding: 25px 20px;
                }
                .greeting {
                    font-size: 20px;
                }
                .reset-button {
                    padding: 14px 28px;
                    font-size: 14px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🎓 Ujjawal Academy</div>
                <div class="tagline">Maugnaj Modern Education Excellence</div>
            </div>
            
            <div class="content">
                <div class="greeting">Hello ${user.name}! 👋</div>
                
                <div class="message">
                    We received a request to reset your password for your Ujjawal Academy account. 
                    Don't worry, this happens to the best of us!
                </div>
                
                <div class="highlight">
                    <strong>🔐 Password Reset Request</strong><br>
                    Click the button below or use the link to create a new password. 
                    This link is secure and will expire in 15 minutes for your safety.
                </div>
                
                <div class="button-container">
                    <a href="${resetUrl}" class="reset-button">
                        🔑 Reset My Password
                    </a>
                </div>
                
                <div class="link-container">
                    <div class="link-label">📋 Or copy and paste this link in your browser:</div>
                    <a href="${resetUrl}" class="reset-link">${resetUrl}</a>
                </div>
                
                <div class="expiry-notice">
                    <div class="icon">⏰</div>
                    <strong>This link expires in 15 minutes</strong><br>
                    <small>For security reasons, please reset your password soon.</small>
                </div>
                
                <div class="warning">
                    <span class="warning-icon">⚠️</span>
                    <strong>Didn't request this?</strong> If you didn't request a password reset, 
                    you can safely ignore this email. Your account remains secure.
                </div>
            </div>
            
            <div class="footer">
                <div class="footer-logo">Ujjawal Academy</div>
                <div>Maugnaj Modern • Excellence in Education</div>
                <div class="social-links">
                    <a href="#">📧 Email</a>
                    <a href="#">📱 Phone</a>
                    <a href="#">🌐 Website</a>
                </div>
                <div style="margin-top: 15px; font-size: 12px; opacity: 0.8;">
                    This email was sent from Ujjawal Academy's secure system.<br>
                    Please do not reply to this email.
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    try {
      await sendMail({
        to: user.email,
        subject: "Reset your password",
        html,
      });
      console.log(`Password reset email sent to: ${user.email}`);
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Still return success to maintain security
    }

    return res.json({ message: "If an account exists, a reset email has been sent" });
  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ error: "Failed to process request" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select("+password");

    if (!user) {
      return res.status(400).json({ error: "Token is invalid or has expired" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedNewPassword;
    user.passwordChangedAt = new Date();
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.json({ message: "Password has been reset successfully" });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ error: "Failed to reset password" });
  }
};

// Test email functionality (remove in production)
exports.testEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Test Email - Ujjawal Academy</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f8fafc;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 40px 30px;
                text-align: center;
                color: white;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                margin-bottom: 8px;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }
            .tagline {
                font-size: 14px;
                opacity: 0.9;
                font-weight: 300;
            }
            .content {
                padding: 40px 30px;
                text-align: center;
            }
            .success-icon {
                font-size: 64px;
                margin-bottom: 20px;
            }
            .title {
                font-size: 24px;
                color: #2d3748;
                margin-bottom: 20px;
                font-weight: 600;
            }
            .message {
                font-size: 16px;
                color: #4a5568;
                margin-bottom: 30px;
                line-height: 1.7;
            }
            .success-box {
                background: linear-gradient(120deg, #a8edea 0%, #fed6e3 100%);
                padding: 30px;
                border-radius: 12px;
                margin: 25px 0;
                border-left: 4px solid #48bb78;
            }
            .footer {
                background: #2d3748;
                color: #a0aec0;
                padding: 30px;
                text-align: center;
                font-size: 14px;
            }
            .footer-logo {
                color: #667eea;
                font-weight: bold;
                font-size: 18px;
                margin-bottom: 10px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🎓 Ujjawal Academy</div>
                <div class="tagline">Maugnaj Modern Education Excellence</div>
            </div>
            
            <div class="content">
                <div class="success-icon">✅</div>
                <div class="title">Email System Test Successful!</div>
                
                <div class="message">
                    Congratulations! Your email configuration is working perfectly.
                </div>
                
                <div class="success-box">
                    <strong>🎉 Test Results</strong><br>
                    ✅ SMTP Connection: Working<br>
                    ✅ Email Delivery: Successful<br>
                    ✅ Template Rendering: Perfect<br>
                    <br>
                    <strong>Your Ujjawal Academy email system is ready for production!</strong>
                </div>
            </div>
            
            <div class="footer">
                <div class="footer-logo">Ujjawal Academy</div>
                <div>Maugnaj Modern • Excellence in Education</div>
                <div style="margin-top: 15px; font-size: 12px; opacity: 0.8;">
                    This is a test email from Ujjawal Academy's secure system.
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    await sendMail({
      to: email,
      subject: "Test Email - Password Reset System",
      html,
    });

    res.json({ message: "Test email sent successfully" });
  } catch (err) {
    console.error("Test email error:", err);
    res.status(500).json({ error: "Failed to send test email", details: err.message });
  }
};
