const express = require('express');
const router = express.Router();
const {
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
router.post('/notices', postNotice);

// Leave requests - support both route names for compatibility
router.get('/leave', getLeaveRequests);
router.put('/leave/:id', updateLeaveStatus);
router.get('/leave-requests', getLeaveRequests); // Frontend uses this
router.put('/leave-requests/:id', updateLeaveStatus); // Frontend uses this

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
    getExamResults,
    evaluateDescriptive
} = require('../controllers/onlineExamController');

router.post('/online-exams', createExam);
router.get('/online-exams', getMyExams);
router.put('/online-exams/:id', updateExam);
router.put('/online-exams/:id/publish', publishExam);
router.post('/online-exams/:id/questions', addQuestion);
router.get('/online-exams/:id/questions', getQuestions);
router.delete('/online-exams/:id/questions/:questionId', deleteQuestion);
router.get('/online-exams/:id/results', getExamResults);
router.put('/online-exams/:id/evaluate', evaluateDescriptive);

module.exports = router;
