const pool = require('../db');

async function optimizeCourseDatabase() {
    try {
        const connection = await pool.getConnection();
        console.log('Connected to the database');

        // Disable foreign key checks to allow clean table restructuring
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        console.log('Foreign key checks disabled');

        // Find and drop all tables that reference courses
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
        }

        // Drop existing courses table
        await connection.query('DROP TABLE IF EXISTS courses');
        console.log('Dropped courses table if it existed');

        // Create optimized courses table based on form input
        await connection.query(`
            CREATE TABLE courses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                category_id INT,
                description TEXT,
                courseOverview TEXT,
                keyFeatures TEXT,
                skills TEXT,
                benefits TEXT,
                prerequisites TEXT,
                learningObjectives TEXT,
                curriculum TEXT,
                level ENUM('Beginner', 'Intermediate', 'Advanced') DEFAULT 'Beginner',
                duration VARCHAR(100) DEFAULT '4 weeks',
                price DECIMAL(10, 2) DEFAULT 0,
                faqs TEXT,
                thumbnail_url VARCHAR(255) NULL,
                status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
                instructor_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
            )
        `);
        console.log('Created optimized courses table');

        // Create course_materials table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS course_materials (
                id INT AUTO_INCREMENT PRIMARY KEY,
                course_id INT NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(255) NOT NULL,
                file_type VARCHAR(50),
                file_size INT,
                upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
        console.log('Database optimization completed successfully');
        
        process.exit(0);
    } catch (error) {
        console.error('Error optimizing database:', error);
        process.exit(1);
    }
}

// Run the optimization
optimizeCourseDatabase();
