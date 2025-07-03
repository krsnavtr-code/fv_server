require("dotenv").config({ path: "config.env" });
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const xss = require("xss-clean");
const hpp = require("hpp");
const rateLimit = require("express-rate-limit");
const fileUpload = require("express-fileupload");

// Set default JWT secret if not defined in env
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "your-secret-key-change-this-in-production";
}

const path = require("path");

// Import database pool configuration
const pool = require("./config/db");

// Import routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const guestTeachersRoutes = require("./routes/guestTeachersRoutes");
const contentRoutes = require("./routes/contentRoutes");
const supportRoutes = require("./routes/supportRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const userPaymentRoutes = require("./routes/userPaymentRoutes");
const courseRoutes = require("./routes/courseRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const refreshTokenRoutes = require("./routes/refreshTokenRoutes");

// Initialize express app
const app = express();

// Set database connection on app
app.set("db", pool);

// Enable CORS for all routes at the very beginning
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'https://firstvite.com',
    'https://api.firstvite.com'
  ];
  
  const origin = req.headers.origin;
  const isAllowedOrigin = !origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development';
  
  if (isAllowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    console.log('CORS: Allowed origin:', origin || '*');
  } else {
    console.log('CORS: Blocked origin:', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Log CORS headers for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('CORS Headers Set:', {
      'Access-Control-Allow-Origin': res.getHeader('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Methods': res.getHeader('Access-Control-Allow-Methods'),
      'Access-Control-Allow-Headers': res.getHeader('Access-Control-Allow-Headers'),
      'Access-Control-Allow-Credentials': res.getHeader('Access-Control-Allow-Credentials')
    });
  }
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    console.log('CORS: Handling OPTIONS preflight request');
    return res.status(200).end();
  }
  
  next();
});

// Security middleware
app.use(helmet());
app.use(xss());
app.use(hpp());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Apply rate limiting to API routes
app.use("/api", limiter);

// Log all requests in development
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload middleware
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
    createParentPath: true,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
    abortOnLimit: true,
    responseOnLimit: "File size is too large. Max allowed size is 50MB.",
  })
);

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, "uploads", "profile-pictures");
if (!require("fs").existsSync(uploadDir)) {
  require("fs").mkdirSync(uploadDir, { recursive: true });
}

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/guest-teachers", guestTeachersRoutes);
app.use("/api/admin/content", contentRoutes);
app.use("/api/admin/support", supportRoutes);
app.use("/api/admin/payments", paymentRoutes);
app.use("/api/user/payments", userPaymentRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/categories", categoryRoutes);

// Test route
app.get("/api/test", (req, res) => {
  res.json({ message: "API is working!" });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Something went wrong!",
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Initialize admin user
  const { setupAdmin } = require("./utils/setupAdmin");
  setupAdmin().catch(console.error);
});


// for vps hosting
// app.listen(PORT, "0.0.0.0", () => {
//   console.log(`Server running on http://0.0.0.0:${PORT}`);
//   const { setupAdmin } = require("./utils/setupAdmin");
//   setupAdmin().catch(console.error);
// });

