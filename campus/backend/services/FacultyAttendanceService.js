/**
 * Faculty Attendance Service
 * 
 * Stateless service for faculty attendance logic.
 * All time operations use server timezone (Asia/Kolkata).
 * 
 * @module services/FacultyAttendanceService
 */

const FacultyAttendance = require('../models/FacultyAttendance');
const User = require('../models/User');
const Faculty = require('../models/Faculty');

// Campus timezone (from env or default)
const CAMPUS_TIMEZONE = process.env.CAMPUS_TIMEZONE || 'Asia/Kolkata';

/**
 * Get current date string in YYYY-MM-DD format (campus timezone)
 * @returns {string} Date string in YYYY-MM-DD format
 */
const getTodayDateString = () => {
    const now = new Date();
    const options = { timeZone: CAMPUS_TIMEZONE };
    const formatter = new Intl.DateTimeFormat('en-CA', {
        ...options,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return formatter.format(now); // Returns YYYY-MM-DD
};

/**
 * Get current server time as Date object
 * @returns {Date} Current server time
 */
const getCurrentServerTime = () => {
    return new Date();
};

/**
 * Format time for display in 12-hour format
 * @param {Date} date - Date object
 * @returns {string} Formatted time string (e.g., "09:30 AM")
 */
const formatTimeForDisplay = (date) => {
    if (!date) return null;
    return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: CAMPUS_TIMEZONE
    });
};

/**
 * Calculate working hours between check-in and check-out
 * @param {Date} checkIn - Check-in time
 * @param {Date} checkOut - Check-out time
 * @returns {number} Hours worked (rounded to 2 decimal places)
 */
const calculateWorkingHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    const diffMs = checkOut.getTime() - checkIn.getTime();
    const hours = diffMs / (1000 * 60 * 60);
    return Math.round(hours * 100) / 100; // Round to 2 decimal places
};

/**
 * Get today's attendance record for a faculty member
 * @param {string} facultyId - User ID of faculty
 * @returns {Promise<Object|null>} Attendance record or null
 */
const getTodaysAttendance = async (facultyId) => {
    const today = getTodayDateString();
    const attendance = await FacultyAttendance.findOne({
        facultyId,
        date: today
    });
    return attendance;
};

/**
 * Check-in a faculty member
 * @param {string} facultyId - User ID of faculty
 * @param {string} note - Optional note
 * @returns {Promise<Object>} Result with success status and data/error
 */
const checkIn = async (facultyId, note = '') => {
    const today = getTodayDateString();
    const serverTime = getCurrentServerTime();

    // Check if already checked in today
    const existing = await FacultyAttendance.findOne({
        facultyId,
        date: today
    });

    if (existing) {
        if (existing.checkInTime) {
            return {
                success: false,
                error: 'Already checked in today',
                data: existing
            };
        }
    }

    // Create or update attendance record
    const attendance = await FacultyAttendance.findOneAndUpdate(
        { facultyId, date: today },
        {
            $set: {
                checkInTime: serverTime,
                status: 'PRESENT',
                note: note || ''
            }
        },
        { upsert: true, new: true }
    );

    return {
        success: true,
        message: 'Check-in successful',
        data: {
            ...attendance.toObject(),
            formattedCheckIn: formatTimeForDisplay(attendance.checkInTime)
        }
    };
};

/**
 * Check-out a faculty member
 * @param {string} facultyId - User ID of faculty
 * @param {string} note - Optional note (appends to existing note)
 * @returns {Promise<Object>} Result with success status and data/error
 */
const checkOut = async (facultyId, note = '') => {
    const today = getTodayDateString();
    const serverTime = getCurrentServerTime();

    // Find today's record
    const existing = await FacultyAttendance.findOne({
        facultyId,
        date: today
    });

    // Validate check-in exists
    if (!existing || !existing.checkInTime) {
        return {
            success: false,
            error: 'Cannot check-out without checking in first'
        };
    }

    // Check if already checked out
    if (existing.checkOutTime) {
        return {
            success: false,
            error: 'Already checked out today',
            data: existing
        };
    }

    // Calculate working hours
    const workingHours = calculateWorkingHours(existing.checkInTime, serverTime);

    // Update check-out note (append if note exists)
    const updatedNote = note
        ? (existing.note ? `${existing.note} | Check-out: ${note}` : `Check-out: ${note}`)
        : existing.note;

    // Update attendance record
    const attendance = await FacultyAttendance.findByIdAndUpdate(
        existing._id,
        {
            $set: {
                checkOutTime: serverTime,
                totalWorkingHours: workingHours,
                note: updatedNote
            }
        },
        { new: true }
    );

    return {
        success: true,
        message: 'Check-out successful',
        data: {
            ...attendance.toObject(),
            formattedCheckIn: formatTimeForDisplay(attendance.checkInTime),
            formattedCheckOut: formatTimeForDisplay(attendance.checkOutTime)
        }
    };
};

/**
 * Get attendance summary for a faculty member
 * @param {string} facultyId - User ID of faculty
 * @param {string} fromDate - Start date (YYYY-MM-DD)
 * @param {string} toDate - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} Summary statistics
 */
