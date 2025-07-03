const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const xss = require('xss-clean');
const path = require('path');
const verifyToken = require("./middleware/authMiddleware");
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'development') {
  console.error('NODE_ENV is not set to production or development');
  process.exit(1);
}

// Skip database connection for testing
// const connection = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const guestTeachersRoutes = require('./routes/guestTeachersRoutes');
const courseRoutes = require('./routes/courseRoutes');
const adminCourseRoutes = require('./routes/adminCourseRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const { setupAdmin } = require('./utils/setupAdmin');
const { createDefaultCategories } = require('./controllers/categoryController');
const app = express();

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(xss());
app.use(hpp());

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads', 'profile-pictures');
const fs = require('fs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Skip database connection for testing
console.log('Running in test mode without database connection');

// Mock database for testing
const mockDb = {
  courses: [],
  categories: [
    { id: 1, name: 'Web Development' },
    { id: 2, name: 'Mobile Development' },
    { id: 3, name: 'Data Science' }
  ],
  users: [
    { id: 1, name: 'Admin User', email: 'admin@example.com', role: 'admin' },
    { id: 2, name: 'Instructor', email: 'instructor@example.com', role: 'instructor' }
  ]
};

// Set mock database on app
app.set('mockDb', mockDb);

// Test routes for direct access (no auth required)
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Direct admin course routes for testing (bypasses authentication)
app.post('/api/admin/courses/test', (req, res) => {
  console.log('Admin courses test route accessed:', req.body);
  return res.status(200).json({
    success: true,
    message: 'Admin courses test route is working!',
    data: req.body
  });
});

// Direct admin course creation route (bypasses authentication for testing)
app.post('/api/admin/courses/direct', (req, res) => {
  console.log('Direct course creation route accessed:', req.body);
  const { title, description, category_id, instructor_id, status = 'draft', price = 0 } = req.body;
  
  // Simple validation
  if (!title || !description) {
    return res.status(400).json({
      success: false,
      message: 'Title and description are required'
    });
  }
  
  // Return success response with mock data
  return res.status(201).json({
    success: true,
    message: 'Course created successfully via direct route',
    data: {
      id: Math.floor(Math.random() * 1000) + 1,
      title,
      description,
      category_id: category_id || 1,
      instructor_id: instructor_id || 1,
      status,
      price,
      created_at: new Date().toISOString()
    }
  });
});

// API Routes
const apiRouter = express.Router();
app.use('/api', apiRouter);

// Mount all routes on the apiRouter
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/employees', employeeRoutes);
apiRouter.use('/guest-teachers', guestTeachersRoutes);
apiRouter.use('/courses', courseRoutes);
apiRouter.use('/admin/courses', adminCourseRoutes);
apiRouter.use('/categories', categoryRoutes);

// Serve static files from the React app
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/build')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
    });
}

// Additional direct routes for testing

// Direct course creation endpoint (no auth required for testing)
app.post('/api/courses/create', (req, res) => {
  const { title, description, category_id, instructor_id, status = 'draft', price = 0 } = req.body;
  console.log('Received course creation request:', req.body);
  
  // Simple validation
  if (!title || !description) {
    return res.status(400).json({
      success: false,
      message: 'Title and description are required'
    });
  }
  
  // Create a new course in mock database
  const mockDb = app.get('mockDb');
  const newCourse = {
    id: Math.floor(Math.random() * 1000) + 1,
    title,
    description,
    category_id: category_id || 1,
    instructor_id: instructor_id || 1,
    status,
    price,
    created_at: new Date().toISOString()
  };
  
  mockDb.courses.push(newCourse);
  console.log('Course created successfully:', newCourse);
  
  // Return success response with course data
  return res.status(201).json({
    success: true,
    message: 'Course created successfully',
    data: newCourse
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'MulterError') {
    return res.status(400).json({
      message: 'File upload error',
      error: err.message
    });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      message: 'File too large',
      error: 'Maximum file size is 5MB'
    });
  }

  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.stack : {}
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
// Start server
const startServer = async () => {
  try {
    // Setup admin user if it doesn't exist
    await setupAdmin();
    
    // Create default categories if they don't exist
    await createDefaultCategories();
    
    const PORT = process.env.PORT || 5000;
    const HOST = process.env.HOST || 'localhost';
    
    app.listen(PORT, HOST, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode at http://${HOST}:${PORT}`);
      console.log(`API Base URL: http://${HOST}:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
