/**
 * Socket Middleware - JWT Authentication
 * Validates JWT tokens during socket handshake
 * 
 * Security: Only authenticated users can connect
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authenticate socket connection via JWT
 * @param {Socket} socket
 * @param {Function} next
 */
const authenticateSocket = async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token ||
            socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (!token) {
            console.log('[SocketAuth] No token provided');
            return next(new Error('Authentication required'));
        }

        // Verify JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'smartcampus_jwt_secret');

        // Get user from DB
        const user = await User.findById(decoded.id).select('-password').lean();

        if (!user) {
            return next(new Error('User not found'));
        }

        // Attach user to socket
        socket.user = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        console.log(`[SocketAuth] User authenticated: ${user.name} (${user.role})`);
        next();

    } catch (error) {
        console.error('[SocketAuth] Authentication failed:', error.message);
        next(new Error('Invalid token'));
    }
};

/**
 * Check if socket user is admin
 */
const requireAdminSocket = (socket, next) => {
    if (socket.user?.role !== 'admin') {
        return next(new Error('Admin access required'));
    }
    next();
};

module.exports = {
    authenticateSocket,
    requireAdminSocket
};
