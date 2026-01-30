// server.js
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();

const app = express();

/* -------------------- MIDDLEWARE -------------------- */
app.use(cors());
app.use(express.json());
app.use(express.static("."));

/* -------------------- DB CONNECTION -------------------- */
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

/* -------------------- USER SCHEMA -------------------- */
const userSchema = new mongoose.Schema({
  mobile: {
    type: String,
    required: true,
    unique: true,
    match: [/^\+880\d{10}$/, "Invalid Bangladeshi mobile number"],
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["customer", "shopkeeper", "distributor", "producer", "admin"],
    required: true,
  },
  nidNumber: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/* -------------------- PASSWORD HASH -------------------- */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const User = mongoose.model("User", userSchema);

/* -------------------- ROUTES -------------------- */

// Health check
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "API running" });
});

/* -------------------- REGISTER (USED BY YOUR FRONTEND) -------------------- */
app.post("/api/users", async (req, res) => {
  try {
    const { userType, nidNumber, mobile, password } = req.body;

    // Basic validation
    if (!userType || !mobile || !password) {
      return res.status(400).json({
        success: false,
        message: "userType, mobile and password are required",
      });
    }

    // Convert mobile to +880 format
    const formattedMobile = `+880${mobile.substring(1)}`;

    // Check existing user
    const exists = await User.findOne({ mobile: formattedMobile });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Mobile number already registered",
      });
    }

    // Create user
    const user = new User({
      role: userType,
      mobile: formattedMobile,
      password,
      nidNumber: nidNumber || null,
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "Registration successful",
      user: {
        id: user._id,
        role: user.role,
        mobile: user.mobile,
        nidNumber: user.nidNumber,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* -------------------- LOGIN -------------------- */
app.post("/api/auth/login", async (req, res) => {
  try {
    const { mobile, password } = req.body;

    // Basic validation
    if (!mobile || !password) {
      return res.status(400).json({
        success: false,
        message: "Mobile and password are required",
      });
    }

    // Convert mobile to +880 format
    const formattedMobile = `+880${mobile.substring(1)}`;

    // Find user
    const user = await User.findOne({ mobile: formattedMobile });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      success: true,
      user: {
        id: user._id,
        role: user.role,
        mobile: user.mobile,
        nidNumber: user.nidNumber,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* -------------------- SERVER -------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`),
);
