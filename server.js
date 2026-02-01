// server.js
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();

const app = express();

/* ===================== MIDDLEWARE ===================== */
app.use(cors());
app.use(express.json());
app.use(express.static(".")); // serve frontend files

/* ===================== DB CONNECTION ===================== */
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

/* ===================== USER SCHEMA ===================== */
const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["customer", "shopkeeper", "distributor", "producer", "admin"],
      required: true,
    },

    mobile: {
      type: String,
      required: true,
      unique: true,
      immutable: true, // 🔒 never change
      match: [/^\+880\d{10}$/, "Invalid Bangladeshi mobile"],
    },

    additionalMobile: {
      type: String,
      default: null,
      match: [/^01\d{9}$/, "Invalid mobile format"],
    },

    nidNumber: {
      type: String,
      immutable: true, // 🔒 never change
      default: null,
    },

    password: {
      type: String,
      required: true,
    },

    /* ===== PROFILE DATA (UPDATED FROM DASHBOARD) ===== */
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    dateOfBirth: { type: Date, default: null },
    address: { type: String, default: "" },
    businessName: { type: String, default: "" },
    taxId: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { timestamps: true },
);

/* ===================== PASSWORD HASH ===================== */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const User = mongoose.model("User", userSchema);

/* ===================== AUTH MIDDLEWARE ===================== */
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: "No token provided" });

  const token = header.split(" ")[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

/* ===================== ROUTES ===================== */

// Health check
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "API running" });
});

/* ===================== REGISTER ===================== */
app.post("/api/users", async (req, res) => {
  try {
    const { userType, nidNumber, mobile, password } = req.body;

    if (!userType || !mobile || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const formattedMobile = `+880${mobile.substring(1)}`;

    const exists = await User.findOne({ mobile: formattedMobile });
    if (exists) {
      return res.status(400).json({ message: "Mobile already registered" });
    }

    const user = new User({
      role: userType,
      mobile: formattedMobile,
      additionalMobile: mobile, // first mobile stored here
      password,
      nidNumber: nidNumber || null,
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "Registration successful",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ===================== LOGIN ===================== */
app.post("/api/auth/login", async (req, res) => {
  try {
    const { mobile, password } = req.body;
    const formattedMobile = `+880${mobile.substring(1)}`;

    const user = await User.findOne({ mobile: formattedMobile });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      success: true,
      token,
      user,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/* ===================== GET CURRENT USER ===================== */
app.get("/api/user/me", auth, async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  res.json(user);
});

/* ===================== UPDATE PROFILE ===================== */
app.put("/api/user/update-profile", auth, async (req, res) => {
  try {
    const {
      name,
      email,
      dateOfBirth,
      address,
      businessName,
      taxId,
      description,
      additionalMobile,
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // ❌ IMMUTABLE
    // user.mobile ❌
    // user.nidNumber ❌

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
    if (address !== undefined) user.address = address;
    if (businessName !== undefined) user.businessName = businessName;
    if (taxId !== undefined) user.taxId = taxId;
    if (description !== undefined) user.description = description;

    if (additionalMobile) {
      if (!/^01\d{9}$/.test(additionalMobile)) {
        return res.status(400).json({ message: "Invalid mobile format" });
      }
      user.additionalMobile = additionalMobile;
    }

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Profile update failed" });
  }
});

/* ===================== SERVER ===================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`),
);
