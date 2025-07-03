const db = require('../config/db');

async function checkAdminTable() {
  try {
    console.log('Checking admin_users table structure...');
    
    // Check if table exists
    const [tables] = await db.query(
      "SHOW TABLES LIKE 'admin_users'"
    );
    
    if (tables.length === 0) {
      console.log('admin_users table does not exist. Creating it...');
      await db.query(`
        CREATE TABLE admin_users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(255) NOT NULL UNIQUE,
          email VARCHAR(255) UNIQUE,
          name VARCHAR(255),
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'admin',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created admin_users table');
      return;
    }
    
    // Describe the table
    const [columns] = await db.query('DESCRIBE admin_users');
    console.log('admin_users table structure:');
    console.table(columns);
    
  } catch (error) {
    console.error('Error checking admin_users table:', error);
  } finally {
    // Close the connection
    db.end();
  }
}

checkAdminTable();
