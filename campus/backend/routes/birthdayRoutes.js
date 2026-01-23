/**
 * Birthday Routes
 * 
 * API routes for birthday intelligence features.
 * All routes require authentication.
 * 
 * @module routes/birthdayRoutes
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const {
    getTodaysBirthdays,
    checkMyBirthday,
    getBirthdayStats,
    getUsersMissingDOB
} = require('../controllers/birthdayController');

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/birthdays/today
 * @desc    Get all users whose birthday is today
 * @access  Private (admin, student, faculty)
 */
router.get('/today', authorize('admin', 'student', 'faculty'), getTodaysBirthdays);

/**
 * @route   GET /api/birthdays/me
 * @desc    Check if logged-in user's birthday is today
 * @access  Private (any authenticated user)
 */
router.get('/me', checkMyBirthday);

/**
 * @route   GET /api/birthdays/stats
 * @desc    Get birthday statistics and migration status
 * @access  Private (admin only)
 */
router.get('/stats', authorize('admin'), getBirthdayStats);

/**
 * @route   GET /api/birthdays/missing-dob
 * @desc    Get users missing dateOfBirth (for migration)
 * @access  Private (admin only)
 */
router.get('/missing-dob', authorize('admin'), getUsersMissingDOB);

module.exports = router;
