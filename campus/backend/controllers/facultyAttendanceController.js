/**
 * Faculty Attendance Controller
 * 
 * Handles faculty check-in/check-out and attendance management.
 * All times are server-side only - no client time accepted.
 * 
 * @module controllers/facultyAttendanceController
 */

const FacultyAttendanceService = require('../services/FacultyAttendanceService');
const FacultyAttendance = require('../models/FacultyAttendance');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// ==================== FACULTY ENDPOINTS ====================

/**
 * @desc    Faculty check-in
 * @route   POST /api/faculty/attendance/check-in
 * @access  Faculty
 */
const checkIn = async (req, res, next) => {
    try {
        const facultyId = req.user._id;
        const { note } = req.body;

        const result = await FacultyAttendanceService.checkIn(facultyId, note);

        if (!result.success) {
            return errorResponse(res, 400, result.error, result.data);
        }

        return successResponse(res, 201, result.message, result.data);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Faculty check-out
 * @route   POST /api/faculty/attendance/check-out
 * @access  Faculty
 */
const checkOut = async (req, res, next) => {
    try {
        const facultyId = req.user._id;
        const { note } = req.body;

        const result = await FacultyAttendanceService.checkOut(facultyId, note);

        if (!result.success) {
            return errorResponse(res, 400, result.error, result.data);
        }

        return successResponse(res, 200, result.message, result.data);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get today's attendance status
 * @route   GET /api/faculty/attendance/status
 * @access  Faculty
 */
const getTodayStatus = async (req, res, next) => {
    try {
        const facultyId = req.user._id;
        const attendance = await FacultyAttendanceService.getTodaysAttendance(facultyId);

        if (!attendance) {
            return successResponse(res, 200, 'No attendance record for today', {
                hasCheckedIn: false,
                hasCheckedOut: false,
                date: FacultyAttendanceService.getTodayDateString()
            });
        }

        return successResponse(res, 200, 'Status retrieved', {
            hasCheckedIn: !!attendance.checkInTime,
            hasCheckedOut: !!attendance.checkOutTime,
            checkInTime: attendance.checkInTime,
            checkOutTime: attendance.checkOutTime,
            formattedCheckIn: FacultyAttendanceService.formatTimeForDisplay(attendance.checkInTime),
            formattedCheckOut: FacultyAttendanceService.formatTimeForDisplay(attendance.checkOutTime),
            totalWorkingHours: attendance.totalWorkingHours,
            status: attendance.status,
            note: attendance.note,
            date: attendance.date
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get attendance summary (self view)
 * @route   GET /api/faculty/attendance/summary
 * @access  Faculty
 */
const getAttendanceSummary = async (req, res, next) => {
    try {
        const facultyId = req.user._id;
        const { fromDate, toDate } = req.query;

        const summary = await FacultyAttendanceService.getAttendanceSummary(
            facultyId,
            fromDate,
            toDate
        );

        return successResponse(res, 200, 'Summary retrieved', summary);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get attendance history (self view)
 * @route   GET /api/faculty/attendance/history
 * @access  Faculty
 */
const getAttendanceHistory = async (req, res, next) => {
    try {
        const facultyId = req.user._id;
        const { page = 1, limit = 30 } = req.query;

        const history = await FacultyAttendanceService.getAttendanceHistory(
            facultyId,
            parseInt(page),
            parseInt(limit)
        );

        return successResponse(res, 200, 'History retrieved', history);
    } catch (error) {
        next(error);
    }
};

// ==================== ADMIN ENDPOINTS ====================

/**
 * @desc    Get today's real-time faculty attendance status
 * @route   GET /api/admin/faculty-attendance/today
 * @access  Admin
 */
const getTodayAttendance = async (req, res, next) => {
    try {
        const data = await FacultyAttendanceService.getRealTimeStatus();
        return successResponse(res, 200, 'Real-time attendance data retrieved', data);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get faculty attendance analytics
 * @route   GET /api/admin/faculty-attendance/analytics
 * @access  Admin
 */
const getAttendanceAnalytics = async (req, res, next) => {
    try {
        const { month, year, departmentId } = req.query;

        const analytics = await FacultyAttendanceService.getAnalytics({
            month: month ? parseInt(month) : undefined,
            year: year ? parseInt(year) : undefined,
            departmentId
        });

        return successResponse(res, 200, 'Analytics retrieved', analytics);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update admin note on attendance record
 * @route   PUT /api/admin/faculty-attendance/:id/note
 * @access  Admin
 */
const updateNote = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { note } = req.body;

        const attendance = await FacultyAttendance.findByIdAndUpdate(
            id,
            { $set: { adminNote: note } },
            { new: true }
        ).populate('facultyId', 'name');

        if (!attendance) {
            return errorResponse(res, 404, 'Attendance record not found');
        }

        return successResponse(res, 200, 'Note updated', attendance);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get attendance record by date for specific faculty (admin view)
 * @route   GET /api/admin/faculty-attendance/faculty/:facultyId
 * @access  Admin
 */
const getFacultyAttendance = async (req, res, next) => {
    try {
        const { facultyId } = req.params;
        const { fromDate, toDate, page = 1, limit = 30 } = req.query;

        const query = { facultyId };
        if (fromDate && toDate) {
            query.date = { $gte: fromDate, $lte: toDate };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [records, total] = await Promise.all([
            FacultyAttendance.find(query)
                .populate('facultyId', 'name')
                .sort({ date: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            FacultyAttendance.countDocuments(query)
        ]);

        // Format times
        const formattedRecords = records.map(record => ({
            ...record,
            formattedCheckIn: record.checkInTime
                ? FacultyAttendanceService.formatTimeForDisplay(new Date(record.checkInTime))
                : null,
            formattedCheckOut: record.checkOutTime
                ? FacultyAttendanceService.formatTimeForDisplay(new Date(record.checkOutTime))
                : null
        }));

        return successResponse(res, 200, 'Attendance records retrieved', {
            records: formattedRecords,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Manually trigger end-of-day processing (admin utility)
 * @route   POST /api/admin/faculty-attendance/process-eod
 * @access  Admin
 */
const processEndOfDay = async (req, res, next) => {
    try {
        const result = await FacultyAttendanceService.processEndOfDay();
        return successResponse(res, 200, 'End of day processing completed', result);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    // Faculty endpoints
    checkIn,
    checkOut,
    getTodayStatus,
    getAttendanceSummary,
    getAttendanceHistory,
    // Admin endpoints
    getTodayAttendance,
    getAttendanceAnalytics,
    updateNote,
    getFacultyAttendance,
    processEndOfDay
};
