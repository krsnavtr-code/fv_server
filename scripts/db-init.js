const pool = require('../db');

async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();
        console.log('Connected to the database');

        // First, disable foreign key checks to allow dropping tables
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        console.log('Foreign key checks disabled for table operations');

        // Create categories table if it doesn't exist
        await connection.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                slug VARCHAR(100) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('Categories table created or already exists');

        // Check if categories exist, if not add default categories
        const [categories] = await connection.query('SELECT COUNT(*) as count FROM categories');
        if (categories[0].count === 0) {
            await connection.query(`
                INSERT INTO categories (name, slug, description) VALUES
                ('Web Development', 'web-development', 'Learn web development technologies'),
                ('Mobile Development', 'mobile-development', 'Learn mobile app development'),
                ('Data Science', 'data-science', 'Learn data analysis and machine learning'),
                ('Design', 'design', 'Learn UX/UI and graphic design'),
                ('Business', 'business', 'Learn business skills and strategies'),
                ('Marketing', 'marketing', 'Learn digital marketing skills'),
                ('Personal Development', 'personal-development', 'Improve personal skills')
            `);
            console.log('Default categories added');
        }

        // Find and drop all tables that reference courses first
        console.log('Finding tables with foreign key references to courses...');
        const [referenceTables] = await connection.query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE REFERENCED_TABLE_NAME = 'courses' 
            AND TABLE_SCHEMA = DATABASE();
        `);
        
        if (referenceTables.length > 0) {
            console.log(`Found ${referenceTables.length} tables referencing courses`);
            for (const ref of referenceTables) {
                console.log(`Dropping referencing table: ${ref.TABLE_NAME}`);
                await connection.query(`DROP TABLE IF EXISTS ${ref.TABLE_NAME}`);
            }
        } else {
            console.log('No referencing tables found');
        }

        // Now drop course_materials and courses
        await connection.query('DROP TABLE IF EXISTS course_materials');
        console.log('Dropped course_materials table');
        await connection.query('DROP TABLE IF EXISTS courses');
        console.log('Dropped courses table');

        // Create courses table with proper schema based on form fields
        await connection.query(`
            CREATE TABLE courses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                duration VARCHAR(100),
                startDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                price DECIMAL(10, 2) DEFAULT 0,
                maxStudents INT DEFAULT 100,
                language VARCHAR(50) DEFAULT 'English',
                level VARCHAR(50) DEFAULT 'Beginner',
                objectives TEXT,
                learningOutcomes TEXT,
                category_id INT,
                instructor_id INT,
                thumbnail_url VARCHAR(255),
                curriculum TEXT,
                status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
                faqs TEXT,
                skills TEXT,
                benefits TEXT,
                courseOverview TEXT,
                keyFeatures TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
            )
        `);
        console.log('Courses table created');

        // Create course_materials table for file uploads
        await connection.query(`
            CREATE TABLE course_materials (
                id INT AUTO_INCREMENT PRIMARY KEY,
                course_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                file_path VARCHAR(255) NOT NULL,
                file_type VARCHAR(50),
                size INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
            )
        `);
        console.log('Course materials table created');

        // Check for any other tables that might need to be removed
        const [tables] = await connection.query('SHOW TABLES');
        const tableNames = tables.map(table => Object.values(table)[0]);
        
        console.log('Current tables in database:', tableNames.join(', '));
        
        // Re-enable foreign key checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('Foreign key checks re-enabled');
        
        // Release the connection
        connection.release();
        console.log('Database initialization completed successfully');
        
        // Exit after completion
        process.exit(0);
    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
}

// Run the initialization
initializeDatabase();
