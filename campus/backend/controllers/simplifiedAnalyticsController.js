/**
 * Simplified Analytics Dashboard Controller
 * Sub-200ms dashboard reads from pre-computed collection
 * 
 * NO aggregation on request
 * READS ONLY from SimplifiedAnalytics collection
 */

const asyncHandler = require('express-async-handler');
const SimplifiedAnalytics = require('../models/SimplifiedAnalytics');

/**
 * @desc    Get dashboard overview (KPI cards)
 * @route   GET /api/admin/analytics/dashboard
 * @access  Admin
 * @target  < 150ms response
 */
const getDashboardOverview = asyncHandler(async (req, res) => {
    const startTime = Date.now();

    const { department, academicYear, semester } = req.query;
    const filters = {};
    if (department) filters.department = department;
    if (academicYear) filters.academicYear = academicYear;
    if (semester) filters.semester = semester;

    const overview = await SimplifiedAnalytics.getDashboardOverview(filters);

    const responseTime = Date.now() - startTime;
    console.log(`[Dashboard] Overview query: ${responseTime}ms`);

    if (!overview) {
        return res.json({
            success: true,
            data: null,
            message: 'No analytics data available',
            responseTime
        });
    }

    res.json({
        success: true,
        data: overview,
        meta: {
            responseTime,
            filters
        }
    });
});

/**
 * @desc    Get grade distribution chart data
 * @route   GET /api/admin/analytics/grade-distribution
 * @access  Admin
 */
const getGradeDistribution = asyncHandler(async (req, res) => {
    const { department, academicYear, semester } = req.query;
    const filters = {};
    if (department) filters.department = department;
    if (academicYear) filters.academicYear = academicYear;
    if (semester) filters.semester = parseInt(semester);

    const overview = await SimplifiedAnalytics.getDashboardOverview(filters);

    if (!overview) {
        return res.json({
            success: true,
            data: []
        });
    }

    // Transform for chart
    const chartData = [
        { grade: 'O (90%+)', count: overview.gradeDistribution.O, color: '#00C49F' },
        { grade: 'A+ (80-89%)', count: overview.gradeDistribution.Aplus, color: '#0088FE' },
        { grade: 'A (70-79%)', count: overview.gradeDistribution.A, color: '#00B4D8' },
        { grade: 'B+ (60-69%)', count: overview.gradeDistribution.Bplus, color: '#FFBB28' },
        { grade: 'B (55-59%)', count: overview.gradeDistribution.B, color: '#FF9500' },
        { grade: 'C (50-54%)', count: overview.gradeDistribution.C, color: '#FF8042' },
        { grade: 'D (40-49%)', count: overview.gradeDistribution.D, color: '#8884D8' },
        { grade: 'F (<40%)', count: overview.gradeDistribution.F, color: '#FF6B6B' }
    ].filter(item => item.count > 0);

    res.json({
        success: true,
        data: chartData
    });
});

/**
 * @desc    Get semester trend chart data
 * @route   GET /api/admin/analytics/semester-trend
 * @access  Admin
 */
const getSemesterTrend = asyncHandler(async (req, res) => {
    const { department, academicYear } = req.query;
    const filters = {};
    if (department) filters.department = department;
    if (academicYear) filters.academicYear = academicYear;

    const trend = await SimplifiedAnalytics.getSemesterTrend(filters);

    res.json({
        success: true,
        data: trend
    });
});

/**
 * @desc    Get subject difficulty ranking
 * @route   GET /api/admin/analytics/subject-difficulty
 * @access  Admin
 */
const getSubjectDifficulty = asyncHandler(async (req, res) => {
    const { department, academicYear, semester } = req.query;
    const filters = {};
    if (department) filters.department = department;
    if (academicYear) filters.academicYear = academicYear;
    if (semester) filters.semester = semester;

    const subjects = await SimplifiedAnalytics.getSubjectDifficulty(filters);

    // Transform for display
    const data = subjects.map(s => ({
        subject: s.subject,
        subjectName: s.subjectName || s.subject,
        passPercentage: s.passPercentage,
        difficultyIndex: s.difficultyIndex,
        averageMarks: s.averageMarks,
        difficulty: s.difficultyIndex > 0.5 ? 'Hard' :
            s.difficultyIndex > 0.3 ? 'Moderate' : 'Easy'
    }));

    res.json({
        success: true,
        data
    });
});

/**
 * @desc    Get analytics for specific subject
 * @route   GET /api/admin/analytics/subject/:subject
 * @access  Admin
 */
const getSubjectAnalytics = asyncHandler(async (req, res) => {
    const { subject } = req.params;
    const { department, academicYear, semester } = req.query;

    const analytics = await SimplifiedAnalytics.findOne({
        subject,
        ...(department && { department }),
        ...(academicYear && { academicYear }),
        ...(semester && { semester: parseInt(semester) })
    }).lean();

    if (!analytics) {
        return res.status(404).json({
            success: false,
            message: 'Analytics not found for this subject'
        });
    }

    res.json({
        success: true,
        data: analytics
    });
});

/**
 * @desc    Get recent analytics updates
 * @route   GET /api/admin/analytics/recent
 * @access  Admin
 */
const getRecentAnalytics = asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;

    const recent = await SimplifiedAnalytics.find()
        .select('department subject semester passPercentage averageMarks generatedAt version')
        .sort({ generatedAt: -1 })
        .limit(parseInt(limit))
        .lean();

    res.json({
        success: true,
        data: recent
    });
});

module.exports = {
    getDashboardOverview,
    getGradeDistribution,
    getSemesterTrend,
    getSubjectDifficulty,
    getSubjectAnalytics,
    getRecentAnalytics
};
