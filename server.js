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
app.use(express.json({ limit: "10mb" })); // allow large Base64 QR
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
      immutable: true,
      match: [/^\+880\d{10}$/, "Invalid Bangladeshi mobile"],
    },
    additionalMobile: {
      type: String,
      default: null,
      match: [/^01\d{9}$/, "Invalid mobile format"],
    },
    nidNumber: { type: String, immutable: true, default: null },
    password: { type: String, required: true },
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

/* ===================== USER & PRODUCT MODELS ===================== */
const User = mongoose.model("User", userSchema);

const productSchema = new mongoose.Schema(
  {
    productName: { type: String, required: true },
    producedDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    factoryAddress: { type: String, default: "" },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    description: { type: String, default: "" },
    qrImage: { type: String, default: "" },
  },
  { timestamps: true },
);

const Product = mongoose.model("Product", productSchema);

/* ===================== AUTH MIDDLEWARE ===================== */
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: "No token provided" });

  const token = header.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, role: decoded.role }; // id and role
    next();
  } catch (err) {
    console.error("JWT error:", err);
    return res.status(401).json({ message: "Invalid token" });
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
    if (!userType || !mobile || !password)
      return res.status(400).json({ message: "Missing required fields" });

    const formattedMobile = mobile.startsWith("+880")
      ? mobile
      : `+880${mobile.substring(1)}`;

    const exists = await User.findOne({ mobile: formattedMobile });
    if (exists)
      return res.status(400).json({ message: "Mobile already registered" });

    const user = new User({
      role: userType,
      mobile: formattedMobile,
      additionalMobile: mobile,
      password, // raw password
      nidNumber: nidNumber || null,
    });

    await user.save();
    res.status(201).json({ success: true, message: "Registration successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ===================== LOGIN ===================== */
app.post("/api/auth/login", async (req, res) => {
  try {
    const { mobile, password } = req.body;
    const formattedMobile = mobile.startsWith("+880")
      ? mobile
      : `+880${mobile.substring(1)}`;

    const user = await User.findOne({ mobile: formattedMobile });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({ success: true, token, user });
  } catch (err) {
    console.error(err);
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

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
    if (address !== undefined) user.address = address;
    if (businessName !== undefined) user.businessName = businessName;
    if (taxId !== undefined) user.taxId = taxId;
    if (description !== undefined) user.description = description;
    if (additionalMobile && /^01\d{9}$/.test(additionalMobile))
      user.additionalMobile = additionalMobile;

    await user.save();
    res.json({ success: true, message: "Profile updated successfully", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Profile update failed" });
  }
});

/* ===================== SAVE PRODUCT / QR ===================== */
app.post("/api/products", auth, async (req, res) => {
  try {
    if (req.user.role !== "producer")
      return res.status(403).json({ message: "Access denied" });

    const {
      productName,
      producedDate,
      expiryDate,
      quantity,
      price,
      factoryAddress,
      description,
      qrImage,
    } = req.body;
    if (!productName || !producedDate || !expiryDate || !quantity || !price) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const product = new Product({
      productName,
      producedDate: new Date(producedDate),
      expiryDate: new Date(expiryDate),
      quantity: Number(quantity),
      price: Number(price),
      factoryAddress: factoryAddress || "",
      owner: req.user.id,
      description: description || "",
      qrImage: qrImage || "",
    });

    await product.save();
    res
      .status(201)
      .json({
        success: true,
        message: "Product QR info saved successfully",
        product,
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save product info" });
  }
});

const PartnerRequest = require("./models/PartnerRequest");

/* ===================== SEND PARTNER REQUEST ===================== */
app.post("/api/partners/request", auth, async (req, res) => {
  try {
    const { mobile, type } = req.body; // type = "shopkeeper"/"producer"/"distributor"
    if (!mobile || !type)
      return res.status(400).json({ message: "Mobile and type are required" });

    const receiver = await User.findOne({ mobile });
    if (!receiver) return res.status(404).json({ message: "User not found" });

    // Prevent sending duplicate pending requests
    const existing = await PartnerRequest.findOne({
      "sender.id": req.user.id,
      receiverId: receiver._id,
      type,
      status: "pending",
    });
    if (existing)
      return res.status(400).json({ message: "Request already sent" });

    const senderUser = await User.findById(req.user.id);

    const request = await PartnerRequest.create({
      sender: {
        id: senderUser._id,
        name: senderUser.name,
        role: senderUser.role,
        mobile: senderUser.mobile,
      },
      receiverId: receiver._id,
      type,
      status: "pending",
    });

    res.status(201).json({ success: true, message: "Request sent", request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send request" });
  }
});

/* ===================== GET PARTNER REQUESTS ===================== */
app.get("/api/partners/list", auth, async (req, res) => {
  try {
    const { type, incoming } = req.query;
    // incoming=true -> requests received, false/undefined -> requests sent
    let filter = { type };
    if (incoming === "true") {
      filter.receiverId = req.user.id;
    } else {
      filter["sender.id"] = req.user.id;
    }

    const requests = await PartnerRequest.find(filter)
      .populate("receiverId", "name role mobile") // get receiver info
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch requests" });
  }
});

/* ===================== UPDATE REQUEST STATUS ===================== */
app.put("/api/partners/update/:id", auth, async (req, res) => {
  try {
    const { status } = req.body; // "connected" / "rejected" / "pending"
    const { id } = req.params;

    const request = await PartnerRequest.findById(id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    // Only receiver can accept/reject
    if (request.receiverId.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    request.status = status;
    await request.save();

    res.json({ success: true, message: "Status updated", request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update status" });
  }
});

/* ===================== REMOVE / CANCEL PARTNER ===================== */
app.delete("/api/partners/remove/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const request = await PartnerRequest.findById(id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    // Only sender or receiver can remove
    if (
      request.receiverId.toString() !== req.user.id &&
      request.sender.id.toString() !== req.user.id
    )
      return res.status(403).json({ message: "Not authorized" });

    await PartnerRequest.findByIdAndDelete(id);
    res.json({ success: true, message: "Partner removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to remove partner" });
  }
});


/* ===================== STOCK API ===================== */
app.get("/api/products", auth, async (req, res) => {
  try {
    const products = await Product.find({ owner: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

/* ===================== SERVER ===================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`),
);
