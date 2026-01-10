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

module.exports = { login, logout, getMe };
