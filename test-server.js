const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('dev'));

// Mock database for testing
const mockDb = {
  courses: [
    {
      id: 1,
      title: 'Full Stack Web Development',
      description: 'Learn full stack development with React and Node.js',
      category_id: 1,
      instructor_id: 1,
      status: 'published',
      price: 99.99,
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      title: 'Mobile App Development',
      description: 'Build cross-platform mobile apps with React Native',
      category_id: 2,
      instructor_id: 2,
      status: 'draft',
      price: 79.99,
      created_at: new Date().toISOString()
    }
  ],
  categories: [
    { id: 1, name: 'Web Development', description: 'Full stack web development courses' },
    { id: 2, name: 'Mobile Development', description: 'Mobile app development courses' },
    { id: 3, name: 'Data Science', description: 'Data science and analytics courses' }
  ],
  users: [
    { id: 1, name: 'Admin User', email: 'admin@example.com', role: 'admin' },
    { id: 2, name: 'Instructor', email: 'instructor@example.com', role: 'instructor' }
  ]
};

// API Router for all /api routes
const apiRouter = express.Router();
app.use('/api', apiRouter);

// Test route to verify server is running
apiRouter.get('/', (req, res) => {
  console.log('API root accessed');
  res.json({ message: 'API is running', timestamp: new Date().toISOString() });
});

// Categories route
apiRouter.get('/categories', (req, res) => {
  console.log('Categories route accessed');
  res.json({
    success: true,
    data: mockDb.categories
  });
});

// Courses route (regular users)
apiRouter.get('/courses', (req, res) => {
  console.log('Regular courses route accessed');
  res.json({
    success: true,
    data: mockDb.courses
  });
});

// Admin courses route
apiRouter.get('/admin/courses', (req, res) => {
  console.log('Admin courses route accessed');
  res.json({
    success: true,
    data: mockDb.courses
  });
});

// Course creation endpoint (regular users)
apiRouter.post('/courses/create', (req, res) => {
  console.log('Course creation route accessed:', req.body);
  const { title, description, category_id, instructor_id, status = 'draft', price = 0 } = req.body;
  
  // Simple validation
  if (!title || !description) {
    return res.status(400).json({
      success: false,
      message: 'Title and description are required'
    });
  }
  
  // Create a new course in mock database
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
  
  res.status(201).json({
    success: true,
    message: 'Course created successfully',
    data: newCourse
  });
});

// Admin course creation endpoint (bypass auth for testing)
apiRouter.post('/admin/courses/direct', (req, res) => {
  console.log('Admin course creation route accessed:', req.body);
  const { title, description, category_id, instructor_id, status = 'draft', price = 0 } = req.body;
  
  // Simple validation
  if (!title || !description) {
    return res.status(400).json({
      success: false,
      message: 'Title and description are required'
    });
  }
  
  // Create a new course in mock database
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
  
  res.status(201).json({
    success: true,
    message: 'Course created successfully via direct route',
    data: newCourse
  });
});

// Course update endpoint
apiRouter.put('/admin/courses/:id', (req, res) => {
  const courseId = parseInt(req.params.id);
  const courseData = req.body;
  
  console.log('Updating course:', courseId, 'with data:', courseData);
  
  // Find and update the course
  const courseIndex = mockDb.courses.findIndex(c => c.id === courseId);
  if (courseIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }
  
  mockDb.courses[courseIndex] = {
    ...mockDb.courses[courseIndex],
    ...courseData,
    updated_at: new Date().toISOString()
  };
  
  res.json({
    success: true,
    message: 'Course updated successfully',
    data: mockDb.courses[courseIndex]
  });
});

// Course delete endpoint
apiRouter.delete('/admin/courses/:id', (req, res) => {
  const courseId = parseInt(req.params.id);
  
  console.log('Deleting course:', courseId);
  
  // Find and remove the course
  const courseIndex = mockDb.courses.findIndex(c => c.id === courseId);
  if (courseIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }
  
  mockDb.courses.splice(courseIndex, 1);
  
  res.json({
    success: true,
    message: 'Course deleted successfully'
  });
});

// Auth routes
apiRouter.post('/auth/login', (req, res) => {
  console.log('Login attempt:', req.body);
  const { email, password } = req.body;

  // For testing, accept any email and password
  const user = mockDb.users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Generate a mock token
  const token = 'Bearer mock-token-for-testing';
  
  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

apiRouter.post('/auth/admin/login', (req, res) => {
  console.log('Admin login attempt:', req.body);
  const { username, password } = req.body;

  // For testing, accept any username and password
  const admin = mockDb.users.find(u => u.role === 'admin');
  if (!admin) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Generate a mock token
  const token = 'Bearer mock-token-for-testing';
  
  res.json({
    success: true,
    message: 'Admin login successful',
    token,
    admin: {
      id: admin.id,
      username: admin.name,
      role: admin.role
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`API URL: http://localhost:${PORT}/api`);
  console.log('Available endpoints:');
  console.log('- GET /api/categories');
  console.log('- GET /api/courses');
  console.log('- GET /api/admin/courses');
  console.log('- POST /api/courses/create');
  console.log('- POST /api/admin/courses/direct');
  console.log('- PUT /api/admin/courses/:id');
  console.log('- DELETE /api/admin/courses/:id');
  console.log('- POST /api/auth/login');
  console.log('- POST /api/auth/admin/login');
});
