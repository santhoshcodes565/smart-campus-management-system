const { errorResponse } = require('../utils/responseHandler');

// Global error handler
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err.stack);

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(val => val.message);
        return errorResponse(res, 400, messages.join(', '));
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return errorResponse(res, 400, `${field} already exists`);
    }

    // Mongoose cast error (invalid ObjectId)
    if (err.name === 'CastError') {
        return errorResponse(res, 400, 'Invalid ID format');
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return errorResponse(res, 401, 'Invalid token');
    }

    if (err.name === 'TokenExpiredError') {
        return errorResponse(res, 401, 'Token expired');
    }

    // Default server error
    return errorResponse(res, err.statusCode || 500, err.message || 'Internal Server Error');
};

// 404 handler
const notFound = (req, res, next) => {
    return errorResponse(res, 404, `Route not found: ${req.originalUrl}`);
};

module.exports = { errorHandler, notFound };
