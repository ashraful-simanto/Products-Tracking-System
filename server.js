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
app.use(express.json({ limit: "10mb" }));
app.use(express.static("."));

/* ===================== DB CONNECTION ===================== */
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

/* ===================== UTILITY ===================== */
function normalizeMobile(mobile) {
  if (!mobile) return null;
  if (mobile.startsWith("+880")) return mobile;
  if (mobile.startsWith("01")) return `+880${mobile.substring(1)}`;
  return mobile;
}

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
    password: { type: String, required: true },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    businessName: { type: String, default: "" },
  },
  { timestamps: true },
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const User = mongoose.model("User", userSchema);

/* ===================== PARTNER SCHEMA ===================== */
const PartnerItemSchema = new mongoose.Schema(
  {
    receiverMobile: String,
    name: { type: String, default: "" },
    partnerType: {
      type: String,
      enum: ["producer", "shopkeeper", "distributor"],
    },
    status: {
      type: String,
      enum: ["pending", "requested", "connected"],
      default: "pending",
    },
  },
  { _id: false },
);

const PartnerConnectionSchema = new mongoose.Schema(
  {
    mobile: { type: String, unique: true },
    role: String,
    partners: { type: [PartnerItemSchema], default: [] },
  },
  { timestamps: true },
);

const PartnerConnection = mongoose.model(
  "PartnerConnection",
  PartnerConnectionSchema,
);

/* ===================== PRODUCT SCHEMA ===================== */
const productSchema = new mongoose.Schema(
  {
    productName: { type: String, required: true },
    producedDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    quantity: { type: Number, default: 0 },
    price: { type: Number, required: true },
    factoryAddress: { type: String },
    description: { type: String },
    qrImage: { type: String },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

const Product = mongoose.model("Product", productSchema);

/* ===================== AUTH MIDDLEWARE ===================== */
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: "No token provided" });

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
}

/* ===================== REGISTER ===================== */
app.post("/api/users", async (req, res) => {
  try {
    let { userType, mobile, password, businessName } = req.body;
    if (!userType || !mobile || !password)
      return res.status(400).json({ message: "Missing required fields" });

    mobile = normalizeMobile(mobile);

    const exists = await User.findOne({ mobile });
    if (exists)
      return res.status(400).json({ message: "Mobile already registered" });

    const user = await User.create({
      role: userType,
      mobile,
      password,
      businessName: businessName || "",
    });

    await PartnerConnection.create({ mobile, role: userType });

    res.status(201).json({ success: true, user });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: err.message });
  }
});

