const mysql = require('mysql2/promise');
const dbConfig = require('../config/dbConfig');

async function fixCoursesTable() {
  try {
    // Create a connection to the database
    const connection = await mysql.createConnection({
      host: dbConfig.HOST,
      user: dbConfig.USER,
      password: dbConfig.PASSWORD,
      database: dbConfig.DB
    });

    console.log('Connected to database successfully');

    // First, get the current table structure
    const [columns] = await connection.query('SHOW COLUMNS FROM courses');
    console.log('Current columns in courses table:');
    columns.forEach(col => {
      console.log(`- ${col.Field} (${col.Type})`);
    });

    // Check if language column exists
    const languageColumnExists = columns.some(col => col.Field === 'language');
    
    if (languageColumnExists) {
      // If language column exists but is causing issues, drop it
      console.log('Dropping language column from courses table...');
      await connection.query('ALTER TABLE courses DROP COLUMN language');
      console.log('Language column removed successfully');
    } else {
      console.log('Language column does not exist in the courses table');
      
      // Look for other potential issues
      console.log('Checking for other potential issues...');
      
      // Get the expected columns from the courseData object in the controller
      const expectedColumns = [
        'title', 'description', 'category_id', 'level', 'duration', 'price',
        'instructor_id', 'thumbnail_path', 'prerequisites', 'learningObjectives',
        'curriculum', 'courseOverview', 'keyFeatures', 'skills', 'benefits',
        'status', 'faqs'
      ];
      
      // Find columns that exist in the code but not in the database
      const missingColumns = expectedColumns.filter(
        col => !columns.some(dbCol => dbCol.Field === col)
      );
      
      if (missingColumns.length > 0) {
        console.log('Found columns in code that are missing from database:');
        missingColumns.forEach(col => console.log(`- ${col}`));
        
        // Suggest SQL to add these columns
        console.log('\nTo add these columns, you can use the following SQL:');
        missingColumns.forEach(col => {
          let dataType = 'VARCHAR(255)';
          if (col === 'price') dataType = 'DECIMAL(10,2)';
          if (col === 'faqs') dataType = 'TEXT';
          if (col === 'description' || col === 'curriculum') dataType = 'TEXT';
          
          console.log(`ALTER TABLE courses ADD COLUMN ${col} ${dataType};`);
        });
      } else {
        console.log('All expected columns exist in the database');
      }
    }

    await connection.end();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Error fixing courses table:', error);
  }
}

// Run the function
fixCoursesTable();
