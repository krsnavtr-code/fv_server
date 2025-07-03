const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'firstvite'
};

async function checkDatabase() {
    try {
        // Create connection
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database:', dbConfig.database);
        
        try {
            // Check users table
            console.log('\n=== USERS TABLE ===');
            const [users] = await connection.query('SELECT id, name, email, role FROM users ORDER BY id ASC');
            console.log('Total users:', users.length);
            users.forEach((user, index) => {
                console.log(`\nUser ${index + 1}:`);
                console.log('ID:', user.id);
                console.log('Name:', user.name);
                console.log('Email:', user.email);
                console.log('Role:', user.role);
            });

            // Check categories table
            console.log('\n=== CATEGORIES TABLE ===');
            const [categories] = await connection.query('SELECT * FROM categories ORDER BY id ASC');
            console.log('Total categories:', categories.length);
            categories.forEach((category, index) => {
                console.log(`\nCategory ${index + 1}:`);
                console.log('ID:', category.id);
                console.log('Name:', category.name);
                console.log('Slug:', category.slug);
                console.log('Description:', category.description);
            });

            // Check courses table structure
            console.log('\n=== COURSES TABLE STRUCTURE ===');
            const [columns] = await connection.query('DESCRIBE courses');
            console.log('Columns:', columns);

        } finally {
            // Close the connection
            await connection.end();
            console.log('Database connection closed');
        }
    } catch (error) {
        console.error('Error checking database:', error);
        process.exit(1);
    }
}

// Run the check function
checkDatabase();