/* ===================== LOGIN ===================== */
app.post("/api/auth/login", async (req, res) => {
  try {
    let { mobile, password } = req.body;
    mobile = normalizeMobile(mobile);

    const user = await User.findOne({ mobile });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, mobile: user.mobile, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({ token, user });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ===================== PRODUCT ROUTES ===================== */
// Fetch all products
app.get("/api/products", auth, async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    console.error("Fetch products error:", err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

// Add a product - FIXED
app.post("/api/products", auth, async (req, res) => {
  try {
    const {
      productName,
      producedDate,
      expiryDate,
      quantity,
      price,
      factoryAddress,
      description,
      qrImage,
      owner,
    } = req.body;

    // Validate required fields
    if (!productName)
      return res.status(400).json({ message: "Product name is required" });
    if (!producedDate)
      return res.status(400).json({ message: "Produced date is required" });
    if (!expiryDate)
      return res.status(400).json({ message: "Expiry date is required" });
    if (quantity == null)
      return res.status(400).json({ message: "Quantity is required" });
    if (price == null)
      return res.status(400).json({ message: "Price is required" });
    if (!owner)
      return res.status(400).json({ message: "Owner ID is required" });

    // Validate owner exists
    const ownerUser = await User.findById(owner);
    if (!ownerUser)
      return res.status(400).json({ message: "Owner user not found" });

    // Parse dates
    const produced = new Date(producedDate);
    const expiry = new Date(expiryDate);
    if (isNaN(produced.getTime()) || isNaN(expiry.getTime()))
      return res.status(400).json({ message: "Invalid date format" });

    // Create product
    const product = await Product.create({
      productName,
      producedDate: produced,
      expiryDate: expiry,
      quantity: Number(quantity),
      price: Number(price),
      factoryAddress: factoryAddress || "",
      description: description || "",
      qrImage: qrImage || "",
      owner: ownerUser._id,
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, product });
  } catch (err) {
    console.error("Add product error:", err);
    res.status(500).json({ message: err.message || "Failed to add product" });
  }
});

// Update product
app.put("/api/products/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const product = await Product.findByIdAndUpdate(id, updates, { new: true });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ success: true, product });
  } catch (err) {
    console.error("Update product error:", err);
    res.status(500).json({ message: "Failed to update product" });
  }
});

// Delete product
app.delete("/api/products/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({ message: "Failed to delete product" });
  }
});

/* ===================== GET MY PARTNERS (fixed) ===================== */
app.get("/api/partners/list", auth, async (req, res) => {
  try {
    const mobile = normalizeMobile(req.user.mobile);
    const data = await PartnerConnection.findOne({ mobile });
    if (!data) return res.json([]);

    // Map partners and fetch their names from User
    const partnersWithName = await Promise.all(
      data.partners.map(async (p) => {
        const user = await User.findOne({ mobile: p.receiverMobile });
        return {
          receiverMobile: p.receiverMobile,
          partnerType: p.partnerType,
          status: p.status,
          name: user ? user.name || user.businessName || "" : "",
        };
      })
    );

    res.json(partnersWithName);
  } catch (err) {
    console.error("Get partners error:", err);
    res.status(500).json({ message: "Failed to fetch partners" });
  }
});

/* ===================== SEND PARTNER REQUEST (fixed) ===================== */
app.post("/api/partners/request", auth, async (req, res) => {
  try {
    let { receiverMobile, partnerType } = req.body;
    if (!receiverMobile || !partnerType)
      return res.status(400).json({ message: "Missing fields" });

    receiverMobile = normalizeMobile(receiverMobile);
    const senderMobile = normalizeMobile(req.user.mobile);

    const receiverUser = await User.findOne({ mobile: receiverMobile });
    if (!receiverUser)
      return res.status(404).json({ message: "Receiver not found" });

    let sender = await PartnerConnection.findOne({ mobile: senderMobile });
    if (!sender)
      sender = await PartnerConnection.create({
        mobile: senderMobile,
        role: req.user.role,
      });

    let receiver = await PartnerConnection.findOne({ mobile: receiverMobile });
    if (!receiver)
      receiver = await PartnerConnection.create({
        mobile: receiverMobile,
        role: receiverUser.role,
      });

    const exists = sender.partners.some(
      (p) => p.receiverMobile === receiverMobile
    );
    if (exists)
      return res.status(400).json({ message: "Request already exists" });

    sender.partners.push({ receiverMobile, partnerType, status: "requested" });
    receiver.partners.push({
      receiverMobile: senderMobile,
      partnerType: req.user.role,
      status: "pending",
    });

    await sender.save();
    await receiver.save();

    res.json({ success: true, message: "Partner request sent" });
  } catch (err) {
    console.error("Partner request error:", err);
    res.status(500).json({ message: "Failed to send request" });
  }
});

// transit
// Transit schema (extend existing Product + Partner)
const transitSchema = new mongoose.Schema({
  partnerMobile: String,
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  quantity: Number,
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  transitStatus: { type: Boolean, default: false },
  receivedStatus: { type: Boolean, default: false },
}, { timestamps: true });

const Transit = mongoose.model("Transit", transitSchema);

// Send product to partner
app.post("/api/transit/send", auth, async (req, res) => {
  try {
    const { partnerMobile, productId, quantity, transitStatus, receivedStatus } = req.body;

    if (!partnerMobile || !productId || !quantity) return res.status(400).json({ message: "Missing fields" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (product.quantity < quantity) return res.status(400).json({ message: "Insufficient quantity" });

    // Reduce owner quantity
    product.quantity -= quantity;
    await product.save();

    // Create transit record
    await Transit.create({
      partnerMobile,
      product: productId,
      quantity,
      sender: req.user.id,
      transitStatus: !!transitStatus,
      receivedStatus: !!receivedStatus
    });

    res.json({ success: true });
  } catch(err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send product" });
  }
});
/* ===================== SWITCH ROLE ===================== */
app.post("/api/auth/switch-role", auth, async (req, res) => {
  try {
    const { newRole } = req.body;
    const validRoles = ["customer", "shopkeeper", "distributor", "producer", "admin"];
    if (!validRoles.includes(newRole)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // Issue a new JWT with the switched role
    const token = jwt.sign(
      { id: req.user.id, mobile: req.user.mobile, role: newRole },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ success: true, token, activeRole: newRole });
  } catch (err) {
    console.error("Switch role error:", err);
    res.status(500).json({ message: "Failed to switch role" });
  }
});


/* ===================== SERVER ===================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`),
);
