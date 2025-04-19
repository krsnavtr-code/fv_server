const mysql = require('mysql2/promise');
const dbConfig = require('../config/dbConfig');

const pool = mysql.createPool({
    host: dbConfig.HOST,
    user: dbConfig.USER,
    password: dbConfig.PASSWORD,
    database: dbConfig.DB,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

class Course {
    constructor() {
        // Pool is already created at the top of the file
    }

    async getAllCourses() {
        const [rows] = await pool.query(
            `SELECT c.*, i.name as instructor_name, cat.name as category_name 
             FROM courses c 
             LEFT JOIN users i ON c.instructor_id = i.id 
             LEFT JOIN categories cat ON c.category_id = cat.id 
             ORDER BY c.created_at DESC`
        );
        return rows;
    }

    async getCourseById(id) {
        const [rows] = await pool.query(
            `SELECT c.*, i.name as instructor_name, cat.name as category_name 
             FROM courses c 
             LEFT JOIN users i ON c.instructor_id = i.id 
             LEFT JOIN categories cat ON c.category_id = cat.id 
             WHERE c.id = ?`,
            [id]
        );
        return rows[0];
    }

    async createCourse(courseData) {
        console.log('Course model: createCourse called with data:', JSON.stringify(courseData, null, 2));
        try {
            // First, get the category ID from the category name
            let category_id = 1; // Default to first category
            if (courseData.category) {
                const categoryMap = {
                    'web-development': 1,
                    'mobile-development': 2,
                    'data-science': 3,
                    'design': 4,
                    'business': 5,
                    'marketing': 6,
                    'personal-development': 7
                };
                category_id = categoryMap[courseData.category] || 1;
            }

            // Set instructor ID - use the authenticated user's ID from JWT token
            const instructor_id = courseData.instructor_id || 1; // Default to ID 1 if not available

            // Log the SQL query for debugging
            const sql = `INSERT INTO courses 
                (title, description, category_id, level, duration, price, 
                 prerequisites, learningObjectives, curriculum, status,
                 thumbnail_url, faqs, skills, benefits, courseOverview, keyFeatures,
                 instructor_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            
            console.log('SQL query:', sql);
            console.log('Query params:', [
                courseData.title || '',
                courseData.description || '',
                category_id,
                courseData.level || 'Beginner',
                courseData.duration || '4 weeks',
                courseData.price || 0,
                courseData.prerequisites || '',
                courseData.learningObjectives || '',
                courseData.curriculum || '',
                courseData.status || 'draft',
                courseData.thumbnail_url || null,
                courseData.faqs || '[]',
                courseData.skills || '',
                courseData.benefits || '',
                courseData.courseOverview || '',
                courseData.keyFeatures || '',
                instructor_id
            ]);
            
            const [result] = await pool.query(
                sql,
                [
                    courseData.title || '',
                    courseData.description || '',
                    category_id,
                    courseData.level || 'Beginner',
                    courseData.duration || '4 weeks',
                    courseData.price || 0,
                    courseData.prerequisites || '',
                    courseData.learningObjectives || '',
                    courseData.curriculum || '',
                    courseData.status || 'draft',
                    courseData.thumbnail_url || null,
                    courseData.faqs || '[]',
                    courseData.skills || '',
                    courseData.benefits || '',
                    courseData.courseOverview || '',
                    courseData.keyFeatures || '',
                    instructor_id
                ]
            );
            console.log('Course created successfully with ID:', result.insertId);
            return result.insertId;
        } catch (error) {
            console.error('Error in Course.createCourse:', error);
            throw error;
        }
    }

    async updateCourse(id, courseData) {
        const [result] = await pool.query(
            `UPDATE courses SET 
             title = ?, description = ?, duration = ?, startDate = ?, price = ?, 
             maxStudents = ?, language = ?, level = ?, objectives = ?, 
             learningOutcomes = ?, category_id = ? 
             WHERE id = ?`,
            [
                courseData.title,
                courseData.description,
                courseData.duration,
                courseData.startDate,
                courseData.price,
                courseData.maxStudents,
                courseData.language,
                courseData.level,
                courseData.objectives,
                courseData.learningOutcomes,
                courseData.category_id,
                id
            ]
        );
        return result.affectedRows > 0;
    }

    async purchaseCourse(userId, courseId, purchaseData) {
        // First check if course exists and has available seats
        const [course] = await this.pool.query(
            `SELECT * FROM courses WHERE id = ? AND enrolledStudents < maxStudents`,
            [courseId]
        );

        if (!course[0]) {
            throw new Error('Course not found or fully booked');
        }

        // Create purchase record
        const [purchaseResult] = await this.pool.query(
            `INSERT INTO course_purchases 
             (course_id, user_id, full_name, email, phone, address, 
              payment_method, amount, comments) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                courseId,
                userId,
                purchaseData.fullName,
                purchaseData.email,
                purchaseData.phone,
                purchaseData.address,
                purchaseData.paymentMethod,
                course[0].price,
                purchaseData.comments
            ]
        );

        // Update course enrollment
        const [updateResult] = await this.pool.query(
            `UPDATE courses SET enrolledStudents = enrolledStudents + 1 WHERE id = ?`,
            [courseId]
        );

        return purchaseResult.insertId;
    }

    async deleteCourse(id) {
        try {
            // Delete the course
            const [result] = await this.pool.query(
                `DELETE FROM courses WHERE id = ?`,
                [id]
            );
            
            // TODO: Delete associated materials if you have a separate materials table
            // Assuming there's a course_materials table linked to courses
            // await this.pool.query(`DELETE FROM course_materials WHERE course_id = ?`, [id]);
            
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting course:', error);
            throw error;
        }
    }
}

module.exports = new Course();
