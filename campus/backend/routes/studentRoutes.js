const express = require('express');
const router = express.Router();
const {
    getProfile,
    getTimetable,
    getAttendance,
    getMarks,
    getFees,
    getTransport,
    applyLeave,
    getLeaveRequests,
    getMyEnrollment,
    getDashboardStats
} = require('../controllers/studentController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All routes require student authentication
router.use(protect);
router.use(authorize('student'));

router.get('/profile', getProfile);
router.get('/timetable', getTimetable);
router.get('/attendance', getAttendance);
router.get('/marks', getMarks);
router.get('/fees', getFees);
router.get('/transport', getTransport);

// Notice routes (using dedicated notice controller - read only)
const {
    studentGetNotices,
    markNoticeAsRead
} = require('../controllers/noticeController');

router.get('/notices', studentGetNotices);
router.put('/notices/:id/read', markNoticeAsRead);

router.post('/leave', applyLeave);
router.get('/leave', getLeaveRequests);

// Leave stats for sidebar badge
const { getStudentLeaveStats } = require('../controllers/leaveController');
router.get('/leave/stats', getStudentLeaveStats);

// Module 5: Student Dashboard Extension
router.get('/enrollment', getMyEnrollment);
router.get('/dashboard-stats', getDashboardStats);

// Module 7: Results
const { getMyExamResults } = require('../controllers/examController');
router.get('/results', getMyExamResults);

// Online Exam System
const {
    getAvailableExams,
    getExamForAttempt,
    startExam,
    saveAnswers,
    submitExam,
    getStudentResults
} = require('../controllers/onlineExamController');

router.get('/online-exams', getAvailableExams);
router.get('/online-exams/results', getStudentResults);
router.get('/online-exams/:id', getExamForAttempt);
router.post('/online-exams/:id/start', startExam);
router.put('/online-exams/:id/save', saveAnswers);
router.post('/online-exams/:id/submit', submitExam);

// Feedback System
const {
    submitFeedback,
    getMyFeedback,
    getFacultyList
} = require('../controllers/feedbackController');

router.post('/feedback', submitFeedback);
router.get('/feedback/my', getMyFeedback);
router.get('/feedback/faculty-list', getFacultyList);

// ==================== FEEDBACK V2 - Thread-based System ====================
const feedbackV2 = require('../controllers/feedbackV2Controller');

router.post('/feedback/threads', feedbackV2.createThread);
router.get('/feedback/threads', feedbackV2.getMyThreads);
router.get('/feedback/threads/:id', feedbackV2.getThreadById);
router.post('/feedback/threads/:id/reply', feedbackV2.replyToThread);
// Faculty list reuses V2 controller
router.get('/feedback/v2/faculty-list', feedbackV2.getFacultyList);

// ==================== ATTENDANCE V2 ====================
const attendanceV2 = require('../controllers/attendanceV2Controller');

router.get('/attendance/v2', attendanceV2.getMyAttendanceDetails);
router.get('/attendance/v2/summary', attendanceV2.getMyAttendanceSummary);
router.get('/attendance/v2/eligibility', attendanceV2.checkExamEligibility);

module.exports = router;


