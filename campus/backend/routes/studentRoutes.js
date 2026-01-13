const express = require('express');
const router = express.Router();
const {
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
router.get('/notices', getNotices);
router.post('/leave', applyLeave);
router.get('/leave', getLeaveRequests);

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
    submitExam,
    getStudentResults
} = require('../controllers/onlineExamController');

router.get('/online-exams', getAvailableExams);
router.get('/online-exams/results', getStudentResults);
router.get('/online-exams/:id', getExamForAttempt);
router.post('/online-exams/:id/start', startExam);
router.post('/online-exams/:id/submit', submitExam);

module.exports = router;

