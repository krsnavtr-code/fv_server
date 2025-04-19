const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { refreshToken } = require('../services/authService');

// Refresh token route
router.post('/refresh-token', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ message: 'Refresh token is required' });
        }

        const tokens = await refreshToken(refreshToken);
        // Ensure only the raw JWT string is returned in accessToken
        res.json(tokens);
    } catch (error) {
        console.error('Error refreshing token:', error);
        res.status(401).json({ message: 'Invalid refresh token' });
    }
});

module.exports = router;