const getAttendanceSummary = async (facultyId, fromDate, toDate) => {
    const query = { facultyId };

    if (fromDate && toDate) {
        query.date = { $gte: fromDate, $lte: toDate };
    } else if (fromDate) {
        query.date = { $gte: fromDate };
    } else if (toDate) {
        query.date = { $lte: toDate };
    }

    const records = await FacultyAttendance.find(query).sort({ date: -1 });

    const summary = {
        totalRecords: records.length,
        presentDays: records.filter(r => r.status === 'PRESENT' && r.checkOutTime).length,
        absentDays: records.filter(r => r.status === 'ABSENT').length,
        partialDays: records.filter(r => r.status === 'PARTIAL').length,
        totalWorkingHours: records.reduce((sum, r) => sum + (r.totalWorkingHours || 0), 0),
        averageHoursPerDay: 0,
        earlyCheckouts: 0,
        records: records
    };

    // Calculate average (only for days with check-out)
    const daysWithCheckout = records.filter(r => r.checkOutTime);
    if (daysWithCheckout.length > 0) {
        summary.averageHoursPerDay = Math.round(
            (summary.totalWorkingHours / daysWithCheckout.length) * 100
        ) / 100;
    }

    // Count early checkouts (less than 8 hours, assuming 8 hour workday)
    summary.earlyCheckouts = daysWithCheckout.filter(r => r.totalWorkingHours < 8).length;

    return summary;
};

/**
 * Get attendance history for a faculty member
 * @param {string} facultyId - User ID of faculty
 * @param {number} page - Page number
 * @param {number} limit - Records per page
 * @returns {Promise<Object>} Paginated attendance records
 */
