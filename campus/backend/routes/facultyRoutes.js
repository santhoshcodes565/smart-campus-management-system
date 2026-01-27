const express = require('express');
const router = express.Router();
const {
    getProfile,
    getStudentsList,
    markAttendance,
    uploadMarks,
    getLeaveRequests,
    updateLeaveStatus,
    getTimetable,
    getMySubjects,
    getMyClasses,
    getDashboardStats,
    getClasses,
    getStudentsByClass
} = require('../controllers/facultyController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All routes require faculty authentication
router.use(protect);
router.use(authorize('faculty'));

router.get('/profile', getProfile);
router.get('/students', getStudentsList);
router.get('/students/:classId', getStudentsByClass); // Get students by class ID
router.get('/classes', getClasses); // Get faculty classes
router.post('/attendance', markAttendance);
router.post('/marks', uploadMarks);
router.get('/timetable', getTimetable);

// Notice management (using dedicated notice controller)
const {
    facultyCreateNotice,
    facultyGetNotices,
    facultyDeleteNotice
} = require('../controllers/noticeController');

router.route('/notices')
    .post(facultyCreateNotice)
    .get(facultyGetNotices);
router.delete('/notices/:id', facultyDeleteNotice);

// Leave requests - support both route names for compatibility
router.get('/leave', getLeaveRequests);
router.put('/leave/:id', updateLeaveStatus);
router.get('/leave-requests', getLeaveRequests); // Frontend uses this
router.put('/leave-requests/:id', updateLeaveStatus); // Frontend uses this

// Faculty Leave Management (NEW)
const leaveController = require('../controllers/leaveController');
router.post('/leave/apply', leaveController.applyFacultyLeave);
router.get('/leave/my', leaveController.getFacultyLeaveRequests);
router.get('/leave/stats', leaveController.getFacultyLeaveStats);
router.put('/leave/:id/approve', leaveController.approveStudentLeave);
router.put('/leave/:id/reject', leaveController.rejectStudentLeave);

// Module 4: Faculty Dashboard Extension
router.get('/my-subjects', getMySubjects);
router.get('/my-classes', getMyClasses);
router.get('/dashboard-stats', getDashboardStats);

// Module 7: Exam Management (Faculty)
const { getAssignedExams, enterMarks } = require('../controllers/examController');
router.get('/exams', getAssignedExams);
router.post('/exams/:id/marks', enterMarks);

// Online Exam System
const {
    createExam,
    getMyExams,
    updateExam,
    publishExam,
    addQuestion,
    getQuestions,
    deleteQuestion,
    updateQuestion,
    deleteExam,
    getExamResults,
    evaluateDescriptive
} = require('../controllers/onlineExamController');

router.post('/online-exams', createExam);
router.get('/online-exams', getMyExams);
router.put('/online-exams/:id', updateExam);
router.put('/online-exams/:id/publish', publishExam);
router.delete('/online-exams/:id', deleteExam);
router.post('/online-exams/:id/questions', addQuestion);
router.get('/online-exams/:id/questions', getQuestions);
router.put('/online-exams/:id/questions/:questionId', updateQuestion);
router.delete('/online-exams/:id/questions/:questionId', deleteQuestion);
router.get('/online-exams/:id/results', getExamResults);
router.put('/online-exams/:id/evaluate', evaluateDescriptive);

// Feedback System
const {
    submitFeedback,
    getMyFeedback,
    markAsViewed
} = require('../controllers/feedbackController');

router.post('/feedback', submitFeedback);
router.get('/feedback/my', getMyFeedback);
router.put('/feedback/:id/view', markAsViewed);

// ==================== FEEDBACK V2 - Thread-based System ====================
const feedbackV2 = require('../controllers/feedbackV2Controller');

router.post('/feedback/threads', feedbackV2.createThread);
router.get('/feedback/threads', feedbackV2.getMyThreads);
router.get('/feedback/threads/:id', feedbackV2.getThreadById);
router.post('/feedback/threads/:id/reply', feedbackV2.replyToThread);

// Read-only access to academic data (for exam creation dropdowns)
const Subject = require('../models/Subject');
const Course = require('../models/Course');
const Department = require('../models/Department');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// Get all subjects (read-only for faculty)
router.get('/subjects', async (req, res, next) => {
    try {
        const subjects = await Subject.find({ status: 'active' })
            .populate('courseId', 'name code')
            .sort({ name: 1 });
        return successResponse(res, 200, 'Subjects fetched successfully', subjects);
    } catch (error) {
        next(error);
    }
});

// Get all courses (read-only for faculty)
router.get('/courses', async (req, res, next) => {
    try {
        const courses = await Course.find({ status: 'active' })
            .populate('departmentId', 'name code')
            .sort({ name: 1 });
        return successResponse(res, 200, 'Courses fetched successfully', courses);
    } catch (error) {
        next(error);
    }
});

// Get all departments (read-only for faculty)
router.get('/departments', async (req, res, next) => {
    try {
        const departments = await Department.find({ status: 'active' }).sort({ name: 1 });
        return successResponse(res, 200, 'Departments fetched successfully', departments);
    } catch (error) {
        next(error);
    }
});

// ==================== ATTENDANCE V2 ====================
const attendanceV2 = require('../controllers/attendanceV2Controller');

router.get('/attendance/v2/subjects', attendanceV2.getMyAssignedSubjects);
router.get('/attendance/v2/students', attendanceV2.getAttendanceStudents);
router.post('/attendance/v2/mark', attendanceV2.markAttendance);
router.get('/attendance/v2/history', attendanceV2.getMyAttendanceHistory);

// ==================== FACULTY SELF ATTENDANCE (Check-in/Check-out) ====================
const facultyAttendance = require('../controllers/facultyAttendanceController');

router.post('/attendance/check-in', facultyAttendance.checkIn);
router.post('/attendance/check-out', facultyAttendance.checkOut);
router.get('/attendance/status', facultyAttendance.getTodayStatus);
router.get('/attendance/summary', facultyAttendance.getAttendanceSummary);
router.get('/attendance/history', facultyAttendance.getAttendanceHistory);

module.exports = router;
