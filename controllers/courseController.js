const Course = require('../models/Course');
const User = require('../models/User');
const { protect, restrictTo } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');

// Course controller class
class CourseController {
    async createCourse(req, res) {
        let connection;
        try {
            console.log('\n=== Course Creation Request ===');
            console.log('Request headers:', req.headers);
            console.log('Request body:', req.body);
            console.log('Content-Type:', req.headers['content-type']);
            console.log('Request user:', req.user);

            // Validate required fields
            const requiredFields = ['title', 'description', 'category_id'];
            const missingFields = requiredFields.filter(field => !req.body[field]);
            
            if (missingFields.length > 0) {
                console.log('Missing required fields:', missingFields);
                return res.status(400).json({
                    success: false,
                    message: `Missing required fields: ${missingFields.join(', ')}`
                });
            }

            // Get database connection
            connection = await db.getConnection();
            
            try {
                // Start transaction
                await connection.beginTransaction();
                
                // Validate category exists
                const [category] = await connection.query(
                    'SELECT id FROM categories WHERE id = ?',
                    [parseInt(req.body.category_id)]
                );
                
                if (!category.length) {
                    console.log('Invalid category ID:', req.body.category_id);
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid category ID. Please select a valid category from the dropdown.'
                    });
                }
                
                // Get category ID as number
                const categoryId = parseInt(category[0].id);
                
                // Get user ID from request
                const userId = req.user.id;
                const isAdmin = req.user.role === 'admin';
                
                // For admin users, we'll use NULL for instructor_id since they're not regular instructors
                const instructorId = isAdmin ? null : userId;
                
                // Insert course
                const [result] = await connection.query(
                    'INSERT INTO courses (title, description, category_id, instructor_id, created_at) VALUES (?, ?, ?, ?, NOW())',
                    [req.body.title, req.body.description, categoryId, instructorId]
                );
                
                // Get course ID
                const courseId = result.insertId;
                
                // Commit transaction
                await connection.commit();
                
                console.log('Course created successfully with ID:', courseId);
                
                return res.status(201).json({
                    success: true,
                    message: 'Course created successfully',
                    data: {
                        id: courseId,
                        title: req.body.title,
                        description: req.body.description,
                        category_id: categoryId,
                        instructor_id: instructorId
                    }
                });
            } catch (error) {
                // Rollback transaction on error
                await connection.rollback();
                
                console.error('=== Detailed Course Creation Error ===');
                console.error('Error Type:', error.constructor.name);
                console.error('Error Message:', error.message);
                console.error('Stack Trace:', error.stack);
                
                // Log database-specific errors
                if (error.sql) {
                    console.error('SQL Query:', error.sql);
                    console.error('SQL State:', error.sqlState);
                    console.error('SQL Error Code:', error.errno);
                    console.error('SQL Error Message:', error.sqlMessage);
                }
                
                // Log request data
                console.error('Request Data:', {
                    title: req.body.title,
                    description: req.body.description,
                    category_id: req.body.category_id,
                    userId: req.user.id,
                    isAdmin: req.user.role === 'admin'
                });
                
                // Return appropriate error response based on error type
                if (error.errno === 1452) { // Foreign key constraint error
                    if (req.user.role === 'admin') {
                        return res.status(400).json({
                            success: false,
                            message: 'Invalid category or instructor ID. Please check your input and try again.'
                        });
                    } else {
                        return res.status(400).json({
                            success: false,
                            message: 'Your account is not properly set up as an instructor. Please contact support.'
                        });
                    }
                } else if (error.errno === 1062) { // Duplicate entry error
                    return res.status(400).json({
                        success: false,
                        message: 'A course with this title already exists.'
                    });
                } else {
                    return res.status(500).json({
                        success: false,
                        message: 'Server error while creating course',
                        error: {
                            message: error.message,
                            code: error.code,
                            sql: error.sql,
                            sqlMessage: error.sqlMessage
                        }
                    });
                }
            }

            // Get user ID from request
            const userId = req.user?.id;
            
