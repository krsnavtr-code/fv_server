const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'firstvite'
};

async function checkCategories() {
    try {
        // Create connection
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database:', dbConfig.database);
        
        try {
            // Get all categories
            const [categories] = await connection.query('SELECT * FROM categories ORDER BY id ASC');
            
            console.log('\n=== CATEGORIES IN DATABASE ===');
            console.log('Total categories:', categories.length);
            
            if (categories.length === 0) {
                console.log('No categories found in database');
                console.log('You should create some categories first!');
                return;
            }
            
            console.log('\nCategory Details:');
            categories.forEach((category, index) => {
                console.log(`\nCategory ${index + 1}:`);
                console.log('ID:', category.id);
                console.log('Name:', category.name);
                console.log('Slug:', category.slug);
                console.log('Description:', category.description || 'No description');
            });
            
        } finally {
            // Close the connection
            await connection.end();
            console.log('Database connection closed');
        }
    } catch (error) {
        console.error('Error checking categories:', error);
        process.exit(1);
    }
}

// Run the check function
checkCategories();
