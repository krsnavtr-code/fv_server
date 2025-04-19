const mysql = require('mysql2/promise');

async function checkDatabaseIds() {
    try {
        // Get database connection
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'firstvite_app'
        });

        // Check categories
        console.log('\n=== CATEGORIES ===');
        const [categories] = await connection.query('SELECT * FROM categories ORDER BY id ASC');
        console.log('Total categories:', categories.length);
        categories.forEach((category, index) => {
            console.log(`\nCategory ${index + 1}:`);
            console.log('ID:', category.id);
            console.log('Name:', category.name);
            console.log('Slug:', category.slug);
        });

        // Check users
        console.log('\n=== USERS ===');
        const [users] = await connection.query('SELECT id, name, email, role FROM users ORDER BY id ASC');
        console.log('Total users:', users.length);
        users.forEach((user, index) => {
            console.log(`\nUser ${index + 1}:`);
            console.log('ID:', user.id);
            console.log('Name:', user.name);
            console.log('Email:', user.email);
            console.log('Role:', user.role);
        });

        // Check courses
        console.log('\n=== COURSES ===');
        const [courses] = await connection.query('SELECT * FROM courses ORDER BY id ASC LIMIT 5');
        console.log('Total courses:', courses.length);
        courses.forEach((course, index) => {
            console.log(`\nCourse ${index + 1}:`);
            console.log('ID:', course.id);
            console.log('Title:', course.title);
            console.log('Category ID:', course.category_id);
            console.log('Instructor ID:', course.instructor_id);
            console.log('Status:', course.status);
        });

        // Check for orphaned courses (courses with invalid category_id or instructor_id)
        console.log('\n=== CHECKING ORPHANED COURSES ===');
        const [orphanedCourses] = await connection.query(`
            SELECT c.* 
            FROM courses c
            LEFT JOIN categories cat ON c.category_id = cat.id
            LEFT JOIN users u ON c.instructor_id = u.id
            WHERE cat.id IS NULL OR u.id IS NULL
        `);
        
        if (orphanedCourses.length > 0) {
            console.log('\nFound orphaned courses:');
            orphanedCourses.forEach((course, index) => {
                console.log(`\nOrphaned Course ${index + 1}:`);
                console.log('ID:', course.id);
                console.log('Title:', course.title);
                console.log('Category ID:', course.category_id);
                console.log('Instructor ID:', course.instructor_id);
            });
        } else {
            console.log('No orphaned courses found');
        }

    } catch (error) {
        console.error('Error checking database:', error);
    }
}

// Run the check function
checkDatabaseIds();
