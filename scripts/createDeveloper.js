const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function createDeveloper() {
  try {
    const email = 'developer@example.com';
    const name = 'Developer Admin';
    const password = 'KRSn@123';
    const role = 'admin';

    // Check if user already exists
    const [existingUser] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (existingUser.length > 0) {
      // Update existing user
      await db.query(
        'UPDATE users SET name = ?, password = ?, role = ?, is_active = 1, updated_at = NOW() WHERE email = ?',
        [name, password, role, email]
      );
      console.log(`✅ Updated existing user: ${email}`);
    } else {
      // Create new user
      await db.query(
        `INSERT INTO users (name, email, password, role, is_active, email_verified_at, created_at, updated_at) 
         VALUES (?, ?, ?, ?, 1, NOW(), NOW(), NOW())`,
        [name, email, password, role]
      );
      console.log(`✅ Created new user: ${email}`);
    }

    console.log('\n🔑 Developer Admin Credentials:');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password} (stored in plain text)`);
    console.log(`👑 Role: ${role}`);
    console.log('✅ Status: Active');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating/updating developer user:', error);
    process.exit(1);
  }
}

createDeveloper();
