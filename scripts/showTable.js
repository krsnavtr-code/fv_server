const db = require('../config/db');

async function showTable() {
  try {
    console.log('Showing admin_users table structure...');
    
    // Show table structure
    const [columns] = await db.query('SHOW COLUMNS FROM admin_users');
    console.log('admin_users table columns:');
    console.table(columns);
    
    // Show table data
    const [rows] = await db.query('SELECT * FROM admin_users');
    console.log('\nCurrent admin_users data:');
    console.table(rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    db.end();
  }
}

showTable();
