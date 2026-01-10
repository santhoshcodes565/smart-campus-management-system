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
    getTimetable
} = require('../controllers/facultyController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All routes require faculty authentication
router.use(protect);
router.use(authorize('faculty'));

router.get('/profile', getProfile);
router.get('/students', getStudentsList);
router.post('/attendance', markAttendance);
router.post('/marks', uploadMarks);
router.get('/leave', getLeaveRequests);
router.put('/leave/:id', updateLeaveStatus);
router.post('/notices', postNotice);
router.get('/timetable', getTimetable);

module.exports = router;
