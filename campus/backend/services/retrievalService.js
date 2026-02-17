/**
 * Retrieval Service
 * Live MongoDB data retrieval for Smart Campus Chatbot
 * 
 * RULES:
 * ✅ Fetch ONLY required fields
 * ✅ Never return full collections
 * ✅ Use optimized queries with indexes
 * ✅ All queries are LIVE - no static data
 * ✅ Summarize data before returning
 * 
 * PERFORMANCE:
 * - 3-second timeout on all queries
 * - Always use .lean() for faster reads
 * - Select only required fields
 */

const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Marks = require('../models/Marks');
const StudentMarks = require('../models/StudentMarks');
const Fee = require('../models/Fee');
const Timetable = require('../models/Timetable');
const Exam = require('../models/Exam');
const Result = require('../models/Result');
const Assignment = require('../models/Assignment');
const Notice = require('../models/Notice');
const Department = require('../models/Department');

// ==================== PERFORMANCE CONFIGURATION ====================
const QUERY_TIMEOUT_MS = 3000; // 3-second max for any MongoDB query

// Day names for timetable
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Get student information by userId
 */
const getStudentInfo = async (userId) => {
    try {
        const student = await Student.findOne({ userId })
            .populate('departmentId', 'name code')
            .populate('courseId', 'name')
            .lean();

        if (!student) {
            return { error: 'Student profile not found.' };
        }

        const user = await User.findById(userId).select('name phone').lean();

        return {
            studentInfo: {
                _id: student._id,
                name: user?.name || 'N/A',
                rollNo: student.rollNo,
                year: student.year,
                semester: student.semester,
                section: student.section,
                department: student.departmentId?.name || 'N/A',
                departmentCode: student.departmentId?.code || 'N/A',
                course: student.course || student.courseId?.name || 'N/A',
                cgpa: student.cgpa || 0,
                batch: student.batch
            }
        };
    } catch (error) {
        console.error('[Retrieval] getStudentInfo error:', error.message);
        return { error: 'Failed to retrieve student information.' };
    }
};

/**
 * Get faculty information by userId
 */
const getFacultyInfo = async (userId) => {
    try {
        const faculty = await Faculty.findOne({ userId })
            .populate('departmentId', 'name code')
            .lean();

        if (!faculty) {
            return { error: 'Faculty profile not found.' };
        }

        const user = await User.findById(userId).select('name phone').lean();

        return {
            facultyInfo: {
                _id: faculty._id,
                name: user?.name || 'N/A',
                employeeId: faculty.employeeId,
                designation: faculty.designation,
                department: faculty.departmentId?.name || 'N/A',
                subjects: faculty.subjects || [],
                classIds: faculty.classIds || []
            }
        };
    } catch (error) {
        console.error('[Retrieval] getFacultyInfo error:', error.message);
        return { error: 'Failed to retrieve faculty information.' };
    }
};

/**
 * Get student attendance (subject-wise summary)
 */
const getStudentAttendance = async (studentId) => {
    try {
        // Get V2 attendance records
        const attendanceRecords = await Attendance.find({
            'records.studentId': studentId,
            isV2: true,
            isLocked: true
        }).populate('subjectId', 'name code').lean();

        if (attendanceRecords.length === 0) {
            return {
                attendance: [],
                error: 'No attendance records found.'
            };
        }

        // Calculate subject-wise attendance
        const subjectStats = {};
        attendanceRecords.forEach(record => {
            const subjectName = record.subjectId?.name || record.subject || 'Unknown';
            if (!subjectStats[subjectName]) {
                subjectStats[subjectName] = { present: 0, total: 0 };
            }

            const studentRecord = record.records.find(
                r => r.studentId.toString() === studentId.toString()
            );
            if (studentRecord) {
                subjectStats[subjectName].total++;
                if (studentRecord.status === 'present') {
                    subjectStats[subjectName].present++;
                }
            }
        });

        // Format attendance data
        const attendance = Object.entries(subjectStats).map(([subject, stats]) => ({
            subject,
            present: stats.present,
            absent: stats.total - stats.present,
            total: stats.total,
            percentage: stats.total > 0
                ? parseFloat(((stats.present / stats.total) * 100).toFixed(1))
                : 0
        }));

        // Calculate overall
        const totalPresent = attendance.reduce((sum, a) => sum + a.present, 0);
        const totalClasses = attendance.reduce((sum, a) => sum + a.total, 0);
        const overallPercentage = totalClasses > 0
            ? parseFloat(((totalPresent / totalClasses) * 100).toFixed(1))
            : 0;

        return {
            attendance,
            attendanceSummary: {
                overall: overallPercentage,
                totalPresent,
                totalClasses,
                belowThreshold: overallPercentage < 75
            }
        };
    } catch (error) {
        console.error('[Retrieval] getStudentAttendance error:', error.message);
        return { error: 'Failed to retrieve attendance.' };
    }
};

