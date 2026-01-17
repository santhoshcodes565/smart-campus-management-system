/**
 * Leave Controller - Centralized Leave Management
 * Handles validation, faculty leave, admin approval, stats, and analytics
 */

const Leave = require('../models/Leave');
const User = require('../models/User');
const Faculty = require('../models/Faculty');
const Student = require('../models/Student');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// ==================== VALIDATION ====================

/**
 * Validate leave request - check dates and overlaps
 * @param {Object} data - { applicantId, fromDate, toDate }
 * @returns {Object} { valid: boolean, error?: string }
 */
const validateLeaveRequest = async (applicantId, fromDate, toDate) => {
    const start = new Date(fromDate);
    const end = new Date(toDate);

    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { valid: false, error: 'Invalid date format' };
    }

    // Check if start date is before or equal to end date
    if (start > end) {
        return { valid: false, error: 'Start date must be before or equal to end date' };
    }

    // Check if start date is not in the past (allow today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) {
        return { valid: false, error: 'Start date cannot be in the past' };
    }

    // Check for overlapping leaves
    const overlapping = await Leave.findOne({
        applicantId,
        status: { $ne: 'rejected' },
        $or: [
            // New leave starts during existing leave
            { fromDate: { $lte: start }, toDate: { $gte: start } },
            // New leave ends during existing leave
            { fromDate: { $lte: end }, toDate: { $gte: end } },
            // New leave completely contains existing leave
            { fromDate: { $gte: start }, toDate: { $lte: end } }
        ]
    });

    if (overlapping) {
        return {
            valid: false,
            error: `You already have a leave request from ${overlapping.fromDate.toDateString()} to ${overlapping.toDate.toDateString()}`
        };
    }

    return { valid: true };
};

// ==================== FACULTY LEAVE ====================

/**
 * @desc    Faculty applies for leave
 * @route   POST /api/faculty/leave/apply
 * @access  Faculty
 */
