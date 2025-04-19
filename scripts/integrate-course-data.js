const pool = require('../db');

// Sample course data from the Courses.jsx component
const sampleCourses = [
    {
        id: 1,
        name: "React Basics",
        duration: "6 weeks",
        startDate: "April 10, 2025",
        description: "Master the fundamentals of React.js, including components, props, state, and hooks.",
        price: 499,
        image: "/Images/study-one.jpg",
        objectives: [
            "Build responsive web applications",
            "Understand React component lifecycle",
            "Implement state management",
            "Create reusable components"
        ]
    },
    {
        id: 2,
        name: "Node.js Fundamentals",
        duration: "8 weeks",
        startDate: "April 20, 2025",
        description: "Learn server-side JavaScript with Node.js, Express.js, and MongoDB.",
        price: 599,
        image: "/Images/study-two.jpg",
        objectives: [
            "Build RESTful APIs",
            "Implement authentication",
            "Work with databases",
            "Deploy Node.js applications"
        ]
    },
    {
        id: 3,
        name: "SQL & Databases",
        duration: "5 weeks",
        startDate: "May 1, 2025",
        description: "Master SQL queries and database design principles.",
        price: 399,
        image: "/Images/study-three.jpg",
        objectives: [
            "Write complex SQL queries",
            "Design database schemas",
            "Implement data relationships",
            "Optimize database performance"
        ]
    },
    {
        id: 4,
        name: "Advanced React",
        duration: "7 weeks",
        startDate: "May 15, 2025",
        description: "Take your React skills to the next level with advanced topics like Redux, React Router, and Webpack.",
        price: 699,
        image: "/Images/study-one.jpg",
        objectives: [
            "Build complex React applications",
            "Implement state management with Redux",
            "Use React Router for client-side routing",
            "Optimize application performance"
        ]
    },
    {
        id: 5,
        name: "Express.js & APIs",
        duration: "6 weeks",
        startDate: "June 1, 2025",
        description: "Learn to build RESTful APIs with Express.js and Node.js.",
        price: 599,
        image: "/Images/study-two.jpg",
        objectives: [
            "Build RESTful APIs",
            "Implement authentication",
            "Work with databases",
            "Deploy Node.js applications"
        ]
    },
    {
        id: 6,
        name: "MongoDB Essentials",
        duration: "5 weeks",
        startDate: "June 10, 2025",
        description: "Master MongoDB fundamentals, including data modeling, querying, and indexing.",
        price: 499,
        image: "/Images/study-three.jpg",
        objectives: [
            "Design MongoDB databases",
            "Implement data relationships",
            "Optimize database performance",
            "Work with MongoDB queries"
        ]
    },
    {
        id: 7,
        name: "Full-Stack MERN",
        duration: "10 weeks",
        startDate: "June 25, 2025",
        description: "Learn to build full-stack applications with MongoDB, Express.js, React, and Node.js.",
        price: 999,
        image: "/Images/study-one.jpg",
        objectives: [
            "Build full-stack applications",
            "Implement authentication",
            "Work with databases",
            "Deploy Node.js applications"
        ]
    },
    {
        id: 8,
        name: "DevOps & Deployment",
        duration: "6 weeks",
        startDate: "July 5, 2025",
        description: "Learn to deploy and manage applications with Docker, Kubernetes, and AWS.",
        price: 699,
        image: "/Images/study-two.jpg",
        objectives: [
            "Deploy applications with Docker",
            "Manage applications with Kubernetes",
            "Work with AWS services",
            "Implement continuous integration and deployment"
        ]
    }
];

async function integrateCourseData() {
    try {
        const connection = await pool.getConnection();
        console.log('Connected to the database');

        // Disable foreign key checks to allow table restructuring
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        console.log('Foreign key checks disabled');

        // Find and drop all tables that reference courses
        console.log('Finding tables with foreign key references to courses...');
        const [referenceTables] = await connection.query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE REFERENCED_TABLE_NAME = 'courses' 
            AND TABLE_SCHEMA = DATABASE();
        `);
        
        if (referenceTables.length > 0) {
            console.log(`Found ${referenceTables.length} tables referencing courses`);
            for (const ref of referenceTables) {
                console.log(`Dropping referencing table: ${ref.TABLE_NAME}`);
                await connection.query(`DROP TABLE IF EXISTS ${ref.TABLE_NAME}`);
            }
        }

        // Drop and recreate courses table
        await connection.query('DROP TABLE IF EXISTS courses');
        console.log('Dropped courses table if it existed');

        // Create comprehensive courses table that includes all fields from both sources
        await connection.query(`
            CREATE TABLE courses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                category_id INT,
                description TEXT,
                duration VARCHAR(100) DEFAULT '4 weeks',
                startDate DATETIME,
                price DECIMAL(10, 2) DEFAULT 0,
                image_url VARCHAR(255),
                level ENUM('Beginner', 'Intermediate', 'Advanced') DEFAULT 'Beginner',
                status ENUM('draft', 'published', 'archived') DEFAULT 'published',
                instructor_id INT,
                prerequisites TEXT,
                learningObjectives TEXT,
                objectives TEXT,
                curriculum TEXT,
                faqs TEXT,
                thumbnail_url VARCHAR(255),
                courseOverview TEXT,
                keyFeatures TEXT,
                skills TEXT,
                benefits TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
            )
        `);
        console.log('Created comprehensive courses table');

        // Create course_materials table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS course_materials (
                id INT AUTO_INCREMENT PRIMARY KEY,
                course_id INT NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(255) NOT NULL,
                file_type VARCHAR(50),
                file_size INT,
                upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
            )
        `);
        console.log('Created course_materials table');

        // Insert sample course data from Courses.jsx
        console.log('Inserting sample course data...');
        
        for (const course of sampleCourses) {
            // Convert objectives array to JSON string
            const objectivesJSON = JSON.stringify(course.objectives);
            
            // Parse date in the format "April 10, 2025" to a MySQL date
            const dateParts = course.startDate.split(' ');
            const month = new Date(Date.parse(dateParts[0] + " 1, 2000")).getMonth() + 1;
            const day = parseInt(dateParts[1]);
            const year = parseInt(dateParts[2]);
            const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            
            await connection.query(
                `INSERT INTO courses (
                    title, description, duration, startDate, price, 
                    image_url, objectives, status, level, category_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    course.name,
                    course.description,
                    course.duration,
                    formattedDate,
                    course.price,
                    course.image,
                    objectivesJSON,
                    'published',
                    'Beginner',
                    1 // Default category ID
                ]
            );
            
            console.log(`Added course: ${course.name}`);
        }
        
        // Show all current tables
        const [tables] = await connection.query('SHOW TABLES');
        console.log('Current tables in database:');
        tables.forEach(table => {
            const tableName = Object.values(table)[0];
            console.log(` - ${tableName}`);
        });

        // Re-enable foreign key checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('Foreign key checks re-enabled');

        // Release the connection
        connection.release();
        console.log('Database integration completed successfully');
        
        process.exit(0);
    } catch (error) {
        console.error('Error integrating course data:', error);
        process.exit(1);
    }
}

// Run the integration
integrateCourseData();
