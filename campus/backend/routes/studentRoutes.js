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
    getLeaveRequests
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

module.exports = router;
