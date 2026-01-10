const { errorResponse } = require('../utils/responseHandler');

// Role-based access control middleware
// Usage: authorize('admin') or authorize('admin', 'faculty')
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return errorResponse(res, 401, 'Not authenticated');
        }

        if (!roles.includes(req.user.role)) {
            return errorResponse(res, 403, `Access denied. Role '${req.user.role}' is not authorized to access this resource`);
        }

        next();
    };
};

module.exports = { authorize };