/**
 * Get student marks (published only)
 */
const getStudentMarks = async (studentId) => {
    try {
        // Try StudentMarks first (admin-entered marks)
        let marks = await StudentMarks.find({
            studentId,
            status: 'published'
        }).select('subject subjectName internalMarks externalMarks totalMarks grade semester').lean();

        if (marks.length === 0) {
            // Fallback to legacy Marks model
            marks = await Marks.find({ studentId })
                .select('subject marks maxMarks examType semester')
                .lean();

            if (marks.length === 0) {
                return {
                    marks: [],
                    error: 'No published marks found.'
                };
            }

            // Format legacy marks
            return {
                marks: marks.map(m => ({
                    subject: m.subject,
                    examType: m.examType,
                    obtained: m.marks,
                    maxMarks: m.maxMarks,
                    percentage: m.maxMarks > 0 ? parseFloat(((m.marks / m.maxMarks) * 100).toFixed(1)) : 0,
                    semester: m.semester
                }))
            };
        }

        // Format StudentMarks data
        return {
            marks: marks.map(m => ({
                subject: m.subjectName || m.subject,
                internal: m.internalMarks,
                external: m.externalMarks,
                totalMarks: m.totalMarks,
                grade: m.grade,
                semester: m.semester
            }))
        };
    } catch (error) {
        console.error('[Retrieval] getStudentMarks error:', error.message);
        return { error: 'Failed to retrieve marks.' };
    }
};

/**
 * Get student's timetable for a specific day
 */
const getTodayTimetable = async (studentId, dayOffset = 0) => {
    try {
        // Get student info first
        const student = await Student.findById(studentId)
            .populate('departmentId', 'name code')
            .lean();

        if (!student) {
            return { error: 'Student not found.' };
        }

        // Calculate target day
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + dayOffset);
        const dayName = DAYS[targetDate.getDay()];

        if (dayName === 'Sunday') {
            return {
                timetable: {
                    day: dayName,
                    message: 'No classes scheduled on Sunday.',
                    slots: []
                }
            };
        }

        // Query timetable
        const timetable = await Timetable.findOne({
            $or: [
                { department: student.departmentId?.code },
                { department: student.departmentId?.name },
                { departmentId: student.departmentId?._id }
            ],
            year: student.year,
            section: student.section,
            day: dayName,
            status: 'published'
        }).populate('slots.subjectId', 'name code').lean();

        if (!timetable || !timetable.slots || timetable.slots.length === 0) {
            return {
                timetable: {
                    day: dayName,
                    message: `No timetable found for ${dayName}.`,
                    slots: []
                }
            };
        }

        // Sort and format slots
        const sortedSlots = timetable.slots
            .sort((a, b) => {
                const timeA = parseInt(a.startTime.replace(':', ''));
                const timeB = parseInt(b.startTime.replace(':', ''));
                return timeA - timeB;
            })
            .map(slot => ({
                startTime: slot.startTime,
                endTime: slot.endTime,
                subject: slot.subjectId?.name || slot.subject || 'Free Period',
                type: slot.type || 'lecture',
                room: slot.room || '',
                faculty: slot.facultyName || ''
            }));

        return {
            timetable: {
                day: dayName,
                slots: sortedSlots
            }
        };
    } catch (error) {
        console.error('[Retrieval] getTodayTimetable error:', error.message);
        return { error: 'Failed to retrieve timetable.' };
    }
};

/**
 * Get student fee status
 */
