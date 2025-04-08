const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const fileUpload = require('express-fileupload');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Set default JWT secret if not defined in env
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'your-secret-key-change-this-in-production';
}

const path = require('path');

// Database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',  // XAMPP MySQL default has no password
  database: process.env.DB_NAME || 'firstvite_app',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
pool.getConnection()
  .then(connection => {
    console.log('Database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('Error connecting to the database:', err);
    console.log('Please make sure XAMPP MySQL service is running');
    process.exit(1); // Exit process if database connection fails
  });

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const guestTeachersRoutes = require('./routes/guestTeachersRoutes');
const contentRoutes = require('./routes/contentRoutes');
const supportRoutes = require('./routes/supportRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const userPaymentRoutes = require('./routes/userPaymentRoutes');
const courseRoutes = require('./routes/courseRoutes');

// Initialize express app
const app = express();

// Set database connection on app
app.set('db', pool);

// Security middleware
app.use(helmet());
app.use(xss());
app.use(hpp());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// Basic middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload middleware
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  createParentPath: true,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  abortOnLimit: true,
  responseOnLimit: 'File size is too large. Max allowed size is 50MB.'
}));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads', 'profile-pictures');
if (!require('fs').existsSync(uploadDir)) {
  require('fs').mkdirSync(uploadDir, { recursive: true });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/guest-teachers', guestTeachersRoutes);
app.use('/api/admin/content', contentRoutes);
app.use('/api/admin/support', supportRoutes);
app.use('/api/admin/payments', paymentRoutes);
app.use('/api/user/payments', userPaymentRoutes);
app.use('/api/courses', courseRoutes);

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Something went wrong!'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Initialize admin user
  const { setupAdmin } = require('./utils/setupAdmin');
  setupAdmin().catch(console.error);
});