const applyFacultyLeave = async (req, res, next) => {
    try {
        const { leaveType, fromDate, toDate, reason } = req.body;

        // Validation
        if (!leaveType || !fromDate || !toDate || !reason) {
            return errorResponse(res, 400, 'All fields are required: leaveType, fromDate, toDate, reason');
        }

        // Check dates and overlaps
        const validation = await validateLeaveRequest(req.user._id, fromDate, toDate);
        if (!validation.valid) {
            return errorResponse(res, 400, validation.error);
        }

        // Create leave
        const leave = await Leave.create({
            applicantId: req.user._id,
            applicantType: 'faculty',
            leaveType,
            fromDate: new Date(fromDate),
            toDate: new Date(toDate),
            reason,
            status: 'pending'
        });

        return successResponse(res, 201, 'Leave application submitted successfully', leave);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get faculty's own leave history
 * @route   GET /api/faculty/leave/my
 * @access  Faculty
 */
const getFacultyLeaveRequests = async (req, res, next) => {
    try {
        const leaves = await Leave.find({
            applicantId: req.user._id,
            applicantType: 'faculty'
        })
            .populate('approvedBy', 'name')
            .sort({ createdAt: -1 });

        return successResponse(res, 200, 'Leave requests retrieved', leaves);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Approve student leave (for faculty)
 * @route   PUT /api/faculty/leave/:id/approve
 * @access  Faculty
 */
const approveStudentLeave = async (req, res, next) => {
    try {
        const { remarks } = req.body;

        const leave = await Leave.findById(req.params.id);
        if (!leave) {
            return errorResponse(res, 404, 'Leave request not found');
        }

        if (leave.applicantType !== 'student') {
            return errorResponse(res, 403, 'You can only approve student leaves');
        }

        if (leave.status !== 'pending') {
            return errorResponse(res, 400, `Leave is already ${leave.status}`);
        }

        leave.status = 'approved';
        leave.approvedBy = req.user._id;
        leave.approvalDate = new Date();
        if (remarks) leave.remarks = remarks;

        await leave.save();

        return successResponse(res, 200, 'Leave approved successfully', leave);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Reject student leave (for faculty)
 * @route   PUT /api/faculty/leave/:id/reject
 * @access  Faculty
 */
const rejectStudentLeave = async (req, res, next) => {
    try {
        const { remarks } = req.body;

        if (!remarks) {
            return errorResponse(res, 400, 'Remarks are required when rejecting a leave');
        }

        const leave = await Leave.findById(req.params.id);
        if (!leave) {
            return errorResponse(res, 404, 'Leave request not found');
        }

        if (leave.applicantType !== 'student') {
            return errorResponse(res, 403, 'You can only reject student leaves');
        }

        if (leave.status !== 'pending') {
            return errorResponse(res, 400, `Leave is already ${leave.status}`);
        }

        leave.status = 'rejected';
        leave.approvedBy = req.user._id;
        leave.approvalDate = new Date();
        leave.remarks = remarks;

        await leave.save();

        return successResponse(res, 200, 'Leave rejected', leave);
    } catch (error) {
        next(error);
    }
};

// ==================== ADMIN LEAVE MANAGEMENT ====================

/**
 * @desc    Get all faculty leave requests (for admin)
 * @route   GET /api/admin/leave/faculty
 * @access  Admin
 */
const getFacultyLeavesForAdmin = async (req, res, next) => {
    try {
        const { status } = req.query;

        let query = { applicantType: 'faculty' };
        if (status) query.status = status;

        const leaves = await Leave.find(query)
            .populate('applicantId', 'name email department')
            .populate('approvedBy', 'name')
            .sort({ createdAt: -1 });

        return successResponse(res, 200, 'Faculty leave requests retrieved', leaves);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Approve faculty leave (for admin)
 * @route   PUT /api/admin/leave/:id/approve
 * @access  Admin
 */
const approveFacultyLeave = async (req, res, next) => {
    try {
        const { remarks } = req.body;

        const leave = await Leave.findById(req.params.id);
        if (!leave) {
            return errorResponse(res, 404, 'Leave request not found');
        }

        if (leave.applicantType !== 'faculty') {
            return errorResponse(res, 403, 'This endpoint is for faculty leaves only');
        }

        if (leave.status !== 'pending') {
            return errorResponse(res, 400, `Leave is already ${leave.status}`);
        }

        leave.status = 'approved';
        leave.approvedBy = req.user._id;
        leave.approvalDate = new Date();
        if (remarks) leave.remarks = remarks;

        await leave.save();

        return successResponse(res, 200, 'Faculty leave approved successfully', leave);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Reject faculty leave (for admin)
 * @route   PUT /api/admin/leave/:id/reject
 * @access  Admin
 */
const rejectFacultyLeave = async (req, res, next) => {
    try {
        const { remarks } = req.body;

        if (!remarks) {
            return errorResponse(res, 400, 'Remarks are required when rejecting a leave');
        }

        const leave = await Leave.findById(req.params.id);
        if (!leave) {
            return errorResponse(res, 404, 'Leave request not found');
        }

        if (leave.applicantType !== 'faculty') {
            return errorResponse(res, 403, 'This endpoint is for faculty leaves only');
        }

        if (leave.status !== 'pending') {
            return errorResponse(res, 400, `Leave is already ${leave.status}`);
        }

        leave.status = 'rejected';
        leave.approvedBy = req.user._id;
        leave.approvalDate = new Date();
        leave.remarks = remarks;

        await leave.save();

        return successResponse(res, 200, 'Faculty leave rejected', leave);
    } catch (error) {
        next(error);
    }
};

// ==================== STATS & ANALYTICS ====================

/**
 * @desc    Get leave stats for student sidebar
 * @route   GET /api/student/leave/stats
 * @access  Student
 */
const getStudentLeaveStats = async (req, res, next) => {
    try {
        const [pending, approved, rejected] = await Promise.all([
            Leave.countDocuments({ applicantId: req.user._id, status: 'pending' }),
            Leave.countDocuments({ applicantId: req.user._id, status: 'approved' }),
            Leave.countDocuments({ applicantId: req.user._id, status: 'rejected' })
        ]);

        return successResponse(res, 200, 'Leave stats retrieved', {
            pending,
            approved,
            rejected,
            total: pending + approved + rejected
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get leave stats for faculty sidebar
 * @route   GET /api/faculty/leave/stats
 * @access  Faculty
 */
const getFacultyLeaveStats = async (req, res, next) => {
    try {
        // Get students from faculty's department
        const studentUsers = await User.find({
            role: 'student',
            department: req.user.department
        }).select('_id');

        const userIds = studentUsers.map(u => u._id);

        // Pending student leaves to approve
        const pendingStudentLeaves = await Leave.countDocuments({
            applicantId: { $in: userIds },
            applicantType: 'student',
            status: 'pending'
        });

        // Faculty's own leave stats
        const [myPending, myApproved, myRejected] = await Promise.all([
            Leave.countDocuments({ applicantId: req.user._id, applicantType: 'faculty', status: 'pending' }),
            Leave.countDocuments({ applicantId: req.user._id, applicantType: 'faculty', status: 'approved' }),
            Leave.countDocuments({ applicantId: req.user._id, applicantType: 'faculty', status: 'rejected' })
        ]);

        return successResponse(res, 200, 'Leave stats retrieved', {
            pendingStudentLeaves,
            myLeaves: {
                pending: myPending,
                approved: myApproved,
                rejected: myRejected,
                total: myPending + myApproved + myRejected
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get leave stats for admin sidebar
 * @route   GET /api/admin/leave/stats
 * @access  Admin
 */
const getAdminLeaveStats = async (req, res, next) => {
    try {
        const [
            pendingFacultyLeaves,
            pendingStudentLeaves,
            totalApproved,
            totalRejected
        ] = await Promise.all([
            Leave.countDocuments({ applicantType: 'faculty', status: 'pending' }),
            Leave.countDocuments({ applicantType: 'student', status: 'pending' }),
            Leave.countDocuments({ status: 'approved' }),
            Leave.countDocuments({ status: 'rejected' })
        ]);

        return successResponse(res, 200, 'Leave stats retrieved', {
            pendingFacultyLeaves,
            pendingStudentLeaves,
            totalPending: pendingFacultyLeaves + pendingStudentLeaves,
            totalApproved,
            totalRejected
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get full leave analytics for admin
 * @route   GET /api/admin/leave/analytics
 * @access  Admin
 */
const getLeaveAnalytics = async (req, res, next) => {
    try {
        // Overall stats
        const [total, approved, rejected, pending] = await Promise.all([
            Leave.countDocuments({}),
            Leave.countDocuments({ status: 'approved' }),
            Leave.countDocuments({ status: 'rejected' }),
            Leave.countDocuments({ status: 'pending' })
        ]);

        // Role breakdown
        const [studentLeaves, facultyLeaves] = await Promise.all([
            Leave.countDocuments({ applicantType: 'student' }),
            Leave.countDocuments({ applicantType: 'faculty' })
        ]);

        // Leave type breakdown
        const leaveTypeStats = await Leave.aggregate([
            {
                $group: {
                    _id: '$leaveType',
                    count: { $sum: 1 },
                    approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
                    rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
                    pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Monthly trend (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyTrend = await Leave.aggregate([
            {
                $match: { createdAt: { $gte: sixMonthsAgo } }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 },
                    approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
                    rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Recent leaves
        const recentLeaves = await Leave.find()
            .populate('applicantId', 'name email department')
            .populate('approvedBy', 'name')
            .sort({ createdAt: -1 })
            .limit(10);

        return successResponse(res, 200, 'Leave analytics retrieved', {
            overview: {
                total,
                approved,
                rejected,
                pending,
                approvalRate: total > 0 ? ((approved / total) * 100).toFixed(1) : 0
            },
            byRole: {
                student: studentLeaves,
                faculty: facultyLeaves
            },
            byType: leaveTypeStats,
            monthlyTrend,
            recentLeaves
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    validateLeaveRequest,
    applyFacultyLeave,
    getFacultyLeaveRequests,
    approveStudentLeave,
    rejectStudentLeave,
    getFacultyLeavesForAdmin,
    approveFacultyLeave,
    rejectFacultyLeave,
    getStudentLeaveStats,
    getFacultyLeaveStats,
    getAdminLeaveStats,
    getLeaveAnalytics
};
