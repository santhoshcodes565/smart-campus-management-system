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
        // Support both old format { date, subject, records } and new format { attendance: [] }
        let attendanceData;
        let date, subject, classId;

        if (req.body.attendance && Array.isArray(req.body.attendance)) {
            // New format from frontend: { attendance: [{ studentId, status, date, classId }] }
            attendanceData = req.body.attendance;
            if (attendanceData.length > 0) {
                date = attendanceData[0].date;
                classId = attendanceData[0].classId;
            }
            subject = req.body.subject || classId; // Use classId as subject identifier if not provided
        } else if (req.body.records && Array.isArray(req.body.records)) {
            // Old format: { date, subject, records: [{ studentId, status }] }
            attendanceData = req.body.records.map(r => ({
                studentId: r.studentId,
                status: r.status,
                date: req.body.date,
                classId: req.body.classId
            }));
            date = req.body.date;
            subject = req.body.subject;
        } else {
            return errorResponse(res, 400, 'Attendance records are required');
        }

        if (!attendanceData || attendanceData.length === 0) {
            return errorResponse(res, 400, 'Attendance records cannot be empty');
        }

        const faculty = await Faculty.findOne({ userId: req.user._id });
        if (!faculty) {
            return errorResponse(res, 404, 'Faculty not found');
        }

        const attendanceRecords = [];
        for (const record of attendanceData) {
            const recordDate = record.date || date;
            const recordSubject = subject || record.classId || 'General';

            const attendance = await Attendance.findOneAndUpdate(
                {
                    studentId: record.studentId,
                    date: new Date(recordDate),
                    subject: recordSubject
                },
                {
                    studentId: record.studentId,
                    date: new Date(recordDate),
                    subject: recordSubject,
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
        // Support both old format { subject, examType, semester, records } and new format { marks: [], classId }
        let marksData;
        let subject, examType, semester;

        if (req.body.marks && Array.isArray(req.body.marks)) {
            // New format from frontend: { marks: [{ studentId, subject, examType, marksObtained, maxMarks }], classId }
            marksData = req.body.marks;
            if (marksData.length > 0) {
                subject = marksData[0].subject;
                examType = marksData[0].examType;
            }
            semester = req.body.semester || 1;
        } else if (req.body.records && Array.isArray(req.body.records)) {
            // Old format: { subject, examType, semester, records: [{ studentId, marks, maxMarks }] }
            marksData = req.body.records.map(r => ({
                studentId: r.studentId,
                subject: req.body.subject,
                examType: req.body.examType,
                marksObtained: r.marks,
                maxMarks: r.maxMarks
            }));
            subject = req.body.subject;
            examType = req.body.examType;
            semester = req.body.semester;
        } else {
            return errorResponse(res, 400, 'Marks records are required');
        }

        if (!marksData || marksData.length === 0) {
            return errorResponse(res, 400, 'Marks records cannot be empty');
        }

        const faculty = await Faculty.findOne({ userId: req.user._id });
        if (!faculty) {
            return errorResponse(res, 404, 'Faculty not found');
        }

        const marksRecords = [];
        for (const record of marksData) {
            const recordSubject = record.subject || subject || 'General';
            const recordExamType = record.examType || examType || 'internal';
            const recordMarks = record.marksObtained !== undefined ? record.marksObtained : record.marks;

            const marks = await Marks.findOneAndUpdate(
                {
                    studentId: record.studentId,
                    subject: recordSubject,
                    examType: recordExamType,
                    semester: semester || 1
                },
                {
                    studentId: record.studentId,
                    subject: recordSubject,
                    examType: recordExamType,
                    semester: semester || 1,
                    marks: recordMarks,
                    maxMarks: record.maxMarks || 100,
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
// @access  Faculty (READ-ONLY - only published/locked timetables visible)
const getTimetable = async (req, res, next) => {
    try {
        const faculty = await Faculty.findOne({ userId: req.user._id });
        if (!faculty) {
            return errorResponse(res, 404, 'Faculty not found');
        }

        // Only show published or locked timetables where this faculty is assigned
        const timetables = await Timetable.find({
            'slots.faculty': faculty._id,
            status: { $in: ['published', 'locked'] }  // Lifecycle filter
        })
            .populate('slots.subjectId', 'name code')
            .populate('departmentId', 'name')
            .populate('courseId', 'name')
            .sort({ day: 1 });

        // Transform to faculty-friendly format
        const formattedTimetables = timetables.map(tt => ({
            _id: tt._id,
            day: tt.day,
            department: tt.department,
            year: tt.year,
            section: tt.section,
            status: tt.status,
            slots: tt.slots.filter(slot =>
                slot.faculty && slot.faculty.toString() === faculty._id.toString()
            ).map(slot => ({
                ...slot.toObject(),
                class: `${tt.department}-${tt.year}-${tt.section}`
            }))
        }));

        return successResponse(res, 200, 'Timetable retrieved', formattedTimetables);
    } catch (error) {
        next(error);
    }
};

// ==================== MODULE 4: Faculty Dashboard Extension ====================

// @desc    Get faculty assigned subjects
// @route   GET /api/faculty/my-subjects
// @access  Faculty
const getMySubjects = async (req, res, next) => {
    try {
        const faculty = await Faculty.findOne({ userId: req.user._id })
            .populate({
                path: 'subjectIds',
                populate: {
                    path: 'courseId',
                    select: 'name code'
                }
            })
            .populate('departmentId', 'name code');

        if (!faculty) {
            return errorResponse(res, 404, 'Faculty not found');
        }

        return successResponse(res, 200, 'Assigned subjects retrieved', {
            department: faculty.departmentId,
            subjects: faculty.subjectIds || [],
            classIds: faculty.classIds || []
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get faculty assigned classes with student count
// @route   GET /api/faculty/my-classes
// @access  Faculty
const getMyClasses = async (req, res, next) => {
    try {
        const faculty = await Faculty.findOne({ userId: req.user._id })
            .populate('departmentId', 'name code');

        if (!faculty) {
            return errorResponse(res, 404, 'Faculty not found');
        }

        // Get student count per class
        const classData = [];
        for (const classId of (faculty.classIds || [])) {
            // classId format: "DEPT-YEAR-SECTION" e.g., "CSE-3-A"
            const parts = classId.split('-');
            if (parts.length >= 3) {
                const year = parseInt(parts[1]);
                const section = parts[2];

                const count = await Student.countDocuments({
                    departmentId: faculty.departmentId?._id,
                    year,
                    section
                });

                classData.push({
                    classId,
                    year,
                    section,
                    studentCount: count
                });
            }
        }

        return successResponse(res, 200, 'Assigned classes retrieved', classData);
    } catch (error) {
        next(error);
    }
};

// @desc    Get faculty dashboard statistics
// @route   GET /api/faculty/dashboard-stats
// @access  Faculty
const getDashboardStats = async (req, res, next) => {
    try {
        const faculty = await Faculty.findOne({ userId: req.user._id });
        if (!faculty) {
            return errorResponse(res, 404, 'Faculty not found');
        }

        // Get counts
        const subjectCount = faculty.subjectIds?.length || 0;
        const classCount = faculty.classIds?.length || 0;

        // Get student count from department
        const studentCount = await Student.countDocuments({
            departmentId: faculty.departmentId
        });

        // Get pending leave requests
        const studentUsers = await User.find({
            role: 'student',
            department: req.user.department
        }).select('_id');
        const userIds = studentUsers.map(u => u._id);
        const pendingLeaves = await Leave.countDocuments({
            applicantId: { $in: userIds },
            status: 'pending'
        });

        // Get today's attendance count
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const attendanceMarkedToday = await Attendance.countDocuments({
            markedBy: faculty._id,
            date: { $gte: today }
        });

        return successResponse(res, 200, 'Dashboard stats retrieved', {
            subjectCount,
            classCount,
            studentCount,
            pendingLeaves,
            attendanceMarkedToday
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get faculty's assigned classes
// @route   GET /api/faculty/classes
// @access  Faculty
const getClasses = async (req, res, next) => {
    try {
        const faculty = await Faculty.findOne({ userId: req.user._id })
            .populate('departmentId', 'name code');

        if (!faculty) {
            return errorResponse(res, 404, 'Faculty not found');
        }

        // Build class data from classIds (format: "DEPT-YEAR-SECTION")
        const classes = (faculty.classIds || []).map((classId, index) => {
            const parts = classId.split('-');
            const dept = parts[0] || faculty.departmentId?.code || 'GEN';
            const year = parseInt(parts[1]) || 1;
            const section = parts[2] || 'A';

            return {
                _id: classId,
                name: `${dept} ${year}${year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year ${section}`,
                department: dept,
                year,
                section
            };
        });

        // If no classIds, create default classes based on department
        if (classes.length === 0 && faculty.departmentId) {
            const defaultClasses = [
                { _id: '1', name: `${faculty.departmentId.code || 'GEN'} 3rd Year A`, department: faculty.departmentId.code, year: 3, section: 'A' },
                { _id: '2', name: `${faculty.departmentId.code || 'GEN'} 3rd Year B`, department: faculty.departmentId.code, year: 3, section: 'B' },
                { _id: '3', name: `${faculty.departmentId.code || 'GEN'} 2nd Year A`, department: faculty.departmentId.code, year: 2, section: 'A' },
            ];
            return successResponse(res, 200, 'Classes retrieved', defaultClasses);
        }

        return successResponse(res, 200, 'Classes retrieved', classes);
    } catch (error) {
        next(error);
    }
};

// @desc    Get students by class ID
// @route   GET /api/faculty/students/:classId
// @access  Faculty
const getStudentsByClass = async (req, res, next) => {
    try {
        const { classId } = req.params;

        const faculty = await Faculty.findOne({ userId: req.user._id });
        if (!faculty) {
            return errorResponse(res, 404, 'Faculty not found');
        }

        let query = {};

        // Parse classId to extract year and section (format: "DEPT-YEAR-SECTION" or just ID)
        if (classId.includes('-')) {
            const parts = classId.split('-');
            if (parts.length >= 3) {
                const year = parseInt(parts[1]);
                const section = parts[2];
                if (year) query.year = year;
                if (section) query.section = section;
            }
        }

        // Get students from faculty's department
        const studentUsers = await User.find({
            role: 'student',
            department: req.user.department,
            status: 'active'
        }).select('_id');

        const userIds = studentUsers.map(u => u._id);
        query.userId = { $in: userIds };

        const students = await Student.find(query)
            .populate('userId', 'name email phone')
            .sort({ rollNo: 1 });

        return successResponse(res, 200, 'Students retrieved', students);
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
    getTimetable,
    getMySubjects,
    getMyClasses,
    getDashboardStats,
    getClasses,
    getStudentsByClass
};
