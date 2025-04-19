const db = require('../config/db');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads/resources'));
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

const getContent = async (req, res) => {
    try {
        const { type } = req.params;
        const [content] = await db.execute(
            'SELECT * FROM content WHERE type = ? ORDER BY updatedAt DESC',
            [type]
        );
        res.json(content);
    } catch (error) {
        console.error('Error fetching content:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getContentById = async (req, res) => {
    try {
        const { id } = req.params;
        const [content] = await db.execute(
            'SELECT * FROM content WHERE id = ?',
            [id]
        );

        if (content.length === 0) {
            return res.status(404).json({ message: 'Content not found' });
        }

        res.json(content[0]);
    } catch (error) {
        console.error('Error fetching content:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const createContent = async (req, res) => {
    try {
        const { title, description, category, content, type, language, status } = req.body;
        let filePath = null;

        // Handle file upload for resources
        if (type === 'resources' && req.file) {
            filePath = `/uploads/resources/${req.file.filename}`;
        }

        const [result] = await db.execute(
            `INSERT INTO content (title, description, category, content, type, language, status, filePath, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [title, description, category, content, type, language, status, filePath]
        );

        res.status(201).json({
            id: result.insertId,
            message: 'Content created successfully'
        });
    } catch (error) {
        console.error('Error creating content:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const updateContent = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, category, content, language, status } = req.body;
        let filePath = null;

        // Check if content exists
        const [existing] = await db.execute(
            'SELECT * FROM content WHERE id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Content not found' });
        }

        // Handle file upload for resources
        if (existing[0].type === 'resources' && req.file) {
            // Delete old file if it exists
            if (existing[0].filePath) {
                const oldPath = path.join(__dirname, '..', existing[0].filePath);
                await fs.unlink(oldPath).catch(() => {});
            }
            filePath = `/uploads/resources/${req.file.filename}`;
        }

        await db.execute(
            `UPDATE content 
             SET title = ?, description = ?, category = ?, content = ?, 
                 language = ?, status = ?, filePath = COALESCE(?, filePath), updatedAt = NOW()
             WHERE id = ?`,
            [title, description, category, content, language, status, filePath, id]
        );

        res.json({ message: 'Content updated successfully' });
    } catch (error) {
        console.error('Error updating content:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const deleteContent = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if content exists and get file path if it's a resource
        const [content] = await db.execute(
            'SELECT * FROM content WHERE id = ?',
            [id]
        );

        if (content.length === 0) {
            return res.status(404).json({ message: 'Content not found' });
        }

        // Delete file if it's a resource
        if (content[0].type === 'resources' && content[0].filePath) {
            const filePath = path.join(__dirname, '..', content[0].filePath);
            await fs.unlink(filePath).catch(() => {});
        }

        await db.execute('DELETE FROM content WHERE id = ?', [id]);

        res.json({ message: 'Content deleted successfully' });
    } catch (error) {
        console.error('Error deleting content:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const downloadResource = async (req, res) => {
    try {
        const { id } = req.params;
        const [content] = await db.execute(
            'SELECT * FROM content WHERE id = ? AND type = "resources"',
            [id]
        );

        if (content.length === 0 || !content[0].filePath) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        const filePath = path.join(__dirname, '..', content[0].filePath);
        res.download(filePath);
    } catch (error) {
        console.error('Error downloading resource:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    getContent,
    getContentById,
    createContent,
    updateContent,
    deleteContent,
    downloadResource,
    upload
};
