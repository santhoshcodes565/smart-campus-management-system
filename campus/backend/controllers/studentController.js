const Student = require('../models/Student');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Marks = require('../models/Marks');
const Fee = require('../models/Fee');
const Notice = require('../models/Notice');
const Leave = require('../models/Leave');
const Timetable = require('../models/Timetable');
const Transport = require('../models/Transport');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// @desc    Get student profile
// @route   GET /api/student/profile
// @access  Student
const getProfile = async (req, res, next) => {
    try {
        const student = await Student.findOne({ userId: req.user._id })
            .populate('userId', 'name email phone department profileImage')
            .populate('transportId');

        if (!student) {
            return errorResponse(res, 404, 'Student profile not found');
        }

        return successResponse(res, 200, 'Profile retrieved', student);
    } catch (error) {
        next(error);
    }
};

// @desc    Get student timetable
// @route   GET /api/student/timetable
// @access  Student (READ-ONLY - only published/locked timetables visible)
const getTimetable = async (req, res, next) => {
    try {
        const student = await Student.findOne({ userId: req.user._id })
            .populate('departmentId', 'name code');
        if (!student) {
            return errorResponse(res, 404, 'Student not found');
        }

        // Build flexible department query
        // Priority: Match by departmentId (ObjectId) if available, then by department string
        const departmentQuery = [];

        if (student.departmentId && student.departmentId._id) {
            // Match by ObjectId (most reliable)
            departmentQuery.push({ departmentId: student.departmentId._id });
        }

        // Also try matching by department code/name strings
        if (student.departmentId && student.departmentId.code) {
            departmentQuery.push({ department: student.departmentId.code });
        }
        if (student.departmentId && student.departmentId.name) {
            departmentQuery.push({ department: student.departmentId.name });
        }
        if (req.user.department) {
            departmentQuery.push({ department: req.user.department });
        }

        console.log('[TIMETABLE DEBUG] Student lookup:', {
            studentId: student._id,
            departmentId: student.departmentId?._id,
            departmentCode: student.departmentId?.code,
            departmentName: student.departmentId?.name,
            userDepartment: req.user.department,
            year: student.year,
            section: student.section,
            queryOptions: departmentQuery.length
        });

        // If no department info available, return empty
        if (departmentQuery.length === 0) {
            console.log('[TIMETABLE DEBUG] No department info found for student');
            return successResponse(res, 200, 'Timetable retrieved', []);
        }

        // Only show published or locked timetables (not draft)
        // Use $or to match any department identifier
        const timetable = await Timetable.find({
            $or: departmentQuery,
            year: student.year,
            section: student.section,
            status: { $in: ['published', 'locked'] }  // Lifecycle filter
        })
            .populate('slots.faculty', 'userId')
            .populate({
                path: 'slots.faculty',
                populate: { path: 'userId', select: 'name' }
            })
            .sort({ day: 1 });

        console.log('[TIMETABLE DEBUG] Found entries:', timetable.length);

        return successResponse(res, 200, 'Timetable retrieved', timetable);
    } catch (error) {
        next(error);
    }
};

