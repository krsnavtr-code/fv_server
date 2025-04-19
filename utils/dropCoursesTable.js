const mysql = require('mysql2/promise');
const dbConfig = require('../config/dbConfig');

async function dropCoursesTable() {
  try {
    // Create a connection to the database
    const connection = await mysql.createConnection({
      host: dbConfig.HOST,
      user: dbConfig.USER,
      password: dbConfig.PASSWORD,
      database: dbConfig.DB
    });

    console.log('Connected to database successfully');

    // First, check if the table exists
    const [tables] = await connection.query('SHOW TABLES LIKE ?', ['courses']);
    
    if (tables.length > 0) {
      console.log('Courses table found. Attempting to drop it...');
      
      // Drop the table
      await connection.query('DROP TABLE IF EXISTS courses');
      console.log('Courses table has been successfully dropped');
      
      // Also drop related tables if they exist
      const relatedTables = ['course_materials', 'course_reviews', 'course_enrollments'];
      for (const table of relatedTables) {
        try {
          await connection.query(`DROP TABLE IF EXISTS ${table}`);
          console.log(`${table} table dropped successfully`);
        } catch (err) {
          console.log(`${table} table does not exist or could not be dropped`);
        }
      }
    } else {
      console.log('Courses table does not exist in the database');
    }

    await connection.end();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Error dropping courses table:', error);
  }
}

// Run the function
dropCoursesTable();
