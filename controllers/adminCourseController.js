const mysql = require('mysql2/promise');
const dbConfig = require('../config/db');
const logger = console;

// Get all courses for admin
exports.getAllCourses = async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        
        // Get all courses with category information
        const [courses] = await connection.query(`
            SELECT c.*, cat.name as category_name, u.username as instructor_name
            FROM courses c
            LEFT JOIN categories cat ON c.category_id = cat.id
            LEFT JOIN users u ON c.instructor_id = u.id
            ORDER BY c.created_at DESC
        `);

        logger.info(`Retrieved ${courses.length} courses for admin`);
        
        return res.status(200).json({
            success: true,
            data: courses
        });
    } catch (error) {
        logger.error('Error getting courses for admin:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve courses',
            error: error.message
        });
    } finally {
        if (connection) {
            await connection.end();
            logger.debug('Database connection closed');
        }
    }
};

// Get all categories
exports.getAllCategories = async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        
        // Get all categories
        const [categories] = await connection.query(`
            SELECT * FROM categories
            ORDER BY name ASC
        `);

        logger.info(`Retrieved ${categories.length} categories`);
        
        return res.status(200).json({
            success: true,
            data: categories
        });
    } catch (error) {
        logger.error('Error getting categories:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve categories',
            error: error.message
        });
    } finally {
        if (connection) {
            await connection.end();
            logger.debug('Database connection closed');
        }
    }
};

// Create a new course (admin version)
exports.createCourse = async (req, res) => {
    let connection;
    try {
        const { title, description, category_id, instructor_id, price, status, duration, level, language } = req.body;
        
        // Log the request for debugging
        console.log('Create course request received:', req.body);
        
        // Basic validation
        if (!title || !description) {
            return res.status(400).json({
                success: false,
                message: 'Title and description are required'
            });
        }
        
        // For development/testing, we can proceed without a database connection
        if (process.env.NODE_ENV === 'development' && process.env.MOCK_DB === 'true') {
            console.log('Using mock database for course creation');
            return res.status(201).json({
                success: true,
                message: 'Course created successfully (mock)',
                data: {
                    id: Math.floor(Math.random() * 1000) + 1,
                    title,
                    description,
                    category_id: category_id || 1,
                    instructor_id: instructor_id || 1,
                    price: price || 0,
                    status: status || 'draft',
                    duration: duration || 0,
                    level: level || 'beginner',
                    language: language || 'en',
                    created_at: new Date()
                }
            });
        }
        
        connection = await mysql.createConnection(dbConfig);
        
        // Check if category exists if provided
        if (category_id) {
            const [categoryCheck] = await connection.query(
                'SELECT id FROM categories WHERE id = ?',
                [category_id]
            );
            
            if (categoryCheck.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: `Category with ID ${category_id} does not exist`
                });
            }
        }
        
        // Insert course
        const [result] = await connection.query(
            `INSERT INTO courses 
            (title, description, category_id, instructor_id, price, status, duration, level, language, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [title, description, category_id, instructor_id, price || 0, status || 'draft', duration || 0, level || 'beginner', language || 'en']
        );
        
        const courseId = result.insertId;
        
        // If there are additional arrays like requirements, learning_outcomes, etc., insert them too
        const { requirements, learning_outcomes, prerequisites } = req.body;
        
        if (requirements && Array.isArray(requirements) && requirements.length > 0) {
            for (const requirement of requirements) {
                await connection.query(
                    'INSERT INTO course_requirements (course_id, requirement) VALUES (?, ?)',
                    [courseId, requirement]
                );
            }
        }
        
        if (learning_outcomes && Array.isArray(learning_outcomes) && learning_outcomes.length > 0) {
            for (const outcome of learning_outcomes) {
                await connection.query(
                    'INSERT INTO course_learning_outcomes (course_id, outcome) VALUES (?, ?)',
                    [courseId, outcome]
                );
            }
        }
        
        if (prerequisites && Array.isArray(prerequisites) && prerequisites.length > 0) {
            for (const prerequisite of prerequisites) {
                await connection.query(
                    'INSERT INTO course_prerequisites (course_id, prerequisite) VALUES (?, ?)',
                    [courseId, prerequisite]
                );
            }
        }
        
        logger.info(`Admin created course with ID ${courseId}`);
        
        return res.status(201).json({
            success: true,
            message: 'Course created successfully',
            data: {
                id: courseId,
                title,
                description,
                category_id,
                instructor_id,
                price: price || 0,
                status: status || 'draft',
                duration: duration || 0,
                level: level || 'beginner',
                language: language || 'en',
                created_at: new Date()
            }
        });
    } catch (error) {
        logger.error('Error creating course:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create course',
            error: error.message
        });
    } finally {
        if (connection) {
            await connection.end();
            logger.debug('Database connection closed');
        }
    }
};

// Update a course (admin version)
exports.updateCourse = async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        const { title, description, category_id, instructor_id, price, status } = req.body;
        
        connection = await mysql.createConnection(dbConfig);
        
        // Check if course exists
        const [courseCheck] = await connection.query(
            'SELECT id FROM courses WHERE id = ?',
            [id]
        );
        
        if (courseCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Course with ID ${id} not found`
            });
        }
        
        // Check if category exists if provided
        if (category_id) {
            const [categoryCheck] = await connection.query(
                'SELECT id FROM categories WHERE id = ?',
                [category_id]
            );
            
            if (categoryCheck.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: `Category with ID ${category_id} does not exist`
                });
            }
        }
        
        // Build update query dynamically
        const updates = [];
        const values = [];
        
        if (title) {
            updates.push('title = ?');
            values.push(title);
        }
        
        if (description) {
            updates.push('description = ?');
            values.push(description);
        }
        
        if (category_id) {
            updates.push('category_id = ?');
            values.push(category_id);
        }
        
        if (instructor_id !== undefined) {
            updates.push('instructor_id = ?');
            values.push(instructor_id);
        }
        
        if (price !== undefined) {
            updates.push('price = ?');
            values.push(price);
        }
        
        if (status) {
            updates.push('status = ?');
            values.push(status);
        }
        
        updates.push('updated_at = NOW()');
        
        // Add course ID to values array
        values.push(id);
        
        // Execute update query
        const [result] = await connection.query(
            `UPDATE courses SET ${updates.join(', ')} WHERE id = ?`,
            values
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: `Course with ID ${id} not found or no changes made`
            });
        }
        
        logger.info(`Admin updated course with ID ${id}`);
        
        // Get updated course data
        const [updatedCourse] = await connection.query(
            `SELECT c.*, cat.name as category_name
            FROM courses c
            LEFT JOIN categories cat ON c.category_id = cat.id
            WHERE c.id = ?`,
            [id]
        );
        
        return res.status(200).json({
            success: true,
            message: 'Course updated successfully',
            data: updatedCourse[0]
        });
    } catch (error) {
        logger.error('Error updating course:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update course',
            error: error.message
        });
    } finally {
        if (connection) {
            await connection.end();
            logger.debug('Database connection closed');
        }
    }
};

