// ═══════════════════════════════════════════════════════════
//  Glocery Shop — server.js
//  Node.js + Express + Firebase Admin SDK + MongoDB (Mongoose)
// ═══════════════════════════════════════════════════════════

const express    = require("express");
const mongoose   = require("mongoose");
const admin      = require("firebase-admin");
const cors       = require("cors");
const morgan     = require("morgan");
const helmet     = require("helmet");
const rateLimit  = require("express-rate-limit");
require("dotenv").config();

const app = express();

// ─────────────────────────────────────────────
//  MIDDLEWARE
// ─────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",   // lock this down in production!
  credentials: true,
}));
app.use(express.json());
app.use(morgan("dev"));       // request logging
app.use(helmet());            // security headers

// Rate limiting — 100 requests / 15 minutes per IP
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use("/api/", limiter);

// ─────────────────────────────────────────────
//  FIREBASE ADMIN INIT
// ─────────────────────────────────────────────
const requiredFirebaseVars = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"];
const missingVars = requiredFirebaseVars.filter(v => !process.env[v]);

if (missingVars.length > 0) {
  console.error(`❌ CRITICAL: Missing Firebase environment variables: ${missingVars.join(", ")}`);
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
  console.log("✅ Firebase Admin initialized securely via environment variables");
} catch (error) {
  console.error("❌ Firebase Admin initialization failed:", error.message);
  process.exit(1);
}


// ─────────────────────────────────────────────
//  MONGODB CONNECTION
//  Set MONGO_URI in .env
//  Local:  mongodb://127.0.0.1:27017/quickcart
//  Atlas:  mongodb+srv://user:pass@cluster.mongodb.net/quickcart
// ─────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/quickcart", {
  useNewUrlParser:    true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected"))
.catch((err) => console.error("❌ MongoDB error:", err));

// ═══════════════════════════════════════════════════════════
//  SCHEMAS & MODELS
// ═══════════════════════════════════════════════════════════

/* ── users ── */
const userSchema = new mongoose.Schema({
  uid:       { type: String, required: true, unique: true, index: true },
  email:     { type: String, required: true },
  name:      { type: String, default: "" },
  phone:     { type: String, default: "" },
  address:   { type: String, default: "" },
  photoURL:  { type: String, default: "" },
  role:      { type: String, enum: ["customer", "admin"], default: "customer" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
const User = mongoose.model("User", userSchema);

/* ── products ── */
const productSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  price:     { type: Number, required: true },
  mrp:       { type: Number, required: true },
  image:     { type: String, default: "" },
  emoji:     { type: String, default: "🛒" },
  category:  { type: String, required: true },
  description: { type: String, default: "" },
  brand:     { type: String, default: "" },
  quantity:  { type: String, default: "" },   // e.g. "500g", "1L"
  badge:     { type: String, enum: ["sale","new","offer",null], default: null },
  inStock:   { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});
const Product = mongoose.model("Product", productSchema);

/* ── cart ── */
const cartItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  quantity:  { type: Number, required: true, min: 1 },
});
const cartSchema = new mongoose.Schema({
  userId:    { type: String, required: true, unique: true, index: true },
  items:     [cartItemSchema],
  updatedAt: { type: Date, default: Date.now },
});
const Cart = mongoose.model("Cart", cartSchema);

/* ── orders ── */
const orderItemSchema = new mongoose.Schema({
  productId: String,
  name:      String,
  price:     Number,
  quantity:  Number,
});
const orderSchema = new mongoose.Schema({
  userId:     { type: String, required: true, index: true },
  items:      [orderItemSchema],
  totalPrice: { type: Number, required: true },
  orderStatus: {
    type: String,
    enum: ["pending_payment", "placed", "shipped", "delivered", "cancelled"],
    default: "placed"
  },
  paymentMethod: {
    type: String,
    enum: ["COD", "ONLINE"],
    default: "COD"
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid"],
    default: "pending"
  },
  paymentDetails: {
    transactionId: String,
    paidAt: Date
  },
  address:    { type: String, default: "" },
  createdAt:  { type: Date, default: Date.now },
  updatedAt:  { type: Date, default: Date.now },
}, { timestamps: true });
const Order = mongoose.model("Order", orderSchema);