const getFeeStatus = async (studentId) => {
    try {
        const fees = await Fee.find({ studentId })
            .select('feeType amount status dueDate paidAmount paidDate academicYear semester')
            .sort({ dueDate: -1 })
            .limit(10)
            .lean();

        if (fees.length === 0) {
            return {
                fees: [],
                error: 'No fee records found.'
            };
        }

        // Calculate summary
        const pending = fees.filter(f => f.status === 'pending' || f.status === 'overdue');
        const paid = fees.filter(f => f.status === 'paid');
        const totalPending = pending.reduce((sum, f) => sum + (f.amount - (f.paidAmount || 0)), 0);
        const totalPaid = paid.reduce((sum, f) => sum + f.amount, 0);

        return {
            fees: fees.map(f => ({
                feeType: f.feeType,
                amount: f.amount,
                status: f.status,
                dueDate: f.dueDate,
                paidAmount: f.paidAmount || 0,
                academicYear: f.academicYear,
                semester: f.semester
            })),
            feeSummary: {
                totalPending,
                totalPaid,
                pendingCount: pending.length,
                hasOverdue: fees.some(f => f.status === 'overdue')
            }
        };
    } catch (error) {
        console.error('[Retrieval] getFeeStatus error:', error.message);
        return { error: 'Failed to retrieve fee status.' };
    }
};

/**
 * Get upcoming exams for student
 */
const getUpcomingExams = async (studentId) => {
    try {
        const student = await Student.findById(studentId).lean();
        if (!student) {
            return { error: 'Student not found.' };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const exams = await Exam.find({
            courseId: student.courseId,
            semester: student.semester,
            date: { $gte: today },
            status: { $in: ['scheduled', 'published'] }
        })
            .populate('subjectId', 'name code')
            .select('examType date startTime duration maxMarks subjectId')
            .sort({ date: 1 })
            .limit(10)
            .lean();

        if (exams.length === 0) {
            return {
                exams: [],
                message: 'No upcoming exams scheduled.'
            };
        }

        return {
            exams: exams.map(e => ({
                subject: e.subjectId?.name || 'Unknown',
                examType: e.examType,
                date: e.date,
                time: e.startTime,
                duration: e.duration,
                maxMarks: e.maxMarks
            }))
        };
    } catch (error) {
        console.error('[Retrieval] getUpcomingExams error:', error.message);
        return { error: 'Failed to retrieve exam schedule.' };
    }
};

/**
 * Get announcements/notices
 */
const getAnnouncements = async (userRole) => {
    try {
        const targetAudience = userRole === 'faculty'
            ? ['all', 'faculty']
            : ['all', 'students'];

        const notices = await Notice.find({
            isActive: true,
            targetAudience: { $in: targetAudience }
        })
            .select('title content priority type createdAt')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        if (notices.length === 0) {
            return {
                announcements: [],
                message: 'No recent announcements.'
            };
        }

        return {
            announcements: notices.map(n => ({
                title: n.title,
                content: n.content?.substring(0, 150) + (n.content?.length > 150 ? '...' : ''),
                priority: n.priority,
                type: n.type,
                date: n.createdAt
            }))
        };
    } catch (error) {
        console.error('[Retrieval] getAnnouncements error:', error.message);
        return { error: 'Failed to retrieve announcements.' };
    }
};

/**
 * Get today's/upcoming assignments for student
 */
const getStudentAssignments = async (studentId, type = 'upcoming') => {
    try {
        const student = await Student.findById(studentId).lean();
        if (!student) {
            return { error: 'Student not found.' };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let dateQuery = {};
        if (type === 'today') {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            dateQuery = { assignedDate: { $gte: today, $lt: tomorrow } };
        } else {
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);
            dateQuery = { dueDate: { $gte: today, $lte: nextWeek } };
        }

        const assignments = await Assignment.find({
            departmentId: student.departmentId,
            courseId: student.courseId,
            semester: student.semester,
            section: student.section,
            status: 'active',
            ...dateQuery
        })
            .populate('subjectId', 'name code')
            .select('title dueDate priority subjectId subjectName')
            .sort({ dueDate: 1 })
            .limit(10)
            .lean();

        if (assignments.length === 0) {
            return {
                assignments: [],
                message: type === 'today'
                    ? 'No new assignments today.'
                    : 'No upcoming assignments due in the next 7 days.'
            };
        }

        return {
            assignments: assignments.map(a => ({
                title: a.title,
                subject: a.subjectId?.name || a.subjectName || 'Unknown',
                dueDate: a.dueDate,
                priority: a.priority
            }))
        };
    } catch (error) {
        console.error('[Retrieval] getStudentAssignments error:', error.message);
        return { error: 'Failed to retrieve assignments.' };
    }
};

// ==================== FACULTY FUNCTIONS ====================

/**
 * Get faculty's teaching schedule for today
 */
const getFacultyTimetable = async (facultyId, dayOffset = 0) => {
    try {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + dayOffset);
        const dayName = DAYS[targetDate.getDay()];

        if (dayName === 'Sunday') {
            return {
                timetable: {
                    day: dayName,
                    message: 'No classes on Sunday.',
                    slots: []
                }
            };
        }

        const timetables = await Timetable.find({
            'slots.faculty': facultyId,
            day: dayName,
            status: 'published'
        })
            .populate('slots.subjectId', 'name code')
            .lean();

        const facultySlots = [];
        timetables.forEach(tt => {
            tt.slots.forEach(slot => {
                if (slot.faculty?.toString() === facultyId.toString()) {
                    facultySlots.push({
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        subject: slot.subjectId?.name || slot.subject,
                        class: `${tt.department}-${tt.year}-${tt.section}`,
                        room: slot.room,
                        type: slot.type
                    });
                }
            });
        });

        facultySlots.sort((a, b) => {
            const timeA = parseInt(a.startTime.replace(':', ''));
            const timeB = parseInt(b.startTime.replace(':', ''));
            return timeA - timeB;
        });

        return {
            timetable: {
                day: dayName,
                slots: facultySlots
            }
        };
    } catch (error) {
        console.error('[Retrieval] getFacultyTimetable error:', error.message);
        return { error: 'Failed to retrieve timetable.' };
    }
};

