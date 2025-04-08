const db = require('../config/db');

/**
 * Utility script to check courses table structure and create it if missing
 */
async function checkCoursesTable() {
  try {
    console.log('Checking if courses table exists...');
    
    // Check if table exists
    const [tables] = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'courses'
    `);
    
    if (tables.length === 0) {
      console.log('Courses table not found, creating it...');
      
      // Create the courses table
      await db.query(`
        CREATE TABLE courses (
          id INT PRIMARY KEY AUTO_INCREMENT,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          category_id INT NOT NULL,
          instructor_id INT NOT NULL,
          level VARCHAR(50) DEFAULT 'Beginner',
          duration VARCHAR(50) DEFAULT '4 weeks',
          price DECIMAL(10,2) DEFAULT 0.00,
          prerequisites TEXT,
          learning_objectives TEXT,
          curriculum TEXT,
          status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
          thumbnail_url VARCHAR(255),
          materials TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_category (category_id),
          INDEX idx_instructor (instructor_id),
          INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      
      console.log('Courses table created successfully');
    } else {
      console.log('Courses table exists');
      
      // Check table structure
      const [columns] = await db.query(`SHOW COLUMNS FROM courses`);
      console.log('Courses table structure:');
      columns.forEach(col => {
        console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    }
    
    // Check if categories exist
    const [categories] = await db.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'categories'
    `);
    
    if (categories[0].count === 0) {
      console.log('Categories table not found, creating it...');
      
      // Create the categories table
      await db.query(`
        CREATE TABLE categories (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(100) NOT NULL,
          slug VARCHAR(100) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_slug (slug)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      
      // Insert default categories
      await db.query(`
        INSERT INTO categories (name, slug, description) VALUES
        ('Web Development', 'web-development', 'Courses related to web development'),
        ('Mobile Development', 'mobile-development', 'Courses related to mobile app development'),
        ('Data Science', 'data-science', 'Courses related to data science and analytics'),
        ('Design', 'design', 'Courses related to design'),
        ('Business', 'business', 'Courses related to business'),
        ('Marketing', 'marketing', 'Courses related to marketing'),
        ('Personal Development', 'personal-development', 'Courses related to personal development');
      `);
      
      console.log('Categories table created with default categories');
    } else {
      console.log('Categories table exists');
      
      // Check if we need to insert default categories
      const [categoryCount] = await db.query(`SELECT COUNT(*) as count FROM categories`);
      
      if (categoryCount[0].count === 0) {
        console.log('No categories found, inserting defaults...');
        
        // Insert default categories
        await db.query(`
          INSERT INTO categories (name, slug, description) VALUES
          ('Web Development', 'web-development', 'Courses related to web development'),
          ('Mobile Development', 'mobile-development', 'Courses related to mobile app development'),
          ('Data Science', 'data-science', 'Courses related to data science and analytics'),
          ('Design', 'design', 'Courses related to design'),
          ('Business', 'business', 'Courses related to business'),
          ('Marketing', 'marketing', 'Courses related to marketing'),
          ('Personal Development', 'personal-development', 'Courses related to personal development');
        `);
        
        console.log('Default categories inserted');
      } else {
        // List categories
        const [cats] = await db.query(`SELECT id, name, slug FROM categories`);
        console.log('Available categories:');
        cats.forEach(cat => {
          console.log(`- ID ${cat.id}: ${cat.name} (${cat.slug})`);
        });
      }
    }
    
    console.log('Database check completed');
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    // Close the database connection
    process.exit(0);
  }
}

// Run the script
checkCoursesTable();
