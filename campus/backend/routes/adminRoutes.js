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
    // Timetable (Enhanced)
    manageTimetable,
    getAllTimetables,
    createTimetable,
    updateTimetable,
    deleteTimetable,
    publishTimetable,
    publishClassTimetables,
    lockTimetable,
    lockClassTimetables,
    validateTimetableConflicts,
    // Transport
    createTransport,
    getAllTransport,
    updateTransport,
    deleteTransport,
    // Fees
    createFee,
    getAllFees,
    updateFee,
    // Reports
    getReports,
    // DOB Management
    updateDateOfBirth
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

// User management (password reset & DOB)
router.put('/users/:id/reset-password', resetPassword);
router.put('/users/:id/dob', updateDateOfBirth);

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

// Timetable management (Enhanced with lifecycle)
router.route('/timetable')
    .post(manageTimetable)
    .get(getAllTimetables);
// IMPORTANT: Static routes MUST come BEFORE parameterized routes
// Otherwise /timetable/publish-class matches /timetable/:id/publish with id="publish-class"
router.put('/timetable/publish-class', publishClassTimetables);
router.put('/timetable/lock-class', lockClassTimetables);
router.post('/timetable/validate', validateTimetableConflicts);
// Parameterized routes come AFTER static routes
router.route('/timetable/:id')
    .put(updateTimetable)
    .delete(deleteTimetable);
router.put('/timetable/:id/publish', publishTimetable);
router.put('/timetable/:id/lock', lockTimetable);

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

// Notice management (using dedicated notice controller)
const {
    adminCreateNotice,
    adminGetNotices,
    adminDeleteNotice,
    adminUpdateNotice
} = require('../controllers/noticeController');

router.route('/notices')
    .post(adminCreateNotice)
    .get(adminGetNotices);
router.route('/notices/:id')
    .put(adminUpdateNotice)
    .delete(adminDeleteNotice);

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

// ==================== LEAVE MANAGEMENT ====================
const leaveController = require('../controllers/leaveController');

router.get('/leave/faculty', leaveController.getFacultyLeavesForAdmin);
router.put('/leave/:id/approve', leaveController.approveFacultyLeave);
router.put('/leave/:id/reject', leaveController.rejectFacultyLeave);
router.get('/leave/stats', leaveController.getAdminLeaveStats);
router.get('/leave/analytics', leaveController.getLeaveAnalytics);

// Student Leave Management (Admin)
router.get('/leave/students', leaveController.getStudentLeavesForAdmin);
router.put('/leave/students/:id/approve', leaveController.approveStudentLeaveByAdmin);
router.put('/leave/students/:id/reject', leaveController.rejectStudentLeaveByAdmin);

// ==================== ONLINE EXAM SYSTEM ====================

const {
    getAllExams: getAllOnlineExams,
    getAdminExamResults,
    getExamAnalytics
} = require('../controllers/onlineExamController');

router.get('/online-exams', getAllOnlineExams);
router.get('/online-exams/analytics', getExamAnalytics);
router.get('/online-exams/:id/results', getAdminExamResults);

// ==================== FEEDBACK SYSTEM ====================

const {
    getAllFeedback,
    markAsViewed,
    markAsResolved
} = require('../controllers/feedbackController');

router.get('/feedback', getAllFeedback);
router.put('/feedback/:id/view', markAsViewed);
router.put('/feedback/:id/resolve', markAsResolved);

// ==================== FEEDBACK V2 - Thread-based System ====================
const feedbackV2 = require('../controllers/feedbackV2Controller');

router.get('/feedback/threads', feedbackV2.getAllThreads);
router.get('/feedback/threads/:id', feedbackV2.getThreadById);
router.post('/feedback/threads', feedbackV2.adminCreateThread);
router.post('/feedback/threads/:id/reply', feedbackV2.replyToThread);
router.put('/feedback/threads/:id/status', feedbackV2.updateThreadStatus);
router.put('/feedback/threads/:id/priority', feedbackV2.updateThreadPriority);
router.delete('/feedback/threads/:id', feedbackV2.softDeleteThread);
router.post('/feedback/migrate-v1', feedbackV2.migrateV1ToV2);

// ==================== EXAM ANALYTICS V2 ====================
const examAnalyticsV2 = require('../controllers/examAnalyticsV2Controller');