// ═══════════════════════════════════════════════════════════
//  MIDDLEWARE — VERIFY FIREBASE TOKEN
// ═══════════════════════════════════════════════════════════
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;         // { uid, email, name, ... }
    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(401).json({ error: "Unauthorized — invalid token" });
  }
}

// Optional auth (doesn't fail if no token)
async function optionalToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      req.user = await admin.auth().verifyIdToken(authHeader.split(" ")[1]);
    } catch (_) {}
  }
  next();
}

// ═══════════════════════════════════════════════════════════
//  ROUTES
// ═══════════════════════════════════════════════════════════

// ── Health check (Supports GET and HEAD) ───────
app.route("/")
  .get((req, res) => {
    res.json({ status: "API running", message: "Backend is live" });
  })
  .head((req, res) => {
    res.status(200).end();
  });


// ─────────────────────────────────────────────
//  USERS
// ─────────────────────────────────────────────

/**
 * POST /api/user
 * Called after Firebase signup / login.
 * Creates user in MongoDB if not exists.
 */
app.post("/api/user", verifyToken, async (req, res) => {
  try {
    const { uid, email, name } = req.user;

    let user = await User.findOne({ uid });

    if (!user) {
      user = await User.create({
        uid,
        email,
        name: name || email.split("@")[0],
        photoURL: req.user.picture || "",
      });
      console.log(`✅ New user created: ${email}`);
    }

    res.json({ message: "User synced", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/user/me
 * Returns current user's profile from MongoDB.
 */
app.get("/api/user/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/profile
 * Update user profile details.
 */
app.post("/api/profile", verifyToken, async (req, res) => {
  try {
    const { name, phone, address, photoURL } = req.body;
    const user = await User.findOneAndUpdate(
      { uid: req.user.uid },
      { $set: { name, phone, address, photoURL, updatedAt: new Date() } },
      { new: true, upsert: true }
    );
    res.json({ message: "Profile updated", user });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────
//  PRODUCTS
// ─────────────────────────────────────────────

/**
 * GET /api/products
 * Returns all products. Supports ?category= filter.
 */
app.get("/api/products", async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.badge)    filter.badge    = req.query.badge;

    const products = await Product.find({ inStock: true, ...filter })
      .sort({ createdAt: -1 });
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/products/:id
 * Returns single product.
 */
app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json({ product });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/products  (admin only — add auth check in production)
 * Seed / add a product.
 */
app.post("/api/products", verifyToken, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ message: "Product created", product });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  CART
// ─────────────────────────────────────────────

/**
 * GET /api/cart
 * Returns the user's current cart.
 */
app.get("/api/cart", verifyToken, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.uid });
    res.json({ items: cart?.items || [] });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/cart
 * Replaces the user's cart with the sent items.
 * Body: { items: [{ productId, quantity }] }
 */
app.post("/api/cart", verifyToken, async (req, res) => {
  try {
    const { items } = req.body;

    // Validate
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "items must be an array" });
    }

    const cart = await Cart.findOneAndUpdate(
      { userId: req.user.uid },
      { $set: { items, updatedAt: new Date() } },
      { new: true, upsert: true }
    );

    res.json({ message: "Cart updated", cart });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * DELETE /api/cart
 * Clears the user's cart.
 */
app.delete("/api/cart", verifyToken, async (req, res) => {
  try {
    await Cart.findOneAndUpdate(
      { userId: req.user.uid },
      { $set: { items: [], updatedAt: new Date() } }
    );
    res.json({ message: "Cart cleared" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────
//  ORDERS
// ─────────────────────────────────────────────

/**
 * POST /api/orders
 * Creates a new order from current cart.
 * Body: { items, totalPrice }
 */
app.post("/api/orders", verifyToken, async (req, res) => {
  try {
    const { items, totalPrice, address, paymentMethod, paymentStatus, transactionId } = req.body;

    if (!items?.length) {
      return res.status(400).json({ error: "Order must have at least one item" });
    }

    const isOnline = (paymentMethod || "COD").toUpperCase() === "ONLINE";
    let orderStatus = isOnline ? "pending_payment" : "placed";
    
    // If payment is already completed (e.g. via QR flow), set status to placed
    if (paymentStatus === "paid") {
      orderStatus = "placed";
    }

    const order = await Order.create({
      userId: req.user.uid,
      items,
      totalPrice,
      address: address || "",
      paymentMethod: (paymentMethod || "COD").toUpperCase(),
      orderStatus,
      paymentStatus: paymentStatus || "pending",
      paymentDetails: transactionId ? { transactionId, paidAt: new Date() } : undefined
    });

    // Clear cart after order
    await Cart.findOneAndUpdate(
      { userId: req.user.uid },
      { $set: { items: [], updatedAt: new Date() } }
    );

    console.log(`✅ New order by ${req.user.email}: ₹${totalPrice}`);
    res.status(201).json({ message: "Order placed", order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/orders
 * Returns all orders for the logged-in user.
 */
app.get("/api/orders", verifyToken, async (req, res) => {
  try {
    console.log("Fetching orders for:", req.user.uid);
    const orders = await Order.find({ userId: req.user.uid })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/orders/:id
 * Returns a single order (must belong to user).
 */
app.get("/api/orders/:id", verifyToken, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id:    req.params.id,
      userId: req.user.uid,
    });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/orders/:id/pay
 * Confirms payment for an ONLINE order.
 */
app.post("/api/orders/:id/pay", verifyToken, async (req, res) => {
  try {
    const { transactionId } = req.body;
    const order = await Order.findOne({ _id: req.params.id, userId: req.user.uid });

    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.paymentMethod !== "ONLINE") return res.status(400).json({ error: "Only ONLINE orders need payment confirmation" });

    order.paymentStatus = "paid";
    order.orderStatus   = "placed";
    order.paymentDetails = { transactionId, paidAt: new Date() };
    order.updatedAt      = new Date();
    await order.save();

    res.json({ message: "Payment confirmed", order });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * PATCH /api/orders/:id/status
 * Update order status (admin use).
 */
app.patch("/api/orders/:id/status", verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ error: "Order not found" });

    // ─────────────────────────────────────────────
    //  DELIVERY SAFETY CHECK
    // ─────────────────────────────────────────────
    if (order.paymentMethod === "ONLINE" && order.paymentStatus !== "paid") {
      if (["shipped", "delivered"].includes(status)) {
        return res.status(400).json({ error: "Cannot ship/deliver unpaid ONLINE order" });
      }
    }

    order.orderStatus = status;
    order.updatedAt   = new Date();
    await order.save();

    res.json({ message: "Status updated", order });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/orders/:id/delivered
 * Mark order as delivered (admin/delivery use).
 */
app.post("/api/orders/:id/delivered", verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Safety: mark as delivered only if paid (for Online)
    if (order.paymentMethod === "ONLINE" && order.paymentStatus !== "paid") {
      return res.status(400).json({ error: "Cannot mark unpaid ONLINE order as delivered" });
    }

    order.orderStatus = "delivered";
    order.updatedAt   = new Date();
    await order.save();

    res.json({ message: "Order marked as delivered", order });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});



/**
 * GET /api/qrcode
 * returns a QR code URL for UPI payment (simulated)
 */
app.get("/api/qrcode", verifyToken, async (req, res) => {
  const { amount } = req.query;
  const upiId = "7447526042@upi";
  const upiUrl = `upi://pay?pa=${upiId}&pn=GloceryShop&am=${amount}&cu=INR`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;
  res.json({ qr: qrUrl, upi: upiId });
});

// ─────────────────────────────────────────────
//  404 HANDLER
// ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ─────────────────────────────────────────────
//  GLOBAL ERROR HANDLER
// ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// ─────────────────────────────────────────────
//  START SERVER
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Glocery Shop API running at http://localhost:${PORT}`);
  console.log(`📦 Endpoints:`);
  console.log(`   POST   /api/user`);
  console.log(`   GET    /api/user/me`);
  console.log(`   POST   /api/profile`);
  console.log(`   GET    /api/products`);
  console.log(`   POST   /api/products`);
  console.log(`   GET    /api/cart`);
  console.log(`   POST   /api/cart`);
  console.log(`   DELETE /api/cart`);
  console.log(`   GET    /api/orders`);
  console.log(`   POST   /api/orders`);
  console.log(`   GET    /api/orders/:id`);
  console.log(`   PATCH  /api/orders/:id/status`);
});

module.exports = app;