// Delete a course (admin version)
exports.deleteCourse = async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        
        connection = await mysql.createConnection(dbConfig);
        
        // Check if course exists
        const [courseCheck] = await connection.query(
            'SELECT id FROM courses WHERE id = ?',
            [id]
        );
        
        if (courseCheck.length === 0) {
            return res.status(404).json({
                success: false,
            success: false,
            message: `Course with ID ${id} not found`
        });
    }
        
    // Delete course
    await connection.query(
        'DELETE FROM courses WHERE id = ?',
        [id]
    );
        
    logger.info(`Course with ID ${id} deleted successfully`);
        
    return res.status(200).json({
        success: true,
        message: 'Course deleted successfully'
    });
} catch (error) {
    logger.error(`Error deleting course with ID ${req.params.id}:`, error);
    return res.status(500).json({
        success: false,
        message: 'Failed to delete course',
        error: error.message
    });
} finally {
    if (connection) {
        await connection.end();
        logger.debug('Database connection closed');
    }
}
};

// Get a course by ID (admin version)
exports.getCourseById = async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
            
        connection = await mysql.createConnection(dbConfig);
            
        // Get course with category information
        const [courses] = await connection.query(`
            SELECT c.*, cat.name as category_name, u.username as instructor_name
            FROM courses c
            LEFT JOIN categories cat ON c.category_id = cat.id
            LEFT JOIN users u ON c.instructor_id = u.id
            WHERE c.id = ?
        `, [id]);
            
        if (courses.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Course with ID ${id} not found`
            });
        }
            
        // Get course requirements
        const [requirements] = await connection.query(
            'SELECT requirement FROM course_requirements WHERE course_id = ?',
            [id]
        );
            
        // Get course learning outcomes
        const [outcomes] = await connection.query(
            'SELECT outcome FROM course_learning_outcomes WHERE course_id = ?',
            [id]
        );
            
        // Get course prerequisites
        const [prerequisites] = await connection.query(
            'SELECT prerequisite FROM course_prerequisites WHERE course_id = ?',
            [id]
        );
            
        // Get course resources
        const [resources] = await connection.query(
            'SELECT * FROM course_resources WHERE course_id = ?',
            [id]
        );
            
        // Get course sections with lessons
        const [sections] = await connection.query(
            'SELECT * FROM course_sections WHERE course_id = ? ORDER BY order_number',
            [id]
        );
            
        // For each section, get its lessons
        for (const section of sections) {
            const [lessons] = await connection.query(
                'SELECT * FROM course_lessons WHERE section_id = ? ORDER BY order_number',
                [section.id]
            );
            section.lessons = lessons;
        }
            
        // Combine all data
        const courseData = {
            ...courses[0],
            requirements: requirements.map(r => r.requirement),
            learning_outcomes: outcomes.map(o => o.outcome),
            prerequisites: prerequisites.map(p => p.prerequisite),
            resources,
            sections
        };
            
        logger.info(`Retrieved course with ID ${id} for admin`);
            
        return res.status(200).json({
            success: true,
            data: courseData
        });
    } catch (error) {
        logger.error(`Error getting course with ID ${req.params.id}:`, error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve course',
            error: error.message
        });
    } finally {
        if (connection) {
            await connection.end();
            logger.debug('Database connection closed');
        }
    }
};

// Publish a course (admin version)
exports.publishCourse = async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
            
        connection = await mysql.createConnection(dbConfig);
            
        // Check if course exists
        const [courseCheck] = await connection.query(
            'SELECT id, status FROM courses WHERE id = ?',
            [id]
        );
            
        if (courseCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Course with ID ${id} not found`
            });
        }
            
        // Update course status to published
        await connection.query(
            'UPDATE courses SET status = ? WHERE id = ?',
            ['published', id]
        );
            
        logger.info(`Course with ID ${id} published successfully`);
            
        return res.status(200).json({
            success: true,
            message: 'Course published successfully'
        });
    } catch (error) {
        logger.error(`Error publishing course with ID ${req.params.id}:`, error);
        return res.status(500).json({
            success: false,
            message: 'Failed to publish course',
            error: error.message
        });
    } finally {
        if (connection) {
            await connection.end();
            logger.debug('Database connection closed');
        }
    }
};