            console.log('User data from token:', {
                id: userId,
                role: req.user.role
            });
            
            if (!userId) {
                console.log('No user ID in request');
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            
            // Check if the user exists in the users table
            let userExists = false;
            let instructorId = null; // Default to NULL for instructor_id
            
            try {
                // Check if user exists in users table
                const [user] = await connection.query(
                    'SELECT id FROM users WHERE id = ?',
                    [userId]
                );
                
                if (user.length > 0) {
                    console.log('User found in users table with ID:', userId);
                    userExists = true;
                    instructorId = userId; // Use the actual user ID
                } else {
                    console.log('User not found in users table. Will use NULL for instructor_id');
                    // We'll use NULL for instructor_id to avoid foreign key constraint issues
                }
            } catch (dbError) {
                console.error('Error checking user existence:', dbError);
                // Continue with NULL instructor_id
            }
            
            // For non-admin users, we still want to validate they exist
            if (!req.user.role === 'admin') {
                // For non-admin users, validate they exist in the users table

                try {
                    const [user] = await connection.query(
                        'SELECT id FROM users WHERE id = ?',
                        [userId]
                    );
                    
                    if (!user.length) {
                        console.log('Invalid user ID:', userId);
                        return res.status(401).json({
                            success: false,
                            message: 'Invalid user. Please log in again.'
                        });
                    }
                } catch (dbError) {
                    console.error('Database error during user validation:', dbError);
                    return res.status(500).json({
                        success: false,
                        message: 'Database error during user validation'
                    });
                }
            }

        } catch (dbError) {
            console.error('Database error:', {
                message: dbError.message,
                code: dbError.code,
                sql: dbError.sql,
                sqlMessage: dbError.sqlMessage
            });
            
            // Handle specific database errors
            if (dbError.code === 'ER_NO_REFERENCED_ROW_2') {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid category or instructor ID. Please check your input and try again.'
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Database error: ' + dbError.message
            });
        } finally {
            connection.release();
        }
    }

    async updateCourse(req, res) {
        try {
            const courseId = req.params.id;
            const courseData = req.body;
            
            // Get database connection from pool
            const connection = await db.getConnection();
            console.log('Database connection obtained');
            
            try {
                // Handle file uploads
                let thumbnailPath = null;
                if (req.files && req.files.thumbnail) {
                    const uploadDir = path.join(__dirname, '../../public/uploads/courses/thumbnails');
                    if (!fs.existsSync(uploadDir)) {
                        fs.mkdirSync(uploadDir, { recursive: true });
                    }
                    const thumbnail = req.files.thumbnail;
                    const ext = path.extname(thumbnail.name).toLowerCase();
                    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
                    
                    if (!allowedExtensions.includes(ext)) {
                        return res.status(400).json({
                            success: false,
                            message: 'Invalid file type. Only JPG, JPEG, PNG, and GIF are allowed.'
                        });
                    }
                    
                    thumbnailPath = path.join(uploadDir, `${Date.now()}${ext}`);
                    await thumbnail.mv(thumbnailPath);
                }

                // Update course
                const updateData = {
                    title: courseData.title,
                    description: courseData.description,
                    category_id: courseData.category_id,
                    level: courseData.level,
                    duration: courseData.duration,
                    price: courseData.price,
                    prerequisites: courseData.prerequisites,
                    learningObjectives: courseData.learningObjectives,
                    curriculum: courseData.curriculum,
                    courseOverview: courseData.courseOverview,
                    keyFeatures: courseData.keyFeatures,
                    skills: courseData.skills,
                    benefits: courseData.benefits,
                    status: courseData.status,
                    thumbnail_url: thumbnailPath ? path.relative(path.join(__dirname, '../../public'), thumbnailPath) : null,
                    faqs: JSON.stringify(courseData.faqs || [])
                };

                const [result] = await connection.query(
                    'UPDATE courses SET ? WHERE id = ?',
                    [updateData, courseId]
                );

                if (result.affectedRows === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Course not found'
                    });
                }

                res.status(200).json({
                    success: true,
                    message: 'Course updated successfully'
                });
            } finally {
                // Release the connection back to the pool
                connection.release();
            }
        } catch (error) {
            console.error('Error updating course:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update course',
                error: error.message
            });
        }
    }

    async getCourses(req, res) {
        try {
            // Get database connection from pool
            const connection = await db.getConnection();
            console.log('Database connection obtained');
            
            try {
                // Get categories for dropdown
                const [categories] = await connection.query(
                    'SELECT id, name FROM categories ORDER BY name ASC'
                );
                
                // Get courses with joins
                const [courses] = await connection.query(
                    `SELECT c.*, cat.name as category_name, u.name as instructor_name 
                     FROM courses c 
                     LEFT JOIN categories cat ON c.category_id = cat.id 
                     LEFT JOIN users u ON c.instructor_id = u.id 
                     ORDER BY c.created_at DESC`
                );
                
                res.status(200).json({
                    success: true,
                    courses: courses,
                    categories: categories
                });
            } finally {
                // Release the connection back to the pool
                if (connection) connection.release();
            }
        } catch (error) {
            console.error('Error fetching courses:', error);
            res.status(500).json({
                success: false,
                message: 'Server error: ' + error.message
            });
        }
    }

    async getCourse(req, res) {
        try {
            const courseId = req.params.id;
            
            // Get database connection from pool
            const connection = await db.getConnection();
            console.log('Database connection obtained');
            
            try {
                const [course] = await connection.query(
                    `SELECT c.*, cat.name as category_name, u.name as instructor_name 
                     FROM courses c 
                     LEFT JOIN categories cat ON c.category_id = cat.id 
                     LEFT JOIN users u ON c.instructor_id = u.id 
                     WHERE c.id = ?`,
                    [courseId]
                );
                
                if (course.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Course not found'
                    });
                }

                res.status(200).json({
                    success: true,
                    course: course[0]
                });
            } finally {
                // Release the connection back to the pool
                connection.release();
            }
        } catch (error) {
            console.error('Error fetching course:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch course',
                error: error.message
            });
        }
    }

    async deleteCourse(req, res) {
        try {
            const courseId = req.params.id;

            // Get database connection from pool
            const connection = await db.getConnection();
            console.log('Database connection obtained');

            try {
                // Delete course materials first
                await connection.query('DELETE FROM course_materials WHERE course_id = ?', [courseId]);

                // Then delete the course
                const [result] = await connection.query('DELETE FROM courses WHERE id = ?', [courseId]);

                if (result.affectedRows === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Course not found'
                    });
                }

                res.status(200).json({
                    success: true,
                    message: 'Course deleted successfully'
                });
            } finally {
                // Release the connection back to the pool
                connection.release();
            }
        } catch (error) {
            console.error('Error deleting course:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete course',
                error: error.message
            });
        }
    }

    async purchaseCourse(req, res) {
        try {
            const courseId = req.params.id;
            const userId = req.user.id;
            const purchaseData = req.body;

            // Get database connection from pool
            const connection = await db.getConnection();
            console.log('Database connection obtained');
            
            try {
                // Check if course exists
                const [course] = await connection.query('SELECT * FROM courses WHERE id = ?', [courseId]);
                if (course.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Course not found'
                    });
                }

                // Create purchase record
                const [result] = await connection.query(
                    'INSERT INTO course_purchases (user_id, course_id, price, status) VALUES (?, ?, ?, ?)',
                    [userId, courseId, course[0].price, 'pending']
                );

                res.status(200).json({
                    success: true,
                    message: 'Course purchase initiated successfully',
                    purchaseId: result.insertId
                });
            } finally {
                // Release the connection back to the pool
                connection.release();
            }
        } catch (error) {
            console.error('Error purchasing course:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to purchase course',
                error: error.message
            });
        }
    }
}

// Create and export an instance of the controller
const courseController = new CourseController();

module.exports = courseController;
