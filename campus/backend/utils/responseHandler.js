// Success response
const successResponse = (res, statusCode, message, data = null) => {
    const response = {
        success: true,
        message
    };
    if (data) response.data = data;
    return res.status(statusCode).json(response);
};

// Error response
const errorResponse = (res, statusCode, message) => {
    return res.status(statusCode).json({
        success: false,
        error: message,
        statusCode
    });
};

module.exports = { successResponse, errorResponse };
