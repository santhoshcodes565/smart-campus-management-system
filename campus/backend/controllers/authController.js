const User = require('../models/User');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Admin = require('../models/Admin');
const generateToken = require('../utils/generateToken');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// @desc    Login user (common for all roles)
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return errorResponse(res, 400, 'Please provide username and password');
        }

        // Find user by username (include password for comparison)
        const user = await User.findOne({ username: username.toLowerCase() }).select('+password');

        if (!user) {
            return errorResponse(res, 401, 'Invalid credentials');
        }

        // Check if user is active
        if (user.status !== 'active') {
            return errorResponse(res, 401, 'Account is inactive or suspended');
        }

        // Check password
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return errorResponse(res, 401, 'Invalid credentials');
        }

        // Generate token
        const token = generateToken(user._id, user.role);

        // Determine redirect URL based on role
        let redirectUrl;
        switch (user.role) {
            case 'student':
                redirectUrl = '/student/dashboard';
                break;
            case 'faculty':
                redirectUrl = '/faculty/dashboard';
                break;
            case 'admin':
                redirectUrl = '/admin/dashboard';
                break;
            default:
                redirectUrl = '/';
        }

        // Get additional profile data based on role
        let profileData = null;
        if (user.role === 'student') {
            profileData = await Student.findOne({ userId: user._id });
        } else if (user.role === 'faculty') {
            profileData = await Faculty.findOne({ userId: user._id });
        } else if (user.role === 'admin') {
            profileData = await Admin.findOne({ userId: user._id });
        }

        return res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                role: user.role,
                department: user.department,
                profileData
            },
            redirectUrl
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Protected
const logout = async (req, res, next) => {
    try {
        // In JWT-based auth, we just tell client to remove token
        // For added security, you could implement token blacklisting
        return successResponse(res, 200, 'Logged out successfully');
    } catch (error) {
        next(error);
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Protected
const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        let profileData = null;
        if (user.role === 'student') {
            profileData = await Student.findOne({ userId: user._id }).populate('userId', 'name username phone department');
        } else if (user.role === 'faculty') {
            profileData = await Faculty.findOne({ userId: user._id }).populate('userId', 'name username phone department');
        } else if (user.role === 'admin') {
            profileData = await Admin.findOne({ userId: user._id }).populate('userId', 'name username phone department');
        }

        return successResponse(res, 200, 'Profile retrieved', {
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                role: user.role,
                department: user.department,
                phone: user.phone,
                status: user.status
            },
            profileData
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Change user password (secure - uses JWT identity)
// @route   PATCH /api/auth/change-password
// @access  Protected
const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Validation
        if (!currentPassword || !newPassword) {
            return errorResponse(res, 400, 'Current password and new password are required');
        }

        if (newPassword.length < 6) {
            return errorResponse(res, 400, 'New password must be at least 6 characters');
        }

        if (currentPassword === newPassword) {
            return errorResponse(res, 400, 'New password must be different from current password');
        }

        // Get user with password field
        const user = await User.findById(req.user._id).select('+password');
        if (!user) {
            return errorResponse(res, 404, 'User not found');
        }

        // Verify current password
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return errorResponse(res, 401, 'Current password is incorrect');
        }

        // Update password (password will be hashed by pre-save hook in User model)
        user.password = newPassword;
        await user.save();

        return successResponse(res, 200, 'Password changed successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = { login, logout, getMe, changePassword };

