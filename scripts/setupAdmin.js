const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function setupAdmin() {
  try {
    console.log('Setting up admin user...');
    
    // Create admin_users table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
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
    
    console.log('✅ Verified/Created admin_users table');
    
    // Admin user details
    const username = 'developer';
    const email = 'developer@example.com';
    const name = 'Developer Admin';
    const password = 'KRSn@123';
    const role = 'admin';
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Check if admin user exists by username
    const [existingAdmin] = await db.query(
      'SELECT * FROM admin_users WHERE username = ?', 
      [username]
    );
    
    if (existingAdmin.length > 0) {
      // Update existing admin user
      await db.query(
        `UPDATE admin_users 
         SET email = ?, name = ?, password = ?, role = ?, updated_at = NOW() 
         WHERE username = ?`,
        [email, name, hashedPassword, role, username]
      );
      console.log(`✅ Updated existing admin user: ${username}`);
    } else {
      // Create new admin user
      await db.query(
        `INSERT INTO admin_users (username, email, name, password, role) 
         VALUES (?, ?, ?, ?, ?)`,
        [username, email, name, hashedPassword, role]
      );
      console.log(`✅ Created new admin user: ${username}`);
    }
    
    console.log('\n🔑 Admin User Credentials:');
    console.log(`👤 Username: ${username}`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`👑 Role: ${role}`);
    
  } catch (error) {
    console.error('❌ Error setting up admin user:', error);
  } finally {
    // Close the connection
    db.end();
  }
}

// Run the setup
setupAdmin();
