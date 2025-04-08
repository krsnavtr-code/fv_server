const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { hashPassword } = require('./hashPassword');

async function setupAdmin() {
  try {
    // Create admin_users table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if admin user exists
    const [rows] = await db.query('SELECT * FROM admin_users WHERE username = ?', ['admin']);

    if (rows.length === 0) {
      // Create admin user with hashed password
      const hashedPassword = await hashPassword('Admin@123');
      await db.query(
        'INSERT INTO admin_users (username, password) VALUES (?, ?)',
        ['admin', hashedPassword]
      );
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
      // Verify the stored password
      const admin = rows[0];
      const isValidPassword = await bcrypt.compare('Admin@123', admin.password);
      console.log('Stored password is valid:', isValidPassword);
      if (!isValidPassword) {
        console.log('Updating admin password');
        const hashedPassword = await hashPassword('Admin@123');
        await db.query(
          'UPDATE admin_users SET password = ? WHERE username = ?',
          [hashedPassword, 'admin']
        );
        console.log('Admin password updated successfully');
      }
    }

  } catch (error) {
    console.error('Error setting up admin user:', error);
    throw error;
  }
}

module.exports = { setupAdmin };
