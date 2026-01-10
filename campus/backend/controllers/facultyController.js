const Faculty = require('../models/Faculty');
const Student = require('../models/Student');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Marks = require('../models/Marks');
const Notice = require('../models/Notice');
const Leave = require('../models/Leave');
const Timetable = require('../models/Timetable');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// @desc    Get faculty profile
// @route   GET /api/faculty/profile
// @access  Faculty
const getProfile = async (req, res, next) => {
    try {
        const faculty = await Faculty.findOne({ userId: req.user._id })
            .populate('userId', 'name email phone department profileImage');

        if (!faculty) {
            return errorResponse(res, 404, 'Faculty profile not found');
        }

        return successResponse(res, 200, 'Profile retrieved', faculty);
    } catch (error) {
        next(error);
    }
};

// @desc    Get students list (for faculty's department)
// @route   GET /api/faculty/students
// @access  Faculty
const getStudentsList = async (req, res, next) => {
    try {
        const { year, section, course } = req.query;
        let query = {};

        // Get students from faculty's department
        const studentUsers = await User.find({
            role: 'student',
            department: req.user.department,
            status: 'active'
        }).select('_id');

        const userIds = studentUsers.map(u => u._id);
        query.userId = { $in: userIds };

        if (year) query.year = year;
        if (section) query.section = section;
        if (course) query.course = course;

        const students = await Student.find(query)
            .populate('userId', 'name email phone')
            .sort({ rollNo: 1 });

        return successResponse(res, 200, 'Students list retrieved', students);
    } catch (error) {
        next(error);
    }
};

// @desc    Mark attendance
// @route   POST /api/faculty/attendance
// @access  Faculty
const markAttendance = async (req, res, next) => {
    try {
        const { date, subject, records } = req.body;

        if (!date || !subject || !records || !Array.isArray(records)) {
            return errorResponse(res, 400, 'Date, subject, and attendance records are required');
        }

        const faculty = await Faculty.findOne({ userId: req.user._id });
        if (!faculty) {
            return errorResponse(res, 404, 'Faculty not found');
        }

        const attendanceRecords = [];
        for (const record of records) {
            const attendance = await Attendance.findOneAndUpdate(
                { studentId: record.studentId, date: new Date(date), subject },
                {
                    studentId: record.studentId,
                    date: new Date(date),
                    subject,
                    status: record.status,
                    markedBy: faculty._id,
                    remarks: record.remarks || ''
                },
                { upsert: true, new: true }
            );
            attendanceRecords.push(attendance);
        }

        return successResponse(res, 201, 'Attendance marked successfully', { count: attendanceRecords.length });
    } catch (error) {
        next(error);
    }
};

// @desc    Upload marks
// @route   POST /api/faculty/marks
// @access  Faculty
const uploadMarks = async (req, res, next) => {
    try {
        const { subject, examType, semester, records } = req.body;

        if (!subject || !examType || !semester || !records || !Array.isArray(records)) {
            return errorResponse(res, 400, 'Subject, examType, semester, and marks records are required');
        }

        const faculty = await Faculty.findOne({ userId: req.user._id });
        if (!faculty) {
            return errorResponse(res, 404, 'Faculty not found');
        }

        const marksRecords = [];
        for (const record of records) {
            const marks = await Marks.findOneAndUpdate(
                { studentId: record.studentId, subject, examType, semester },
                {
                    studentId: record.studentId,
                    subject,
                    examType,
                    semester,
                    marks: record.marks,
                    maxMarks: record.maxMarks,
                    uploadedBy: faculty._id,
                    remarks: record.remarks || ''
                },
                { upsert: true, new: true }
            );
            marksRecords.push(marks);
        }

        return successResponse(res, 201, 'Marks uploaded successfully', { count: marksRecords.length });
    } catch (error) {
        next(error);
    }
};

// @desc    Get leave requests (pending)
// @route   GET /api/faculty/leave
// @access  Faculty
const getLeaveRequests = async (req, res, next) => {
    try {
        const { status } = req.query;

        // Get students from faculty's department
        const studentUsers = await User.find({
            role: 'student',
            department: req.user.department
        }).select('_id');

        const userIds = studentUsers.map(u => u._id);

        let query = {
            applicantId: { $in: userIds },
            applicantType: 'student'
        };
        if (status) query.status = status;

        const leaves = await Leave.find(query)
            .populate('applicantId', 'name email')
            .sort({ createdAt: -1 });

        return successResponse(res, 200, 'Leave requests retrieved', leaves);
    } catch (error) {
        next(error);
    }
};

// @desc    Approve/Reject leave
// @route   PUT /api/faculty/leave/:id
// @access  Faculty
const updateLeaveStatus = async (req, res, next) => {
    try {
        const { status, remarks } = req.body;

        if (!status || !['approved', 'rejected'].includes(status)) {
            return errorResponse(res, 400, 'Status must be approved or rejected');
        }

        const leave = await Leave.findById(req.params.id);
        if (!leave) {
            return errorResponse(res, 404, 'Leave request not found');
        }

        leave.status = status;
        leave.approvedBy = req.user._id;
        leave.approvalDate = new Date();
        if (remarks) leave.remarks = remarks;

        await leave.save();

        return successResponse(res, 200, `Leave ${status} successfully`, leave);
    } catch (error) {
        next(error);
    }
};

// @desc    Post notice
// @route   POST /api/faculty/notices
// @access  Faculty
const postNotice = async (req, res, next) => {
    try {
        const { title, content, type, priority, targetAudience } = req.body;

        if (!title || !content) {
            return errorResponse(res, 400, 'Title and content are required');
        }

        const notice = await Notice.create({
            title,
            content,
            type: type || 'department',
            priority: priority || 'medium',
            targetAudience: targetAudience || 'students',
            department: req.user.department,
            postedBy: req.user._id
        });

        return successResponse(res, 201, 'Notice posted successfully', notice);
    } catch (error) {
        next(error);
    }
};

// @desc    Get faculty timetable
// @route   GET /api/faculty/timetable
// @access  Faculty
const getTimetable = async (req, res, next) => {
    try {
        const faculty = await Faculty.findOne({ userId: req.user._id });
        if (!faculty) {
            return errorResponse(res, 404, 'Faculty not found');
        }

        // Find timetables where this faculty is assigned
        const timetables = await Timetable.find({
            'slots.faculty': faculty._id
        });

        return successResponse(res, 200, 'Timetable retrieved', timetables);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getProfile,
    getStudentsList,
    markAttendance,
    uploadMarks,
    getLeaveRequests,
    updateLeaveStatus,
    postNotice,
    getTimetable
};
