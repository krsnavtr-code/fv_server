const bcrypt = require('bcryptjs');
const db = require('../config/db');

// Function to ensure the email column exists in admin_users
async function ensureEmailColumn() {
  try {
    // Check if email column exists
    const [columns] = await db.query(
      `SELECT * FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = 'firstvite' 
       AND TABLE_NAME = 'admin_users' 
       AND COLUMN_NAME = 'email'`
    );

    if (columns.length === 0) {
      console.log('Adding email column to admin_users table...');
      await db.query(
        'ALTER TABLE admin_users ADD COLUMN email VARCHAR(255) UNIQUE AFTER username'
      );
      console.log('✅ Added email column to admin_users table');
    }
  } catch (error) {
    console.error('Error ensuring email column exists:', error);
    throw error;
  }
}

async function createDeveloper() {
  try {
    // Ensure the email column exists
    await ensureEmailColumn();
    
    const username = 'developer';
    const email = 'developer@example.com';
    const name = 'Developer Admin';
    const password = 'KRSn@123';
    const role = 'admin';

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Check if admin user already exists by email
    const [existingAdmin] = await db.query('SELECT * FROM admin_users WHERE email = ?', [email]);

    if (existingAdmin.length > 0) {
      // Update existing admin user
      await db.query(
        'UPDATE admin_users SET username = ?, name = ?, password = ?, role = ?, updated_at = NOW() WHERE email = ?',
        [username, name, hashedPassword, role, email]
      );
      console.log(`✅ Updated existing admin user: ${email}`);
    } else {
      // Create new admin user
      await db.query(
        'INSERT INTO admin_users (username, email, name, password, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [username, email, name, hashedPassword, role]
      );
      console.log(`✅ Created new admin user: ${email}`);
    }

    console.log('\n🔑 Developer Admin Credentials:');
    console.log(`👤 Username: ${username}`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`👑 Role: ${role}`);
    console.log('✅ Status: Active');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating/updating developer user:', error);
    process.exit(1);
  }
}

createDeveloper();
