const db = require('../config/db');

const setupGuestTeachers = async () => {
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS guest_teachers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                phone VARCHAR(20) NOT NULL,
                specialization VARCHAR(100) NOT NULL,
                availability TEXT NOT NULL,
                rate DECIMAL(10,2) NOT NULL,
                status ENUM('active', 'inactive', 'pending') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        console.log('Guest teachers table created/verified successfully');
    } catch (error) {
        console.error('Error setting up guest teachers table:', error);
        throw error;
    }
};

module.exports = setupGuestTeachers;
