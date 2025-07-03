const db = require('../config/db');
const bcrypt = require('bcryptjs');

async function recreateAdminTable() {
  try {
    console.log('Dropping and recreating admin_users table...');
    
    // Drop the existing table if it exists
    await db.query('DROP TABLE IF EXISTS admin_users');
    console.log('✅ Dropped existing admin_users table');
    
    // Create the table with the correct structure
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
    console.log('✅ Created new admin_users table');
    
    // Create the default admin user
    const username = 'developer';
    const email = 'developer@example.com';
    const name = 'Developer Admin';
    const password = 'KRSn@123';
    const role = 'admin';
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Insert the admin user
    await db.query(
      `INSERT INTO admin_users (username, email, name, password, role) 
       VALUES (?, ?, ?, ?, ?)`,
      [username, email, name, hashedPassword, role]
    );
    
    console.log('✅ Created default admin user');
    console.log('\n🔑 Admin User Credentials:');
    console.log(`👤 Username: ${username}`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`👑 Role: ${role}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    db.end();
  }
}

// Run the function
recreateAdminTable();
