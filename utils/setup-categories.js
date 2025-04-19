const db = require('../config/db');

async function setupCategories() {
    try {
        console.log('Setting up default categories...');
        
        // Get database connection
        const connection = await db.getConnection();
        console.log('Database connection obtained');
        
        try {
            // First check if any categories exist
            const [existingCategories] = await connection.query('SELECT COUNT(*) as count FROM categories');
            
            if (existingCategories[0].count > 0) {
                console.log('Categories already exist in database');
                return;
            }
            
            // Insert default categories
            const defaultCategories = [
                { name: 'Web Development', slug: 'web-development' },
                { name: 'Data Science', slug: 'data-science' },
                { name: 'Mobile Development', slug: 'mobile-development' },
                { name: 'Design', slug: 'design' },
                { name: 'Business', slug: 'business' },
                { name: 'Marketing', slug: 'marketing' },
                { name: 'Personal Development', slug: 'personal-development' }
            ];
            
            console.log('Inserting default categories...');
            
            for (const category of defaultCategories) {
                const [result] = await connection.query(
                    'INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)',
                    [category.name, category.slug, '']
                );
                console.log(`Added category: ${category.name} (ID: ${result.insertId})`);
            }
            
            console.log('All default categories added successfully');
        } finally {
            // Release the connection back to the pool
            connection.release();
        }
    } catch (error) {
        console.error('Error setting up categories:', error);
        process.exit(1);
    }
}

// Run the setup function
setupCategories();
