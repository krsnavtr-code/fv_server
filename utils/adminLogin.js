const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

// Function to create an admin user if one doesn't exist
async function createAdminIfNotExists() {
  try {
    // Check if admin user exists
    const [rows] = await db.query('SELECT * FROM admin_users LIMIT 1');
    
    if (rows.length === 0) {
      console.log('No admin users found. Creating default admin user...');
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      // Insert admin user
      await db.query(
        'INSERT INTO admin_users (username, password, created_at) VALUES (?, ?, NOW())',
        ['admin', hashedPassword]
      );
      
      console.log('Default admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error checking/creating admin user:', error);
  }
}

// Function to generate an admin token
async function generateAdminToken() {
  try {
    // Create admin user if it doesn't exist
    await createAdminIfNotExists();
    
    // Get admin user
    const [rows] = await db.query('SELECT * FROM admin_users LIMIT 1');
    
    if (rows.length === 0) {
      console.error('No admin users found');
      return null;
    }
    
    const admin = rows[0];
    
    // Generate token
    const token = jwt.sign({ 
      id: admin.id, 
      username: admin.username,
      role: "admin" 
    }, process.env.JWT_SECRET, { 
      expiresIn: "24h" 
    });
    
    console.log('Admin token generated successfully');
    console.log('------------------------');
    console.log('Copy this token for testing:');
    console.log(token);
    console.log('------------------------');
    
    return token;
  } catch (error) {
    console.error('Error generating admin token:', error);
    return null;
  }
}

// Run the function
generateAdminToken()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
