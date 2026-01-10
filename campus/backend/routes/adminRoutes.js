const express = require('express');
const router = express.Router();
const {
    // Student management
    createStudent,
    getAllStudents,
    updateStudent,
    deleteStudent,
    resetPassword,
    // Faculty management
    createFaculty,
    getAllFaculty,
    updateFaculty,
    deleteFaculty,
    // Timetable
    manageTimetable,
    getAllTimetables,
    // Transport
    createTransport,
    getAllTransport,
    updateTransport,
    deleteTransport,
    // Fees
    createFee,
    getAllFees,
    updateFee,
    // Notices
    postNotice,
    getAllNotices,
    deleteNotice,
    // Reports
    getReports
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All routes require admin authentication
router.use(protect);
router.use(authorize('admin'));

// User password reset
router.put('/users/:id/reset-password', resetPassword);

// Student management
router.route('/students')
    .post(createStudent)
    .get(getAllStudents);
router.route('/students/:id')
    .put(updateStudent)
    .delete(deleteStudent);

// Faculty management
router.route('/faculty')
    .post(createFaculty)
    .get(getAllFaculty);
router.route('/faculty/:id')
    .put(updateFaculty)
    .delete(deleteFaculty);

// Timetable management
router.route('/timetable')
    .post(manageTimetable)
    .get(getAllTimetables);

// Transport management
router.route('/transport')
    .post(createTransport)
    .get(getAllTransport);
router.route('/transport/:id')
    .put(updateTransport)
    .delete(deleteTransport);

// Fee management
router.route('/fees')
    .post(createFee)
    .get(getAllFees);
router.put('/fees/:id', updateFee);

// Notice management
router.route('/notices')
    .post(postNotice)
    .get(getAllNotices);
router.delete('/notices/:id', deleteNotice);

// Reports & Analytics
router.get('/dashboard', getReports);
router.get('/reports', getReports);

module.exports = router;
