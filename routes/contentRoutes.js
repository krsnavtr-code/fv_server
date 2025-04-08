const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const { protect, admin } = require('../middleware/auth');

// All routes are protected and require admin access
router.use(protect, admin);

// Get content by type (documentation, code, resources)
router.get('/:type', contentController.getContent);

// Get specific content item
router.get('/item/:id', contentController.getContentById);

// Create new content
router.post('/', contentController.upload.single('file'), contentController.createContent);

// Update existing content
router.put('/:id', contentController.upload.single('file'), contentController.updateContent);

// Delete content
router.delete('/:id', contentController.deleteContent);

// Download resource
router.get('/download/:id', contentController.downloadResource);

module.exports = router;