// @desc    Get student attendance
// @route   GET /api/student/attendance
// @access  Student
const getAttendance = async (req, res, next) => {
    try {
        const student = await Student.findOne({ userId: req.user._id });
        if (!student) {
            return errorResponse(res, 404, 'Student not found');
        }

        const { subject, fromDate, toDate } = req.query;
        let query = { studentId: student._id };

        if (subject) query.subject = subject;
        if (fromDate && toDate) {
            query.date = { $gte: new Date(fromDate), $lte: new Date(toDate) };
        }

        const attendance = await Attendance.find(query)
            .populate('markedBy', 'userId')
            .sort({ date: -1 });

        // Calculate attendance percentage
        const total = attendance.length;
        const present = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
        const percentage = total > 0 ? ((present / total) * 100).toFixed(2) : 0;

        return successResponse(res, 200, 'Attendance retrieved', {
            attendance,
            summary: { total, present, absent: total - present, percentage }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get student marks
// @route   GET /api/student/marks
// @access  Student
const getMarks = async (req, res, next) => {
    try {
        const student = await Student.findOne({ userId: req.user._id });
        if (!student) {
            return errorResponse(res, 404, 'Student not found');
        }

        const { semester, subject, examType } = req.query;
        let query = { studentId: student._id };

        if (semester) query.semester = semester;
        if (subject) query.subject = subject;
        if (examType) query.examType = examType;

        const marks = await Marks.find(query)
            .populate('uploadedBy', 'userId')
            .sort({ semester: 1, subject: 1 });

        return successResponse(res, 200, 'Marks retrieved', marks);
    } catch (error) {
        next(error);
    }
};

// @desc    Get student fee details
// @route   GET /api/student/fees
// @access  Student
const getFees = async (req, res, next) => {
    try {
        const student = await Student.findOne({ userId: req.user._id });
        if (!student) {
            return errorResponse(res, 404, 'Student not found');
        }

        const fees = await Fee.find({ studentId: student._id }).sort({ dueDate: -1 });

        const totalAmount = fees.reduce((sum, fee) => sum + fee.amount, 0);
        const paidAmount = fees.reduce((sum, fee) => sum + fee.paidAmount, 0);
        const pendingAmount = totalAmount - paidAmount;

        return successResponse(res, 200, 'Fee details retrieved', {
            fees,
            summary: { totalAmount, paidAmount, pendingAmount }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get student transport details
// @route   GET /api/student/transport
// @access  Student
const getTransport = async (req, res, next) => {
    try {
        const student = await Student.findOne({ userId: req.user._id }).populate('transportId');

        if (!student) {
            return errorResponse(res, 404, 'Student not found');
        }

        if (!student.transportId) {
            return successResponse(res, 200, 'No transport assigned', null);
        }

        return successResponse(res, 200, 'Transport details retrieved', student.transportId);
    } catch (error) {
        next(error);
    }
};

// @desc    Get notices for student
// @route   GET /api/student/notices
// @access  Student
const getNotices = async (req, res, next) => {
    try {
        const notices = await Notice.find({
            isActive: true,
            $or: [
                { type: 'global' },
                { targetAudience: 'students' },
                { targetAudience: 'all' },
                { department: req.user.department }
            ]
        })
            .populate('postedBy', 'name')
            .sort({ createdAt: -1 })
            .limit(20);

        return successResponse(res, 200, 'Notices retrieved', notices);
    } catch (error) {
        next(error);
    }
};

// @desc    Apply for leave
// @route   POST /api/student/leave
// @access  Student
const applyLeave = async (req, res, next) => {
    try {
        const { leaveType, fromDate, toDate, reason } = req.body;

        if (!leaveType || !fromDate || !toDate || !reason) {
            return errorResponse(res, 400, 'All fields are required');
        }

        const leave = await Leave.create({
            applicantId: req.user._id,
            applicantType: 'student',
            leaveType,
            fromDate: new Date(fromDate),
            toDate: new Date(toDate),
            reason
        });

        return successResponse(res, 201, 'Leave application submitted', leave);
    } catch (error) {
        next(error);
    }
};

// @desc    Get student leave requests
// @route   GET /api/student/leave
// @access  Student
const getLeaveRequests = async (req, res, next) => {
    try {
        const leaves = await Leave.find({ applicantId: req.user._id })
            .populate('approvedBy', 'name')
            .sort({ createdAt: -1 });

        return successResponse(res, 200, 'Leave requests retrieved', leaves);
    } catch (error) {
        next(error);
    }
};

// ==================== MODULE 5: Student Dashboard Extension ====================

// @desc    Get student enrollment details
// @route   GET /api/student/enrollment
// @access  Student
const getMyEnrollment = async (req, res, next) => {
    try {
        const student = await Student.findOne({ userId: req.user._id })
            .populate('userId', 'name email phone department')
            .populate('departmentId', 'name code')
            .populate('courseId', 'name code totalSemesters');

        if (!student) {
            return errorResponse(res, 404, 'Student not found');
        }

        return successResponse(res, 200, 'Enrollment retrieved', {
            student: {
                rollNo: student.rollNo,
                year: student.year,
                semester: student.semester,
                section: student.section,
                batch: student.batch
            },
            department: student.departmentId,
            course: student.courseId,
            user: student.userId
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get student dashboard statistics
// @route   GET /api/student/dashboard-stats
// @access  Student
const getDashboardStats = async (req, res, next) => {
    try {
        const student = await Student.findOne({ userId: req.user._id });
        if (!student) {
            return errorResponse(res, 404, 'Student not found');
        }

        // Get attendance percentage
        const attendance = await Attendance.find({ studentId: student._id });
        const totalAttendance = attendance.length;
        const presentCount = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
        const attendancePercentage = totalAttendance > 0 ? ((presentCount / totalAttendance) * 100).toFixed(1) : 0;

        // Get pending fees
        const Fee = require('../models/Fee');
        const fees = await Fee.find({ studentId: student._id });
        const totalFees = fees.reduce((sum, f) => sum + f.amount, 0);
        const paidFees = fees.reduce((sum, f) => sum + f.paidAmount, 0);
        const pendingFees = totalFees - paidFees;

        // Get marks count
        const marksCount = await Marks.countDocuments({ studentId: student._id });

        // Get pending leave requests count
        const pendingLeaves = await Leave.countDocuments({
            applicantId: req.user._id,
            status: 'pending'
        });

        return successResponse(res, 200, 'Dashboard stats retrieved', {
            attendancePercentage: parseFloat(attendancePercentage),
            totalClasses: totalAttendance,
            pendingFees,
            marksCount,
            pendingLeaves,
            year: student.year,
            semester: student.semester
        });
    } catch (error) {
        next(error);
    }
};
// ==================== STUDENT ACCOUNT MODULE ====================

// @desc    Get current student's full profile (secure - uses JWT)
// @route   GET /api/student/me
// @access  Student
const getMyProfile = async (req, res, next) => {
    try {
        const student = await Student.findOne({ userId: req.user._id })
            .populate('userId', 'name email phone department status profileImage date_of_birth')
            .populate('departmentId', 'name code')
            .populate('courseId', 'name code')
            .populate('transportId', 'routeName vehicleNumber driver');

        if (!student) {
            return errorResponse(res, 404, 'Student profile not found');
        }

        return successResponse(res, 200, 'Profile retrieved', student);
    } catch (error) {
        next(error);
    }
};

// @desc    Update current student's profile (secure - uses JWT)
// @route   PATCH /api/student/me
// @access  Student
const updateMyProfile = async (req, res, next) => {
    try {
        const { phone, address, guardianName, guardianPhone, bloodGroup } = req.body;

        // Find student by JWT identity
        const student = await Student.findOne({ userId: req.user._id });
        if (!student) {
            return errorResponse(res, 404, 'Student profile not found');
        }

        // Validate phone numbers (10 digits only)
        if (phone && !/^\d{10}$/.test(phone)) {
            return errorResponse(res, 400, 'Phone number must be 10 digits');
        }
        if (guardianPhone && !/^\d{10}$/.test(guardianPhone)) {
            return errorResponse(res, 400, 'Guardian phone must be 10 digits');
        }

        // Update User model fields (phone)
        if (phone !== undefined) {
            await User.findByIdAndUpdate(req.user._id, { phone: phone || '' });
        }

        // Update Student model fields
        const updateData = {};
        if (address !== undefined) updateData.address = address;
        if (guardianName !== undefined) updateData.guardianName = guardianName;
        if (guardianPhone !== undefined) updateData.guardianPhone = guardianPhone;
        if (bloodGroup !== undefined) updateData.bloodGroup = bloodGroup;

        const updatedStudent = await Student.findByIdAndUpdate(
            student._id,
            updateData,
            { new: true, runValidators: true }
        )
            .populate('userId', 'name email phone department status profileImage')
            .populate('departmentId', 'name code')
            .populate('courseId', 'name code');

        return successResponse(res, 200, 'Profile updated successfully', updatedStudent);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getProfile,
    getTimetable,
    getAttendance,
    getMarks,
    getFees,
    getTransport,
    getNotices,
    applyLeave,
    getLeaveRequests,
    getMyEnrollment,
    getDashboardStats,
    getMyProfile,
    updateMyProfile
};