router.get('/exam-analytics/v2/filters', examAnalyticsV2.getFilterOptions);
router.get('/exam-analytics/v2/kpis', examAnalyticsV2.getDashboardKPIs);
router.get('/exam-analytics/v2/exams', examAnalyticsV2.getExamTableData);
router.get('/exam-analytics/v2/exam/:id', examAnalyticsV2.getExamDrillDown);
router.get('/exam-analytics/v2/departments', examAnalyticsV2.getDepartmentComparison);
router.get('/exam-analytics/v2/semesters', examAnalyticsV2.getSemesterTrend);
router.get('/exam-analytics/v2/faculty', examAnalyticsV2.getFacultyPerformance);
router.get('/exam-analytics/v2/risk-students', examAnalyticsV2.getStudentRiskAnalysis);

// ==================== ADMIN SETTINGS V2 ====================
const adminSettings = require('../controllers/adminSettingsController');

// Profile routes
router.get('/profile', adminSettings.getProfile);
router.put('/profile', adminSettings.updateProfile);
router.put('/profile/password', adminSettings.changePassword);

// Security routes
router.get('/settings/security/users', adminSettings.getUsers);
router.post('/settings/security/force-reset', adminSettings.forcePasswordReset);
router.put('/settings/security/lock-user/:id', adminSettings.lockUnlockUser);
router.get('/settings/security/login-history', adminSettings.getLoginHistory);

// System configuration routes
router.get('/settings/system', adminSettings.getSystemSettings);
router.put('/settings/system', adminSettings.updateSystemSettings);

// Academic rules routes
router.get('/settings/academic', adminSettings.getAcademicRules);
router.put('/settings/academic', adminSettings.updateAcademicRules);

// User policies routes
router.get('/settings/policies', adminSettings.getUserPolicies);
router.put('/settings/policies', adminSettings.updateUserPolicies);

// Access control routes
router.get('/settings/access', adminSettings.getAccessControl);

// Audit logs routes
router.get('/settings/audit', adminSettings.getAuditLogs);

// Data export routes
router.get('/settings/export/:type', adminSettings.exportData);

// ==================== ATTENDANCE V2 ====================
const attendanceV2 = require('../controllers/attendanceV2Controller');

router.get('/attendance/v2/dashboard', attendanceV2.getAttendanceDashboard);
router.get('/attendance/v2/analytics', attendanceV2.getDepartmentAnalytics);
router.get('/attendance/v2/low-attendance', attendanceV2.getLowAttendanceStudents);
router.get('/attendance/v2/export', attendanceV2.exportAttendanceReport);

// ==================== FACULTY ATTENDANCE SYSTEM ====================
const facultyAttendance = require('../controllers/facultyAttendanceController');

router.get('/faculty-attendance/today', facultyAttendance.getTodayAttendance);
router.get('/faculty-attendance/analytics', facultyAttendance.getAttendanceAnalytics);
router.get('/faculty-attendance/faculty/:facultyId', facultyAttendance.getFacultyAttendance);
router.put('/faculty-attendance/:id/note', facultyAttendance.updateNote);
router.post('/faculty-attendance/process-eod', facultyAttendance.processEndOfDay);

// ==================== ACADEMIC ANALYTICS ENGINE ====================
const academicAnalytics = require('../controllers/academicAnalyticsController');

router.get('/academic-analytics/overview', academicAnalytics.getOverviewKPIs);
router.get('/academic-analytics/department/:id', academicAnalytics.getDepartmentAnalytics);
router.get('/academic-analytics/semester-trend', academicAnalytics.getSemesterTrend);
router.get('/academic-analytics/toppers', academicAnalytics.getToppers);
router.get('/academic-analytics/at-risk-students', academicAnalytics.getAtRiskStudents);
router.get('/academic-analytics/failed-subjects', academicAnalytics.getTopFailedSubjects);
router.get('/academic-analytics/placement-eligibility', academicAnalytics.getPlacementEligibleStudents);
router.post('/academic-analytics/generate', academicAnalytics.triggerAnalyticsGeneration);

// ==================== MARK MANAGEMENT (Admin Authority) ====================
const markController = require('../controllers/markController');
const { canApprove, canReject, canPublish, canLock, canOverride } = require('../middleware/resultPermissions');

// View pending approvals
router.get('/marks/pending', markController.getPendingApprovals);

// Admin mark correction
router.patch('/marks/:resultId', markController.adminEditMark);

// Approval workflow
router.post('/marks/approve/:examId', canApprove, markController.approveResults);
router.post('/marks/reject/:examId', canReject, markController.rejectResults);

// Publication and locking
router.post('/marks/publish/:examId', canPublish, markController.publishResults);
router.post('/marks/lock/:examId', canLock, markController.lockResults);

// Admin override (locked results only)
router.post('/marks/override/:resultId', canOverride, markController.overrideResult);

// Audit trail
router.get('/marks/audit/:resultId', markController.getAuditHistory);

module.exports = router;

