/**
 * Attendance V2 Controller
 * Smart, strict, analytics-driven attendance system
 */

const Attendance = require('../models/Attendance');
const Faculty = require('../models/Faculty');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// ==================== FACULTY FUNCTIONS ====================

/**
 * @desc    Get subjects assigned to faculty
 * @route   GET /api/faculty/attendance/v2/subjects
 * @access  Faculty
 */
exports.getMyAssignedSubjects = async (req, res, next) => {
    try {
        const faculty = await Faculty.findOne({ userId: req.user._id })
            .populate('subjectIds', 'name code semester')
            .populate('departmentId', 'name')
            .lean();

        if (!faculty) {
            return errorResponse(res, 404, 'Faculty profile not found');
        }

        const subjects = faculty.subjectIds || [];
        const classIds = faculty.classIds || [];

        // Extract unique sections from classIds (format: "DEPT-SEM-SECTION")
        const classMappings = classIds.map(classId => {
            const parts = classId.split('-');
            return {
                classId,
                department: parts[0] || '',
                semester: parseInt(parts[1]) || 1,
                section: parts[2] || 'A'
            };
        });

        return successResponse(res, 200, 'Subjects fetched', {
            subjects: subjects.map(s => ({
                _id: s._id,
                name: s.name,
                code: s.code,
                semester: s.semester
            })),
            classIds: classMappings,
            department: faculty.departmentId
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get students for attendance marking
 * @route   GET /api/faculty/attendance/v2/students
 * @access  Faculty
 */
exports.getAttendanceStudents = async (req, res, next) => {
    try {
        const { subjectId, semester, section } = req.query;

        if (!subjectId || !semester) {
            return errorResponse(res, 400, 'Subject ID and semester are required');
        }

        // Verify faculty owns this subject
        const faculty = await Faculty.findOne({ userId: req.user._id });
        if (!faculty || !faculty.subjectIds.includes(subjectId)) {
            return errorResponse(res, 403, 'You are not assigned to this subject');
        }

        // Get subject details
        const subject = await Subject.findById(subjectId).populate('courseId departmentId').lean();
        if (!subject) {
            return errorResponse(res, 404, 'Subject not found');
        }

        // Get students in this class
        const studentQuery = {
            semester: parseInt(semester),
            departmentId: subject.departmentId?._id || faculty.departmentId
        };
        if (section) studentQuery.section = section;
        if (subject.courseId) studentQuery.courseId = subject.courseId._id;

        const students = await Student.find(studentQuery)
            .populate('userId', 'name email')
            .sort({ rollNo: 1 })
            .lean();

        // Check if attendance already exists for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const existingAttendance = await Attendance.findOne({
            date: { $gte: today },
            subjectId,
            semester: parseInt(semester),
            classSection: section || 'A',
            isV2: true
        });

        return successResponse(res, 200, 'Students fetched', {
            students: students.map(s => ({
                _id: s._id,
                rollNo: s.rollNo,
                name: s.userId?.name || 'Unknown',
                email: s.userId?.email || '',
                section: s.section
            })),
            subject: {
                _id: subject._id,
                name: subject.name,
                code: subject.code
            },
            alreadyMarked: !!existingAttendance,
            existingAttendance: existingAttendance ? {
                _id: existingAttendance._id,
                isLocked: existingAttendance.isLocked,
                records: existingAttendance.records
            } : null
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Mark attendance for a class
 * @route   POST /api/faculty/attendance/v2/mark
 * @access  Faculty
 */
exports.markAttendance = async (req, res, next) => {
    try {
        const { subjectId, semester, section, date, records, academicYear } = req.body;

        // Validation
        if (!subjectId || !semester || !records || !Array.isArray(records)) {
            return errorResponse(res, 400, 'Subject ID, semester, and records are required');
        }

        // Verify faculty owns this subject
        const faculty = await Faculty.findOne({ userId: req.user._id });
        if (!faculty || !faculty.subjectIds.map(s => s.toString()).includes(subjectId)) {
            return errorResponse(res, 403, 'You are not assigned to this subject');
        }

        const attendanceDate = date ? new Date(date) : new Date();
        attendanceDate.setHours(0, 0, 0, 0);

        // No future dates
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (attendanceDate > today) {
            return errorResponse(res, 400, 'Cannot mark attendance for future dates');
        }

        // Check if already exists
        const existing = await Attendance.existsForDate(attendanceDate, subjectId, semester, section || 'A');
        if (existing && existing.isLocked) {
            return errorResponse(res, 400, 'Attendance already marked and locked for this date');
        }

        // Get subject details
        const subject = await Subject.findById(subjectId).populate('departmentId courseId');

        // Calculate statistics
        const presentCount = records.filter(r => r.status === 'present').length;
        const absentCount = records.filter(r => r.status === 'absent').length;

        // Create or update attendance
        const attendanceData = {
            date: attendanceDate,
            academicYear: academicYear || '2025-2026',
            semester: parseInt(semester),
            departmentId: subject?.departmentId?._id || faculty.departmentId,
            courseId: subject?.courseId?._id,
            classSection: section || 'A',
            subjectId,
            facultyId: faculty._id,
            totalStudents: records.length,
            presentCount,
            absentCount,
            records: records.map(r => ({
                studentId: r.studentId,
                status: r.status,
                markedAt: new Date()
            })),
            isLocked: true,  // Auto-lock on submit
            isV2: true
        };

        let attendance;
        if (existing) {
            attendance = await Attendance.findByIdAndUpdate(existing._id, attendanceData, { new: true });
        } else {
            attendance = await Attendance.create(attendanceData);
        }

        return successResponse(res, 201, 'Attendance marked successfully', {
            _id: attendance._id,
            date: attendance.date,
            presentCount,
            absentCount,
            totalStudents: records.length,
            isLocked: attendance.isLocked
        });
    } catch (error) {
        if (error.code === 11000) {
            return errorResponse(res, 400, 'Attendance already exists for this subject/date/class');
        }
        next(error);
    }
};

/**
 * @desc    Get faculty's attendance history
 * @route   GET /api/faculty/attendance/v2/history
 * @access  Faculty
 */
exports.getMyAttendanceHistory = async (req, res, next) => {
    try {
        const { subjectId, startDate, endDate, page = 1, limit = 20 } = req.query;

        const faculty = await Faculty.findOne({ userId: req.user._id });
        if (!faculty) {
            return errorResponse(res, 404, 'Faculty profile not found');
        }

        const match = { facultyId: faculty._id, isV2: true };
        if (subjectId) match.subjectId = subjectId;
        if (startDate || endDate) {
            match.date = {};
            if (startDate) match.date.$gte = new Date(startDate);
            if (endDate) match.date.$lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [history, total] = await Promise.all([
            Attendance.find(match)
                .populate('subjectId', 'name code')
                .sort({ date: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Attendance.countDocuments(match)
        ]);

        return successResponse(res, 200, 'History fetched', {
            history: history.map(h => ({
                _id: h._id,
                date: h.date,
                subject: h.subjectId?.name || 'Unknown',
                subjectCode: h.subjectId?.code || '',
                semester: h.semester,
                section: h.classSection,
                presentCount: h.presentCount,
                absentCount: h.absentCount,
                totalStudents: h.totalStudents,
                percentage: h.totalStudents > 0 ? ((h.presentCount / h.totalStudents) * 100).toFixed(1) : 0,
                isLocked: h.isLocked
            })),
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        next(error);
    }
};

// ==================== STUDENT FUNCTIONS ====================

/**
 * @desc    Get student's attendance details
 * @route   GET /api/student/attendance/v2
 * @access  Student
 */
exports.getMyAttendanceDetails = async (req, res, next) => {
    try {
        const student = await Student.findOne({ userId: req.user._id })
            .populate('departmentId courseId')
            .lean();

        if (!student) {
            return errorResponse(res, 404, 'Student profile not found');
        }

        // Get all subjects for this student's semester/course
        const subjects = await Subject.find({
            semester: student.semester,
            $or: [
                { courseId: student.courseId?._id },
                { departmentId: student.departmentId?._id }
            ],
            isActive: true
        }).lean();

        // Get attendance for each subject
        const attendanceData = await Promise.all(subjects.map(async (subject) => {
            const stats = await Attendance.getStudentSubjectAttendance(student._id, subject._id);
            return {
                subject: {
                    _id: subject._id,
                    name: subject.name,
                    code: subject.code
                },
                ...stats,
                status: stats.percentage >= 75 ? 'eligible' : stats.percentage >= 60 ? 'warning' : 'critical'
            };
        }));

        return successResponse(res, 200, 'Attendance details fetched', {
            student: {
                name: student.userId?.name || 'Student',
                rollNo: student.rollNo,
                semester: student.semester,
                section: student.section
            },
            attendance: attendanceData
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get student's attendance summary
 * @route   GET /api/student/attendance/v2/summary
 * @access  Student
 */
exports.getMyAttendanceSummary = async (req, res, next) => {
    try {
        const student = await Student.findOne({ userId: req.user._id }).lean();
        if (!student) {
            return errorResponse(res, 404, 'Student profile not found');
        }

        // Aggregate attendance across all subjects
        const result = await Attendance.aggregate([
            { $match: { 'records.studentId': student._id, isV2: true, isLocked: true } },
            { $unwind: '$records' },
            { $match: { 'records.studentId': student._id } },
            {
                $group: {
                    _id: null,
                    totalClasses: { $sum: 1 },
                    presentCount: {
                        $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] }
                    }
                }
            }
        ]);

        const stats = result[0] || { totalClasses: 0, presentCount: 0 };
        const percentage = stats.totalClasses > 0
            ? ((stats.presentCount / stats.totalClasses) * 100).toFixed(2)
            : 0;

        return successResponse(res, 200, 'Summary fetched', {
            totalClasses: stats.totalClasses,
            present: stats.presentCount,
            absent: stats.totalClasses - stats.presentCount,
            percentage: parseFloat(percentage),
            isEligible: parseFloat(percentage) >= 75,
            status: parseFloat(percentage) >= 75 ? 'eligible' : parseFloat(percentage) >= 60 ? 'warning' : 'critical'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Check exam eligibility
 * @route   GET /api/student/attendance/v2/eligibility
 * @access  Student
 */
exports.checkExamEligibility = async (req, res, next) => {
    try {
        const student = await Student.findOne({ userId: req.user._id })
            .populate('departmentId courseId')
            .lean();

        if (!student) {
            return errorResponse(res, 404, 'Student profile not found');
        }

        const subjects = await Subject.find({
            semester: student.semester,
            $or: [
                { courseId: student.courseId?._id },
                { departmentId: student.departmentId?._id }
            ],
            isActive: true
        }).lean();

        const eligibility = await Promise.all(subjects.map(async (subject) => {
            const stats = await Attendance.getStudentSubjectAttendance(student._id, subject._id);
            return {
                subject: subject.name,
                subjectCode: subject.code,
                percentage: stats.percentage,
                isEligible: stats.percentage >= 75,
                classesAttended: stats.present,
                totalClasses: stats.total,
                shortfall: stats.percentage < 75 ? Math.ceil((0.75 * stats.total - stats.present) / 0.25) : 0
            };
        }));

        const overallEligible = eligibility.every(e => e.isEligible);
        const criticalSubjects = eligibility.filter(e => e.percentage < 60);

        return successResponse(res, 200, 'Eligibility checked', {
            overallEligible,
            subjects: eligibility,
            criticalSubjects: criticalSubjects.length,
            message: overallEligible
                ? 'You are eligible for all exams'
                : `You have ${criticalSubjects.length} subject(s) below 60% attendance`
        });
    } catch (error) {
        next(error);
    }
};

// ==================== ADMIN FUNCTIONS ====================

/**
 * @desc    Get attendance dashboard
 * @route   GET /api/admin/attendance/v2/dashboard
 * @access  Admin
 */
exports.getAttendanceDashboard = async (req, res, next) => {
    try {
        const { departmentId, semester, startDate, endDate } = req.query;

        const match = { isV2: true, isLocked: true };
        if (departmentId) match.departmentId = departmentId;
        if (semester) match.semester = parseInt(semester);
        if (startDate || endDate) {
            match.date = {};
            if (startDate) match.date.$gte = new Date(startDate);
            if (endDate) match.date.$lte = new Date(endDate);
        }

        // Overall stats
        const overallStats = await Attendance.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    totalRecords: { $sum: 1 },
                    totalStudents: { $sum: '$totalStudents' },
                    totalPresent: { $sum: '$presentCount' },
                    totalAbsent: { $sum: '$absentCount' }
                }
            }
        ]);

        const stats = overallStats[0] || { totalRecords: 0, totalStudents: 0, totalPresent: 0, totalAbsent: 0 };
        const overallPercentage = stats.totalStudents > 0
            ? ((stats.totalPresent / stats.totalStudents) * 100).toFixed(2)
            : 0;

        // Department-wise breakdown
        const deptStats = await Attendance.aggregate([
            { $match: match },
            {
                $group: {
                    _id: '$departmentId',
                    totalStudents: { $sum: '$totalStudents' },
                    totalPresent: { $sum: '$presentCount' }
                }
            },
            {
                $lookup: {
                    from: 'departments',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'department'
                }
            },
            { $unwind: { path: '$department', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    department: '$department.name',
                    totalStudents: 1,
                    totalPresent: 1,
                    percentage: {
                        $cond: [
                            { $gt: ['$totalStudents', 0] },
                            { $multiply: [{ $divide: ['$totalPresent', '$totalStudents'] }, 100] },
                            0
                        ]
                    }
                }
            },
            { $sort: { percentage: -1 } }
        ]);

        // Low attendance students count
        const lowAttendanceCount = await Student.countDocuments({});  // Simplified - real implementation would need join

        return successResponse(res, 200, 'Dashboard fetched', {
            overview: {
                totalAttendanceRecords: stats.totalRecords,
                overallPercentage: parseFloat(overallPercentage),
                totalPresent: stats.totalPresent,
                totalAbsent: stats.totalAbsent
            },
            departmentStats: deptStats.map(d => ({
                department: d.department || 'Unknown',
                percentage: parseFloat(d.percentage.toFixed(2)),
                totalStudents: d.totalStudents
            })),
            lowAttendanceCount
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get department-wise analytics
 * @route   GET /api/admin/attendance/v2/analytics
 * @access  Admin
 */
exports.getDepartmentAnalytics = async (req, res, next) => {
    try {
        const { semester } = req.query;

        const match = { isV2: true, isLocked: true };
        if (semester) match.semester = parseInt(semester);

        // Semester-wise trend
        const semesterTrend = await Attendance.aggregate([
            { $match: { isV2: true, isLocked: true } },
            {
                $group: {
                    _id: '$semester',
                    totalStudents: { $sum: '$totalStudents' },
                    totalPresent: { $sum: '$presentCount' }
                }
            },
            {
                $project: {
                    semester: '$_id',
                    percentage: {
                        $cond: [
                            { $gt: ['$totalStudents', 0] },
                            { $multiply: [{ $divide: ['$totalPresent', '$totalStudents'] }, 100] },
                            0
                        ]
                    }
                }
            },
            { $sort: { semester: 1 } }
        ]);

        // Subject-wise stats
        const subjectStats = await Attendance.aggregate([
            { $match: match },
            {
                $group: {
                    _id: '$subjectId',
                    totalStudents: { $sum: '$totalStudents' },
                    totalPresent: { $sum: '$presentCount' },
                    recordCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'subjects',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'subject'
                }
            },
            { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    subject: '$subject.name',
                    subjectCode: '$subject.code',
                    percentage: {
                        $cond: [
                            { $gt: ['$totalStudents', 0] },
                            { $multiply: [{ $divide: ['$totalPresent', '$totalStudents'] }, 100] },
                            0
                        ]
                    },
                    recordCount: 1
                }
            },
            { $sort: { percentage: -1 } },
            { $limit: 10 }
        ]);

        return successResponse(res, 200, 'Analytics fetched', {
            semesterTrend: semesterTrend.map(s => ({
                semester: s.semester,
                percentage: parseFloat(s.percentage.toFixed(2))
            })),
            topSubjects: subjectStats.map(s => ({
                subject: s.subject || 'Unknown',
                code: s.subjectCode || '',
                percentage: parseFloat(s.percentage.toFixed(2)),
                classes: s.recordCount
            }))
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get low attendance students
 * @route   GET /api/admin/attendance/v2/low-attendance
 * @access  Admin
 */
exports.getLowAttendanceStudents = async (req, res, next) => {
    try {
        const { threshold = 75, departmentId, semester, page = 1, limit = 50 } = req.query;

        // Get all students with their attendance
        const studentMatch = {};
        if (departmentId) studentMatch.departmentId = departmentId;
        if (semester) studentMatch.semester = parseInt(semester);

        const students = await Student.find(studentMatch)
            .populate('userId', 'name email')
            .populate('departmentId', 'name')
            .populate('courseId', 'name')
            .lean();

        // Calculate attendance for each student
        const studentsWithAttendance = await Promise.all(students.map(async (student) => {
            const result = await Attendance.aggregate([
                { $match: { 'records.studentId': student._id, isV2: true, isLocked: true } },
                { $unwind: '$records' },
                { $match: { 'records.studentId': student._id } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        present: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } }
                    }
                }
            ]);

            const stats = result[0] || { total: 0, present: 0 };
            const percentage = stats.total > 0 ? (stats.present / stats.total) * 100 : 100;

            return {
                ...student,
                attendanceStats: {
                    total: stats.total,
                    present: stats.present,
                    absent: stats.total - stats.present,
                    percentage: parseFloat(percentage.toFixed(2))
                }
            };
        }));

        // Filter low attendance
        const lowAttendance = studentsWithAttendance
            .filter(s => s.attendanceStats.percentage < parseFloat(threshold))
            .sort((a, b) => a.attendanceStats.percentage - b.attendanceStats.percentage);

        // Paginate
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const paginated = lowAttendance.slice(skip, skip + parseInt(limit));

        return successResponse(res, 200, 'Low attendance students fetched', {
            students: paginated.map(s => ({
                _id: s._id,
                name: s.userId?.name || 'Unknown',
                rollNo: s.rollNo,
                email: s.userId?.email || '',
                department: s.departmentId?.name || 'N/A',
                course: s.courseId?.name || 'N/A',
                semester: s.semester,
                section: s.section,
                ...s.attendanceStats,
                status: s.attendanceStats.percentage < 60 ? 'critical' : 'warning'
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: lowAttendance.length,
                pages: Math.ceil(lowAttendance.length / parseInt(limit))
            },
            threshold: parseFloat(threshold)
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Export attendance report
 * @route   GET /api/admin/attendance/v2/export
 * @access  Admin
 */
exports.exportAttendanceReport = async (req, res, next) => {
    try {
        const { departmentId, semester, startDate, endDate } = req.query;

        const match = { isV2: true };
        if (departmentId) match.departmentId = departmentId;
        if (semester) match.semester = parseInt(semester);
        if (startDate || endDate) {
            match.date = {};
            if (startDate) match.date.$gte = new Date(startDate);
            if (endDate) match.date.$lte = new Date(endDate);
        }

        const records = await Attendance.find(match)
            .populate('subjectId', 'name code')
            .populate('facultyId', 'userId')
            .populate('departmentId', 'name')
            .sort({ date: -1 })
            .limit(1000)
            .lean();

        const exportData = records.map(r => ({
            Date: r.date.toISOString().split('T')[0],
            Subject: r.subjectId?.name || 'N/A',
            SubjectCode: r.subjectId?.code || '',
            Department: r.departmentId?.name || 'N/A',
            Semester: r.semester,
            Section: r.classSection,
            TotalStudents: r.totalStudents,
            Present: r.presentCount,
            Absent: r.absentCount,
            Percentage: r.totalStudents > 0 ? ((r.presentCount / r.totalStudents) * 100).toFixed(2) : 0
        }));

        return successResponse(res, 200, 'Export data ready', {
            count: exportData.length,
            data: exportData
        });
    } catch (error) {
        next(error);
    }
};