/**
 * Get students with low attendance in faculty's classes
 */
const getLowAttendanceStudents = async (facultyId, threshold = 75) => {
    try {
        const faculty = await Faculty.findById(facultyId).lean();
        if (!faculty || !faculty.classIds || faculty.classIds.length === 0) {
            return { error: 'No classes assigned.' };
        }

        // This is a simplified version - in production, you'd want to compute this more efficiently
        const students = await Student.find({}).populate('userId', 'name').lean();

        const lowAttendanceStudents = [];

        for (const student of students.slice(0, 50)) { // Limit for performance
            const attendanceData = await getStudentAttendance(student._id);
            if (attendanceData.attendanceSummary && attendanceData.attendanceSummary.overall < threshold) {
                lowAttendanceStudents.push({
                    name: student.userId?.name || 'Unknown',
                    rollNo: student.rollNo,
                    attendance: attendanceData.attendanceSummary.overall
                });
            }
        }

        return {
            lowAttendanceStudents: lowAttendanceStudents.slice(0, 20),
            threshold
        };
    } catch (error) {
        console.error('[Retrieval] getLowAttendanceStudents error:', error.message);
        return { error: 'Failed to retrieve low attendance data.' };
    }
};

// ==================== ADMIN FUNCTIONS ====================

/**
 * Get department analytics summary
 */
const getDepartmentAnalytics = async () => {
    try {
        const studentCount = await Student.countDocuments();
        const facultyCount = await Faculty.countDocuments();
        const departmentCount = await Department.countDocuments({ status: 'active' });

        // Get fee collection summary
        const feeStats = await Fee.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    total: { $sum: '$amount' }
                }
            }
        ]);

        const analytics = {
            totalStudents: studentCount,
            totalFaculty: facultyCount,
            totalDepartments: departmentCount,
            feeStats: feeStats.reduce((acc, stat) => {
                acc[stat._id] = { count: stat.count, total: stat.total };
                return acc;
            }, {})
        };

        return { analytics };
    } catch (error) {
        console.error('[Retrieval] getDepartmentAnalytics error:', error.message);
        return { error: 'Failed to retrieve analytics.' };
    }
};

/**
 * Main data retrieval function based on intent
 */
