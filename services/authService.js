const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const ACCESS_TOKEN_EXPIRE = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRE = '7d'; // 7 days

exports.generateTokens = (userId) => {
    // Generate access token
    const accessToken = jwt.sign(
        { id: userId },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRE }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
        { id: userId },
        JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRE }
    );

    return { accessToken, refreshToken };
};

exports.verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw error;
    }
};

exports.refreshToken = (refreshToken) => {
    try {
        // Verify refresh token
        const decoded = jwt.verify(refreshToken, JWT_SECRET);
        
        // Generate new access token
        const newAccessToken = jwt.sign(
            { id: decoded.id },
            JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRE }
        );

        return { accessToken: newAccessToken };
    } catch (error) {
        throw error;
    }
};