const getAttendanceHistory = async (facultyId, page = 1, limit = 30) => {
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
        FacultyAttendance.find({ facultyId })
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        FacultyAttendance.countDocuments({ facultyId })
    ]);

    // Format times for display
    const formattedRecords = records.map(record => ({
        ...record,
        formattedCheckIn: record.checkInTime ? formatTimeForDisplay(new Date(record.checkInTime)) : null,
        formattedCheckOut: record.checkOutTime ? formatTimeForDisplay(new Date(record.checkOutTime)) : null
    }));

    return {
        records: formattedRecords,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

/**
 * Get real-time attendance status for all faculty (admin use)
 * @returns {Promise<Object>} Real-time status data
 */
const getRealTimeStatus = async () => {
    const today = getTodayDateString();

    // Get all active faculty users
    const allFaculty = await User.find({
        role: 'faculty',
        status: 'active'
    }).select('_id name department').lean();

    // Get today's attendance records
    const todaysRecords = await FacultyAttendance.find({ date: today })
        .populate('facultyId', 'name department')
        .lean();

    // Create a map for quick lookup
    const attendanceMap = new Map();
    todaysRecords.forEach(record => {
        attendanceMap.set(record.facultyId._id.toString(), record);
    });

    // Get faculty details from Faculty model for department info
    const facultyDetails = await Faculty.find({})
        .populate('userId', 'name department')
        .populate('departmentId', 'name code')
        .lean();

    const facultyDeptMap = new Map();
    facultyDetails.forEach(f => {
        if (f.userId) {
            facultyDeptMap.set(f.userId._id.toString(), f.departmentId?.name || f.userId.department || 'Not Assigned');
        }
    });

    // Build status list
    const statusList = allFaculty.map(faculty => {
        const record = attendanceMap.get(faculty._id.toString());
        const department = facultyDeptMap.get(faculty._id.toString()) || faculty.department || 'Not Assigned';

        let status = 'ABSENT';
        let checkInTime = null;
        let checkOutTime = null;
        let totalWorkingHours = 0;
        let note = '';

        if (record) {
            if (record.checkOutTime) {
                status = 'CHECKED_OUT';
            } else if (record.checkInTime) {
                status = 'CHECKED_IN';
            }
            checkInTime = record.checkInTime;
            checkOutTime = record.checkOutTime;
            totalWorkingHours = record.totalWorkingHours || 0;
            note = record.note || '';
        }

        return {
            facultyId: faculty._id,
            name: faculty.name,
            department,
            status,
            checkInTime,
            checkOutTime,
            formattedCheckIn: checkInTime ? formatTimeForDisplay(new Date(checkInTime)) : null,
            formattedCheckOut: checkOutTime ? formatTimeForDisplay(new Date(checkOutTime)) : null,
            totalWorkingHours,
            note,
            recordId: record?._id || null
        };
    });

    // Calculate summary
    const summary = {
        total: allFaculty.length,
        checkedIn: statusList.filter(s => s.status === 'CHECKED_IN').length,
        checkedOut: statusList.filter(s => s.status === 'CHECKED_OUT').length,
        absent: statusList.filter(s => s.status === 'ABSENT').length
    };

    return {
        date: today,
        summary,
        faculty: statusList
    };
};

/**
 * Get attendance analytics for admin dashboard
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Analytics data
 */
const getAnalytics = async (params = {}) => {
    const { month, year, departmentId } = params;

    // Default to current month if not specified
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month || (now.getMonth() + 1);

    // Build date range
    const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const endDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-31`;

    // Get all attendance records for the period
    const records = await FacultyAttendance.find({
        date: { $gte: startDate, $lte: endDate }
    }).populate('facultyId', 'name department').lean();

    // Get faculty with department info
    const facultyDetails = await Faculty.find({})
        .populate('userId', 'name department')
        .populate('departmentId', 'name code')
        .lean();

    const facultyDeptMap = new Map();
    facultyDetails.forEach(f => {
        if (f.userId) {
            facultyDeptMap.set(
                f.userId._id.toString(),
                { department: f.departmentId?.name || 'Not Assigned', departmentId: f.departmentId?._id }
            );
        }
    });

    // Monthly summary per faculty
    const facultySummary = {};
    records.forEach(record => {
        const fId = record.facultyId._id.toString();
        if (!facultySummary[fId]) {
            const deptInfo = facultyDeptMap.get(fId) || { department: 'Not Assigned' };
            facultySummary[fId] = {
                facultyId: fId,
                name: record.facultyId.name,
                department: deptInfo.department,
                presentDays: 0,
                absentDays: 0,
                partialDays: 0,
                totalHours: 0,
                avgHours: 0
            };
        }

        if (record.status === 'PRESENT' && record.checkOutTime) {
            facultySummary[fId].presentDays++;
            facultySummary[fId].totalHours += record.totalWorkingHours || 0;
        } else if (record.status === 'ABSENT') {
            facultySummary[fId].absentDays++;
        } else if (record.status === 'PARTIAL' || (record.checkInTime && !record.checkOutTime)) {
            facultySummary[fId].partialDays++;
        }
    });

    // Calculate averages
    Object.values(facultySummary).forEach(f => {
        if (f.presentDays > 0) {
            f.avgHours = Math.round((f.totalHours / f.presentDays) * 100) / 100;
        }
    });

    // Department-wise aggregation
    const departmentStats = {};
    Object.values(facultySummary).forEach(f => {
        if (!departmentStats[f.department]) {
            departmentStats[f.department] = {
                department: f.department,
                totalFaculty: 0,
                totalHours: 0,
                avgHoursPerFaculty: 0
            };
        }
        departmentStats[f.department].totalFaculty++;
        departmentStats[f.department].totalHours += f.totalHours;
    });

    Object.values(departmentStats).forEach(d => {
        if (d.totalFaculty > 0) {
            d.avgHoursPerFaculty = Math.round((d.totalHours / d.totalFaculty) * 100) / 100;
        }
    });

    // Frequent absence detection (more than 3 absences in month)
    const frequentAbsences = Object.values(facultySummary)
        .filter(f => f.absentDays >= 3)
        .sort((a, b) => b.absentDays - a.absentDays);

    // Early leave pattern (average less than 7 hours)
    const earlyLeavers = Object.values(facultySummary)
        .filter(f => f.presentDays > 0 && f.avgHours < 7)
        .sort((a, b) => a.avgHours - b.avgHours);

    return {
        period: { month: targetMonth, year: targetYear },
        facultySummary: Object.values(facultySummary),
        departmentStats: Object.values(departmentStats),
        insights: {
            frequentAbsences,
            earlyLeavers
        }
    };
};

/**
 * Process end-of-day status updates
 * Marks faculty as ABSENT if no check-in, PARTIAL if no check-out
 * Should be called by a scheduled job at end of business day
 */
const processEndOfDay = async () => {
    const today = getTodayDateString();

    // Get all active faculty
    const allFaculty = await User.find({
        role: 'faculty',
        status: 'active'
    }).select('_id').lean();

    const facultyIds = allFaculty.map(f => f._id);

    // Get today's records
    const todaysRecords = await FacultyAttendance.find({ date: today });
    const checkedInIds = new Set(todaysRecords.map(r => r.facultyId.toString()));

    // Create ABSENT records for those who didn't check in
    const absentRecords = facultyIds
        .filter(id => !checkedInIds.has(id.toString()))
        .map(id => ({
            facultyId: id,
            date: today,
            status: 'ABSENT'
        }));

    if (absentRecords.length > 0) {
        await FacultyAttendance.insertMany(absentRecords, { ordered: false }).catch(() => { });
    }

    // Mark as PARTIAL those who checked in but didn't check out
    await FacultyAttendance.updateMany(
        {
            date: today,
            checkInTime: { $ne: null },
            checkOutTime: null
        },
        { $set: { status: 'PARTIAL' } }
    );

    return {
        date: today,
        absentMarked: absentRecords.length,
        partialUpdated: true
    };
};

module.exports = {
    getTodayDateString,
    getCurrentServerTime,
    formatTimeForDisplay,
    calculateWorkingHours,
    getTodaysAttendance,
    checkIn,
    checkOut,
    getAttendanceSummary,
    getAttendanceHistory,
    getRealTimeStatus,
    getAnalytics,
    processEndOfDay,
    CAMPUS_TIMEZONE
};