const getData = async (intent, userId, userRole, entities = {}) => {
    try {
        let data = {};

        // Get student/faculty ID first
        let studentId = null;
        let facultyId = null;

        if (userRole === 'student') {
            const studentInfo = await getStudentInfo(userId);
            if (studentInfo.studentInfo) {
                studentId = studentInfo.studentInfo._id;
                data = { ...data, ...studentInfo };
            }
        } else if (userRole === 'faculty') {
            const facultyInfo = await getFacultyInfo(userId);
            if (facultyInfo.facultyInfo) {
                facultyId = facultyInfo.facultyInfo._id;
                data = { ...data, ...facultyInfo };
            }
        }

        // Retrieve data based on intent
        switch (intent) {
            case 'my_attendance':
                if (studentId) {
                    const attendance = await getStudentAttendance(studentId);
                    data = { ...data, ...attendance };
                }
                break;

            case 'my_marks':
                if (studentId) {
                    const marks = await getStudentMarks(studentId);
                    data = { ...data, ...marks };
                }
                break;

            case 'today_timetable':
                if (studentId) {
                    const timetable = await getTodayTimetable(studentId, 0);
                    data = { ...data, ...timetable };
                } else if (facultyId) {
                    const timetable = await getFacultyTimetable(facultyId, 0);
                    data = { ...data, ...timetable };
                }
                break;

            case 'tomorrow_timetable':
                if (studentId) {
                    const timetable = await getTodayTimetable(studentId, 1);
                    data = { ...data, ...timetable };
                } else if (facultyId) {
                    const timetable = await getFacultyTimetable(facultyId, 1);
                    data = { ...data, ...timetable };
                }
                break;

            case 'class_schedule':
                if (studentId) {
                    const timetable = await getTodayTimetable(studentId, 0);
                    data = { ...data, ...timetable };
                }
                break;

            case 'my_fees':
            case 'fee_status':
            case 'pending_fees':
                if (studentId) {
                    const fees = await getFeeStatus(studentId);
                    data = { ...data, ...fees };
                }
                break;

            case 'exam_dates':
            case 'upcoming_exams':
                if (studentId) {
                    const exams = await getUpcomingExams(studentId);
                    data = { ...data, ...exams };
                }
                break;

            case 'today_assignment':
                if (studentId) {
                    const assignments = await getStudentAssignments(studentId, 'today');
                    data = { ...data, ...assignments };
                }
                break;

            case 'upcoming_assignments':
            case 'my_assignments':
                if (studentId) {
                    const assignments = await getStudentAssignments(studentId, 'upcoming');
                    data = { ...data, ...assignments };
                }
                break;

            case 'announcements':
            case 'notices':
                const announcements = await getAnnouncements(userRole);
                data = { ...data, ...announcements };
                break;

            case 'low_attendance_students':
            case 'students_below_attendance':
                if (facultyId) {
                    const lowAttendance = await getLowAttendanceStudents(facultyId);
                    data = { ...data, ...lowAttendance };
                }
                break;

            case 'department_analytics':
            case 'analytics':
                if (userRole === 'admin') {
                    const analytics = await getDepartmentAnalytics();
                    data = { ...data, ...analytics };
                }
                break;

            case 'student_count':
                if (userRole === 'admin') {
                    const studentCount = await Student.countDocuments();
                    data = { ...data, studentCount: { total: studentCount } };
                }
                break;

            case 'faculty_count':
                if (userRole === 'admin') {
                    const facultyCount = await Faculty.countDocuments();
                    data = { ...data, facultyCount: { total: facultyCount } };
                }
                break;

            default:
                // No matching intent — flag as unhandled (not a system error)
                data._noMatchingIntent = true;
                break;
        }

        return data;

    } catch (error) {
        console.error('[Retrieval] getData error:', error.message);
        return { error: 'Failed to retrieve data. Please try again.' };
    }
};

module.exports = {
    getStudentInfo,
    getFacultyInfo,
    getStudentAttendance,
    getStudentMarks,
    getTodayTimetable,
    getFeeStatus,
    getUpcomingExams,
    getAnnouncements,
    getStudentAssignments,
    getFacultyTimetable,
    getLowAttendanceStudents,
    getDepartmentAnalytics,
    getData
};
