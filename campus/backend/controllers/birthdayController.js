/**
 * Birthday Controller
 * 
 * Handles birthday-related API endpoints.
 * Never exposes dateOfBirth in responses.
 * 
 * @module controllers/birthdayController
 */

const birthdayService = require('../services/birthdayService');
const { successResponse, errorResponse } = require('../utils/responseHandler');

/**
 * GET /api/birthdays/today
 * Get all users whose birthday is today
 * Accessible by: admin, student, faculty
 */
const getTodaysBirthdays = async (req, res) => {
    try {
        const birthdays = await birthdayService.getTodaysBirthdays();

        // Format date for response (campus timezone)
        const today = new Date().toLocaleDateString('en-IN', {
            timeZone: birthdayService.CAMPUS_TIMEZONE,
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return successResponse(res, 200, 'Today\'s birthdays retrieved successfully', {
            date: today,
            count: birthdays.length,
            users: birthdays
        });
    } catch (error) {
        console.error('Error fetching today\'s birthdays:', error);
        return errorResponse(res, 500, 'Failed to fetch birthdays');
    }
};

/**
 * GET /api/birthdays/me
 * Check if logged-in user's birthday is today
 * Accessible by: any authenticated user
 */
const checkMyBirthday = async (req, res) => {
    try {
        const isBirthdayToday = await birthdayService.isUserBirthdayToday(req.user._id);

        return successResponse(res, 200, 'Birthday check completed', {
            isBirthdayToday
        });
    } catch (error) {
        console.error('Error checking user birthday:', error);
        return errorResponse(res, 500, 'Failed to check birthday');
    }
};

/**
 * GET /api/birthdays/stats
 * Get birthday statistics (admin only)
 * Includes migration status
 */
const getBirthdayStats = async (req, res) => {
    try {
        const stats = await birthdayService.getBirthdayStats();

        return successResponse(res, 200, 'Birthday statistics retrieved', stats);
    } catch (error) {
        console.error('Error fetching birthday stats:', error);
        return errorResponse(res, 500, 'Failed to fetch birthday statistics');
    }
};

/**
 * GET /api/birthdays/missing-dob
 * Get users missing dateOfBirth (admin only, for migration)
 */
const getUsersMissingDOB = async (req, res) => {
    try {
        const users = await birthdayService.getUsersMissingDOB();

        return successResponse(res, 200, 'Users missing DOB retrieved', {
            count: users.length,
            users
        });
    } catch (error) {
        console.error('Error fetching users missing DOB:', error);
        return errorResponse(res, 500, 'Failed to fetch users missing DOB');
    }
};

module.exports = {
    getTodaysBirthdays,
    checkMyBirthday,
    getBirthdayStats,
    getUsersMissingDOB
};
