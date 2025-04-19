const mysql = require('mysql2/promise');
const dbConfig = require('../config/dbConfig');

async function checkAndFixSchema() {
    try {
        // Create a connection to the database
        const connection = await mysql.createConnection({
            host: dbConfig.HOST,
            user: dbConfig.USER,
            password: dbConfig.PASSWORD,
            database: dbConfig.DB
        });

        console.log('Connected to database successfully');

        // Check users table structure
        const [usersColumns] = await connection.query('SHOW COLUMNS FROM users');
        console.log('\nUsers table structure:');
        usersColumns.forEach(col => {
            console.log(`- ${col.Field} (${col.Type})`);
        });

        // Check if users table has an id column
        const hasUserId = usersColumns.some(col => col.Field === 'id');
        if (!hasUserId) {
            console.error('Error: Users table does not have an id column');
            return;
        }

        // Check courses table structure
        const [coursesColumns] = await connection.query('SHOW COLUMNS FROM courses');
        console.log('\nCourses table structure:');
        coursesColumns.forEach(col => {
            console.log(`- ${col.Field} (${col.Type})`);
        });

        // Check foreign key constraints
        const [constraints] = await connection.query(
            'SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME ' +
            'FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE ' +
            'WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL ' +
            'AND TABLE_NAME = "courses"'
        );

        console.log('\nForeign key constraints:');
        constraints.forEach(constraint => {
            console.log(`- ${constraint.CONSTRAINT_NAME}: ${constraint.COLUMN_NAME} -> ${constraint.REFERENCED_TABLE_NAME}.${constraint.REFERENCED_COLUMN_NAME}`);
        });

        // Check for any users in the system
        const [users] = await connection.query('SELECT id FROM users LIMIT 1');
        const hasUsers = users.length > 0;

        if (!hasUsers) {
            console.error('Error: No users found in the system. Please create an admin user first.');
            return;
        }

        // Check if instructor_id exists in courses table
        const hasInstructorId = coursesColumns.some(col => col.Field === 'instructor_id');
        if (!hasInstructorId) {
            console.log('Adding instructor_id column to courses table...');
            await connection.query(
                'ALTER TABLE courses ADD COLUMN instructor_id INT, ' +
                'ADD FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL'
            );
            console.log('instructor_id column added successfully');
        }

        await connection.end();
        console.log('Database connection closed');
        
    } catch (error) {
        console.error('Error checking database schema:', error);
    }
}

// Run the function
checkAndFixSchema();
