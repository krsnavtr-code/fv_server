const pool = require('../db');

async function setupCourseTables() {
    try {
        const connection = await pool.getConnection();
        console.log('Connected to the database');

        // Disable foreign key checks to allow table restructuring
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        console.log('Foreign key checks disabled');

        // Drop existing tables if they exist
        await connection.query('DROP TABLE IF EXISTS course_materials');
        await connection.query('DROP TABLE IF EXISTS courses');
        await connection.query('DROP TABLE IF EXISTS categories');
        console.log('Dropped existing tables if they existed');

        // Create categories table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('Created categories table');

        // Insert default categories
        const defaultCategories = [
            { name: 'Web Development', description: 'Courses related to web development technologies' },
            { name: 'Mobile Development', description: 'Courses related to mobile app development' },
            { name: 'Data Science', description: 'Courses related to data analysis and machine learning' },
            { name: 'Design', description: 'Courses related to UI/UX and graphic design' },
            { name: 'Business', description: 'Courses related to business management and entrepreneurship' },
            { name: 'Marketing', description: 'Courses related to digital marketing and advertising' },
            { name: 'Personal Development', description: 'Courses related to personal growth and skills' }
        ];

        for (const category of defaultCategories) {
            await connection.query(
                'INSERT INTO categories (name, description) VALUES (?, ?)',
                [category.name, category.description]
            );
        }
        console.log('Inserted default categories');

        // Create courses table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS courses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                category_id INT,
                level ENUM('Beginner', 'Intermediate', 'Advanced') DEFAULT 'Beginner',
                duration VARCHAR(50),
                price DECIMAL(10, 2) DEFAULT 0.00,
                prerequisites TEXT,
                learningObjectives TEXT,
                curriculum TEXT,
                courseOverview TEXT,
                keyFeatures TEXT,
                skills TEXT,
                benefits TEXT,
                status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
                thumbnail_url VARCHAR(255),
                faqs JSON,
                instructor_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
                FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log('Created courses table');

        // Create course materials table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS course_materials (
                id INT AUTO_INCREMENT PRIMARY KEY,
                course_id INT NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(255) NOT NULL,
                file_type VARCHAR(50),
                file_size INT,
                upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                description TEXT,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
            )
        `);
        console.log('Created course_materials table');

        // Show all current tables
        const [tables] = await connection.query('SHOW TABLES');
        console.log('Current tables in database:');
        tables.forEach(table => {
            const tableName = Object.values(table)[0];
            console.log(` - ${tableName}`);
        });

        // Re-enable foreign key checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('Foreign key checks re-enabled');

        // Release the connection
        connection.release();
        console.log('Database setup completed successfully');
        
        process.exit(0);
    } catch (error) {
        console.error('Error setting up course tables:', error);
        process.exit(1);
    }
}

// Run the setup
setupCourseTables();
