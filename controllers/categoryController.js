const logger = console;
const pool = require('../config/db'); // Make sure this uses mysql2/promise

// Get all categories
exports.getAllCategories = async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        logger.debug('Fetching categories from database');
        const [categories] = await connection.query(`
            SELECT * FROM categories
            ORDER BY name ASC
        `);

        logger.info(`Retrieved ${categories.length} categories`);
        return res.status(200).json({
            success: true,
            data: categories
        });
    } catch (error) {
        logger.error('Error getting categories:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve categories',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
            logger.debug('Database connection closed');
        }
    }
};

// Create a new category
exports.createCategory = async (req, res) => {
    let connection;
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }

        connection = await pool.getConnection();

        const [existingCategory] = await connection.query(
            'SELECT id FROM categories WHERE name = ?',
            [name]
        );

        if (existingCategory.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Category with name "${name}" already exists`
            });
        }

        const slug = name.toLowerCase().replace(/\s+/g, '-');

        const [result] = await connection.query(
            `INSERT INTO categories (name, description, slug, created_at, updated_at) 
             VALUES (?, ?, ?, NOW(), NOW())`,
            [name, description || '', slug]
        );

        logger.info(`Created category with ID ${result.insertId}`);

        return res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: {
                id: result.insertId,
                name,
                description: description || '',
                slug
            }
        });
    } catch (error) {
        logger.error('Error creating category:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create category',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
            logger.debug('Database connection closed');
        }
    }
};

// Create default categories
exports.createDefaultCategories = async () => {
    let connection;
    try {
        connection = await pool.getConnection();

        const [existingCategories] = await connection.query('SELECT COUNT(*) as count FROM categories');

        if (existingCategories[0].count > 0) {
            logger.info('Categories already exist, skipping default creation'); config
            return;
        }

        const defaultCategories = [
            { name: 'Web Development', description: 'Courses related to web development', slug: 'web-development' },
            { name: 'Mobile Development', description: 'Courses related to mobile app development', slug: 'mobile-development' },
            { name: 'Data Science', description: 'Courses related to data science and analytics', slug: 'data-science' },
            { name: 'Design', description: 'Courses related to design and UX/UI', slug: 'design' },
            { name: 'Business', description: 'Courses related to business and entrepreneurship', slug: 'business' },
            { name: 'Marketing', description: 'Courses related to marketing and sales', slug: 'marketing' }
        ];

        for (const category of defaultCategories) {
            await connection.query(
                `INSERT INTO categories (name, description, slug, created_at, updated_at) 
                 VALUES (?, ?, ?, NOW(), NOW())`,
                [category.name, category.description, category.slug]
            );
        }

        logger.info(`Created ${defaultCategories.length} default categories`);
    } catch (error) {
        logger.error('Error creating default categories:', error);
    } finally {
        if (connection) {
            connection.release();
            logger.debug('Database connection closed');
        }
    }
};
