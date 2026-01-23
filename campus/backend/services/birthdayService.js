/**
 * Birthday Intelligence Service
 * 
 * Stateless, reusable service for birthday-related logic.
 * Uses MongoDB $expr with date functions to match birthdays by day/month only.
 * 
 * @module services/birthdayService
 */

const User = require('../models/User');

// Get timezone from env or default to Asia/Kolkata (campus locale)
const CAMPUS_TIMEZONE = process.env.CAMPUS_TIMEZONE || 'Asia/Kolkata';

/**
 * Get the current date in the campus timezone
 * @returns {Object} { day, month } in campus timezone
 */
const getTodayInCampusTimezone = () => {
    const now = new Date();
    // Convert to campus timezone
    const options = { timeZone: CAMPUS_TIMEZONE };
    const formatter = new Intl.DateTimeFormat('en-US', {
        ...options,
        day: 'numeric',
        month: 'numeric'
    });

    const parts = formatter.formatToParts(now);
    const day = parseInt(parts.find(p => p.type === 'day').value, 10);
    const month = parseInt(parts.find(p => p.type === 'month').value, 10);

    return { day, month };
};

/**
 * Get all users whose birthday is today
 * Matches DAY and MONTH only, ignores year completely
 * 
 * @returns {Promise<Array>} Array of users with birthday today (non-sensitive fields only)
 */
const getTodaysBirthdays = async () => {
    const { day, month } = getTodayInCampusTimezone();

    const users = await User.find({
        dateOfBirth: { $exists: true, $ne: null },
        status: 'active',
        $expr: {
            $and: [
                { $eq: [{ $dayOfMonth: '$dateOfBirth' }, day] },
                { $eq: [{ $month: '$dateOfBirth' }, month] }
            ]
        }
    }).select('_id name role department').lean();

    return users.map(user => ({
        id: user._id,
        name: user.name,
        role: user.role,
        department: user.department || 'Not Assigned'
    }));
};

/**
 * Check if a specific user's birthday is today
 * 
 * @param {string} userId - The user's ID
 * @returns {Promise<boolean>} True if user's birthday is today
 */
const isUserBirthdayToday = async (userId) => {
    const { day, month } = getTodayInCampusTimezone();

    const user = await User.findOne({
        _id: userId,
        dateOfBirth: { $exists: true, $ne: null },
        $expr: {
            $and: [
                { $eq: [{ $dayOfMonth: '$dateOfBirth' }, day] },
                { $eq: [{ $month: '$dateOfBirth' }, month] }
            ]
        }
    }).select('_id').lean();

    return !!user;
};

/**
 * Get users who are missing dateOfBirth (for admin migration dashboard)
 * 
 * @returns {Promise<Array>} Array of users without DOB
 */
const getUsersMissingDOB = async () => {
    const users = await User.find({
        $or: [
            { dateOfBirth: { $exists: false } },
            { dateOfBirth: null }
        ]
    }).select('_id name username role department status').lean();

    return users;
};

/**
 * Get birthday statistics for admin dashboard
 * 
 * @returns {Promise<Object>} Stats including users missing DOB
 */
const getBirthdayStats = async () => {
    const [totalUsers, usersMissingDOB, todaysBirthdays] = await Promise.all([
        User.countDocuments({ status: 'active' }),
        User.countDocuments({
            status: 'active',
            $or: [
                { dateOfBirth: { $exists: false } },
                { dateOfBirth: null }
            ]
        }),
        getTodaysBirthdays()
    ]);

    return {
        totalUsers,
        usersMissingDOB,
        usersWithDOB: totalUsers - usersMissingDOB,
        birthdaysToday: todaysBirthdays.length,
        migrationComplete: usersMissingDOB === 0
    };
};

module.exports = {
    getTodaysBirthdays,
    isUserBirthdayToday,
    getUsersMissingDOB,
    getBirthdayStats,
    CAMPUS_TIMEZONE
};
