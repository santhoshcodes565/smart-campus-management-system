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

// Academic Management Controller
const {
    // Departments
    createDepartment,
    getAllDepartments,
    getDepartment,
    updateDepartment,
    deleteDepartment,
    deactivateDepartment,
    activateDepartment,
    toggleDepartmentStatus,
    // Courses
    createCourse,
    getAllCourses,
    getCourse,
    updateCourse,
    deleteCourse,
    toggleCourseStatus,
    // Subjects
    createSubject,
    getAllSubjects,
    getSubject,
    updateSubject,
    deleteSubject,
    toggleSubjectStatus,
    assignFacultyToSubject
} = require('../controllers/academicController');

const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All routes require admin authentication
router.use(protect);
router.use(authorize('admin'));

// ==================== ACADEMIC MASTER MANAGEMENT ====================

// Department management
router.route('/departments')
    .post(createDepartment)
    .get(getAllDepartments);
router.route('/departments/:id')
    .get(getDepartment)
    .put(updateDepartment)
    .delete(deleteDepartment);
router.put('/departments/:id/toggle-status', toggleDepartmentStatus);
router.put('/departments/:id/deactivate', deactivateDepartment);
router.put('/departments/:id/activate', activateDepartment);

// Course management
router.route('/courses')
    .post(createCourse)
    .get(getAllCourses);
router.route('/courses/:id')
    .get(getCourse)
    .put(updateCourse)
    .delete(deleteCourse);
router.put('/courses/:id/toggle-status', toggleCourseStatus);

// Subject management
router.route('/subjects')
    .post(createSubject)
    .get(getAllSubjects);
router.route('/subjects/:id')
    .get(getSubject)
    .put(updateSubject)
    .delete(deleteSubject);
router.put('/subjects/:id/toggle-status', toggleSubjectStatus);
router.put('/subjects/:id/assign-faculty', assignFacultyToSubject);

// ==================== EXISTING MANAGEMENT ====================

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

// ==================== MODULE 7: EXAM MANAGEMENT ====================

const {
    createExam,
    getAllExams,
    updateExam,
    deleteExam,
    publishResults
} = require('../controllers/examController');

router.route('/exams')
    .post(createExam)
    .get(getAllExams);
router.route('/exams/:id')
    .put(updateExam)
    .delete(deleteExam);
router.put('/exams/:id/publish', publishResults);

// ==================== MODULE 8: REQUEST MANAGEMENT ====================

const {
    getAllRequests,
    approveRequest,
    rejectRequest
} = require('../controllers/requestController');

router.get('/requests', getAllRequests);
router.put('/requests/:id/approve', approveRequest);
router.put('/requests/:id/reject', rejectRequest);

// ==================== ONLINE EXAM SYSTEM ====================

const {
    getAllExams: getAllOnlineExams,
    getAdminExamResults,
    getExamAnalytics
} = require('../controllers/onlineExamController');

router.get('/online-exams', getAllOnlineExams);
router.get('/online-exams/analytics', getExamAnalytics);
router.get('/online-exams/:id/results', getAdminExamResults);

module.exports = router;

