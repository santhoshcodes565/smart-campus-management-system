import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        // Always reject with a proper Error instance, never raw objects
        const message = error?.message || 'Request configuration error';
        return Promise.reject(new Error(message));
    }
);

// Response interceptor - handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Extract error message safely - NEVER throw raw objects
        let message = 'Something went wrong';

        if (error.response?.data?.error) {
            // Handle case where error might be an object
            const errorData = error.response.data.error;
            message = typeof errorData === 'string'
                ? errorData
                : (errorData?.message || JSON.stringify(errorData));
        } else if (error.response?.data?.message) {
            message = error.response.data.message;
        } else if (error.message) {
            message = error.message;
        } else if (typeof error === 'string') {
            message = error;
        }

        // Handle network errors (no response received)
        if (!error.response && error.request) {
            message = 'Network error. Please check your connection.';
        }

        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            toast.error('Session expired. Please login again.');
        } else if (error.response?.status === 403) {
            toast.error('You do not have permission to perform this action');
        } else if (error.response?.status >= 500) {
            toast.error('Server error. Please try again later.');
        }

        // Create a proper Error instance - NEVER reject with raw objects
        const enhancedError = new Error(message);
        enhancedError.status = error.response?.status;
        enhancedError.originalError = error;
        return Promise.reject(enhancedError);
    }
);

// Auth API
export const authAPI = {
    login: (credentials) => api.post('/auth/login', credentials),
    logout: () => api.post('/auth/logout'),
    getMe: () => api.get('/auth/me'),
};

// Student API
export const studentAPI = {
    getProfile: () => api.get('/student/profile'),
    getAttendance: () => api.get('/student/attendance'),
    getMarks: () => api.get('/student/marks'),
    getTimetable: () => api.get('/student/timetable'),
    getFees: () => api.get('/student/fees'),
    getTransport: () => api.get('/student/transport'),
    applyLeave: (data) => api.post('/student/leave', data),
    getLeaves: () => api.get('/student/leave'),
    getLeaveStats: () => api.get('/student/leave/stats'),
    getDashboard: () => api.get('/student/dashboard'),

    // Notice System - Read Only
    getNotices: (params) => api.get('/student/notices', { params }),
    markNoticeAsRead: (id) => api.put(`/student/notices/${id}/read`),

    // Online Exam System
    getOnlineExams: () => api.get('/student/online-exams'),
    getExamForAttempt: (examId) => api.get(`/student/online-exams/${examId}`),
    startExam: (examId) => api.post(`/student/online-exams/${examId}/start`),
    saveExamAnswers: (examId, data) => api.put(`/student/online-exams/${examId}/save`, data),
    submitExam: (examId, data) => api.post(`/student/online-exams/${examId}/submit`, data),
    getOnlineExamResults: () => api.get('/student/online-exams/results'),

    // Feedback System (V1 - Legacy)
    submitFeedback: (data) => api.post('/student/feedback', data),
    getMyFeedback: () => api.get('/student/feedback/my'),
    getFacultyList: () => api.get('/student/feedback/faculty-list'),

    // Feedback V2 - Thread-based System
    feedbackV2: {
        getThreads: (params) => api.get('/student/feedback/threads', { params }),
        getThread: (id) => api.get(`/student/feedback/threads/${id}`),
        createThread: (data) => api.post('/student/feedback/threads', data),
        replyToThread: (id, data) => api.post(`/student/feedback/threads/${id}/reply`, data),
        getFacultyList: () => api.get('/student/feedback/v2/faculty-list'),
    },
};

// Faculty API
export const facultyAPI = {
    getProfile: () => api.get('/faculty/profile'),
    getDashboard: () => api.get('/faculty/dashboard'),
    getClasses: () => api.get('/faculty/classes'),
    getStudents: (classId) => api.get(`/faculty/students/${classId}`),
    getAllStudents: () => api.get('/faculty/students'),
    markAttendance: (data) => api.post('/faculty/attendance', data),
    getAttendanceByClass: (classId, date) => api.get(`/faculty/attendance/${classId}?date=${date}`),
    uploadMarks: (data) => api.post('/faculty/marks', data),
    getMarks: (classId, subject) => api.get(`/faculty/marks/${classId}?subject=${subject}`),
    getTimetable: () => api.get('/faculty/timetable'),
    getLeaveRequests: () => api.get('/faculty/leave-requests'),
    updateLeaveStatus: (id, status) => api.put(`/faculty/leave-requests/${id}`, { status }),

    // Notice System - Can only target students
    getNotices: (params) => api.get('/faculty/notices', { params }),
    postNotice: (data) => api.post('/faculty/notices', data),
    deleteNotice: (id) => api.delete(`/faculty/notices/${id}`),

    // Online Exam System
    getOnlineExams: () => api.get('/faculty/online-exams'),
    createOnlineExam: (data) => api.post('/faculty/online-exams', data),
    updateOnlineExam: (id, data) => api.put(`/faculty/online-exams/${id}`, data),
    deleteOnlineExam: (id) => api.delete(`/faculty/online-exams/${id}`),
    publishOnlineExam: (id) => api.put(`/faculty/online-exams/${id}/publish`),
    getExamQuestions: (examId) => api.get(`/faculty/online-exams/${examId}/questions`),
    addExamQuestion: (examId, data) => api.post(`/faculty/online-exams/${examId}/questions`, data),
    updateExamQuestion: (examId, questionId, data) => api.put(`/faculty/online-exams/${examId}/questions/${questionId}`, data),
    deleteExamQuestion: (examId, questionId) => api.delete(`/faculty/online-exams/${examId}/questions/${questionId}`),
    getExamResults: (examId) => api.get(`/faculty/online-exams/${examId}/results`),
    evaluateExam: (examId, data) => api.put(`/faculty/online-exams/${examId}/evaluate`, data),

    // Feedback System (V1 - Legacy)
    submitFeedback: (data) => api.post('/faculty/feedback', data),
    getMyFeedback: () => api.get('/faculty/feedback/my'),
    markFeedbackViewed: (id) => api.put(`/faculty/feedback/${id}/view`),

    // Feedback V2 - Thread-based System
    feedbackV2: {
        getThreads: (params) => api.get('/faculty/feedback/threads', { params }),
        getThread: (id) => api.get(`/faculty/feedback/threads/${id}`),
        createThread: (data) => api.post('/faculty/feedback/threads', data),
        replyToThread: (id, data) => api.post(`/faculty/feedback/threads/${id}/reply`, data),
    },

    // Read-only access to academic data (for dropdowns)
    getSubjects: () => api.get('/faculty/subjects'),
    getCourses: () => api.get('/faculty/courses'),
    getDepartments: () => api.get('/faculty/departments'),

    // Leave Management (NEW)
    applyLeave: (data) => api.post('/faculty/leave/apply', data),
    getMyLeaves: () => api.get('/faculty/leave/my'),
    getLeaveStats: () => api.get('/faculty/leave/stats'),
    approveStudentLeave: (id, data) => api.put(`/faculty/leave/${id}/approve`, data),
    rejectStudentLeave: (id, data) => api.put(`/faculty/leave/${id}/reject`, data),

    // Faculty Self Attendance (Check-in/Check-out)
    facultyAttendance: {
        checkIn: (note) => api.post('/faculty/attendance/check-in', { note }),
        checkOut: (note) => api.post('/faculty/attendance/check-out', { note }),
        getStatus: () => api.get('/faculty/attendance/status'),
        getSummary: (params) => api.get('/faculty/attendance/summary', { params }),
        getHistory: (params) => api.get('/faculty/attendance/history', { params }),
    },
};

// Admin API
export const adminAPI = {
    getDashboard: () => api.get('/admin/dashboard'),

    // ==================== ACADEMIC MASTER MANAGEMENT ====================

    // Departments
    getDepartments: (params) => api.get('/admin/departments', { params }),
    getDepartment: (id) => api.get(`/admin/departments/${id}`),
    createDepartment: (data) => api.post('/admin/departments', data),
    updateDepartment: (id, data) => api.put(`/admin/departments/${id}`, data),
    deleteDepartment: (id) => api.delete(`/admin/departments/${id}`),
    toggleDepartmentStatus: (id) => api.put(`/admin/departments/${id}/toggle-status`),
    deactivateDepartment: (id) => api.put(`/admin/departments/${id}/deactivate`),
    activateDepartment: (id) => api.put(`/admin/departments/${id}/activate`),

    // Courses
    getCourses: (params) => api.get('/admin/courses', { params }),
    getCourse: (id) => api.get(`/admin/courses/${id}`),
    createCourse: (data) => api.post('/admin/courses', data),
    updateCourse: (id, data) => api.put(`/admin/courses/${id}`, data),
    deleteCourse: (id) => api.delete(`/admin/courses/${id}`),
    toggleCourseStatus: (id) => api.put(`/admin/courses/${id}/toggle-status`),

    // Subjects
    getSubjects: (params) => api.get('/admin/subjects', { params }),
    getSubject: (id) => api.get(`/admin/subjects/${id}`),
    createSubject: (data) => api.post('/admin/subjects', data),
    updateSubject: (id, data) => api.put(`/admin/subjects/${id}`, data),
    deleteSubject: (id) => api.delete(`/admin/subjects/${id}`),
    toggleSubjectStatus: (id) => api.put(`/admin/subjects/${id}/toggle-status`),
    assignFacultyToSubject: (id, facultyId) => api.put(`/admin/subjects/${id}/assign-faculty`, { facultyId }),

    // ==================== EXISTING MANAGEMENT ====================

    // Students
    getStudents: () => api.get('/admin/students'),
    getStudent: (id) => api.get(`/admin/students/${id}`),
    createStudent: (data) => api.post('/admin/students', data),
    updateStudent: (id, data) => api.put(`/admin/students/${id}`, data),
    deleteStudent: (id) => api.delete(`/admin/students/${id}`),
    toggleStudentStatus: (id) => api.put(`/admin/students/${id}/toggle-status`),
    resetPassword: (userId, newPassword) => api.put(`/admin/users/${userId}/reset-password`, { newPassword }),

    // Faculty
    getFaculty: () => api.get('/admin/faculty'),
    getFacultyMember: (id) => api.get(`/admin/faculty/${id}`),
    createFaculty: (data) => api.post('/admin/faculty', data),
    updateFaculty: (id, data) => api.put(`/admin/faculty/${id}`, data),
    deleteFaculty: (id) => api.delete(`/admin/faculty/${id}`),

    // Timetable (Enhanced with lifecycle)
    getTimetables: (params) => api.get('/admin/timetable', { params }),
    createTimetable: (data) => api.post('/admin/timetable', data),
    updateTimetable: (id, data) => api.put(`/admin/timetable/${id}`, data),
    deleteTimetable: (id) => api.delete(`/admin/timetable/${id}`),
    publishTimetable: (id) => api.put(`/admin/timetable/${id}/publish`),
    lockTimetable: (id) => api.put(`/admin/timetable/${id}/lock`),
    validateTimetableConflicts: (data) => api.post('/admin/timetable/validate', data),

    // Fees
    getFees: () => api.get('/admin/fees'),
    createFee: (data) => api.post('/admin/fees', data),
    updateFee: (id, data) => api.put(`/admin/fees/${id}`, data),
    deleteFee: (id) => api.delete(`/admin/fees/${id}`),
    getFeeReports: () => api.get('/admin/fees/reports'),

    // Transport
    getTransportRoutes: () => api.get('/admin/transport'),
    createTransportRoute: (data) => api.post('/admin/transport', data),
    updateTransportRoute: (id, data) => api.put(`/admin/transport/${id}`, data),
    deleteTransportRoute: (id) => api.delete(`/admin/transport/${id}`),
    assignStudentToRoute: (data) => api.post('/admin/transport/assign', data),

    // Notices - Full CRUD
    getNotices: (params) => api.get('/admin/notices', { params }),
    createNotice: (data) => api.post('/admin/notices', data),
    updateNotice: (id, data) => api.put(`/admin/notices/${id}`, data),
    deleteNotice: (id) => api.delete(`/admin/notices/${id}`),

    // Reports
    getAttendanceReport: (filters) => api.get('/admin/reports/attendance', { params: filters }),
    getFeeReport: (filters) => api.get('/admin/reports/fees', { params: filters }),
    getPerformanceReport: (filters) => api.get('/admin/reports/performance', { params: filters }),

    // Settings
    getSettings: () => api.get('/admin/settings'),
    updateSettings: (data) => api.put('/admin/settings', data),

    // Feedback System (V1 - Legacy)
    getAllFeedback: (params) => api.get('/admin/feedback', { params }),
    markFeedbackViewed: (id) => api.put(`/admin/feedback/${id}/view`),
    markFeedbackResolved: (id) => api.put(`/admin/feedback/${id}/resolve`),

    // Feedback V2 - Thread-based System
    feedbackV2: {
        getThreads: (params) => api.get('/admin/feedback/threads', { params }),
        getThread: (id) => api.get(`/admin/feedback/threads/${id}`),
        createThread: (data) => api.post('/admin/feedback/threads', data),
        replyToThread: (id, data) => api.post(`/admin/feedback/threads/${id}/reply`, data),
        updateStatus: (id, status) => api.put(`/admin/feedback/threads/${id}/status`, { status }),
        updatePriority: (id, priority) => api.put(`/admin/feedback/threads/${id}/priority`, { priority }),
        softDelete: (id) => api.delete(`/admin/feedback/threads/${id}`),
        migrateV1: () => api.post('/admin/feedback/migrate-v1'),
    },

    // Exam Analytics V2 - Advanced Analytics
    examAnalyticsV2: {
        getFilterOptions: () => api.get('/admin/exam-analytics/v2/filters'),
        getKPIs: (params) => api.get('/admin/exam-analytics/v2/kpis', { params }),
        getExams: (params) => api.get('/admin/exam-analytics/v2/exams', { params }),
        getExamDrillDown: (id) => api.get(`/admin/exam-analytics/v2/exam/${id}`),
        getDepartments: (params) => api.get('/admin/exam-analytics/v2/departments', { params }),
        getSemesters: (params) => api.get('/admin/exam-analytics/v2/semesters', { params }),
        getFaculty: (params) => api.get('/admin/exam-analytics/v2/faculty', { params }),
        getRiskStudents: (params) => api.get('/admin/exam-analytics/v2/risk-students', { params }),
    },

    // Admin Settings V2 - System Control Center
    adminSettings: {
        // Profile
        getProfile: () => api.get('/admin/profile'),
        updateProfile: (data) => api.put('/admin/profile', data),
        changePassword: (data) => api.put('/admin/profile/password', data),

        // Security
        getUsers: (params) => api.get('/admin/settings/security/users', { params }),
        forcePasswordReset: (data) => api.post('/admin/settings/security/force-reset', data),
        lockUnlockUser: (id, lock) => api.put(`/admin/settings/security/lock-user/${id}`, { lock }),
        getLoginHistory: (params) => api.get('/admin/settings/security/login-history', { params }),

        // System
        getSystemSettings: () => api.get('/admin/settings/system'),
        updateSystemSettings: (data) => api.put('/admin/settings/system', data),

        // Academic
        getAcademicRules: () => api.get('/admin/settings/academic'),
        updateAcademicRules: (data) => api.put('/admin/settings/academic', data),

        // Policies
        getUserPolicies: () => api.get('/admin/settings/policies'),
        updateUserPolicies: (data) => api.put('/admin/settings/policies', data),

        // Access
        getAccessControl: () => api.get('/admin/settings/access'),

        // Audit
        getAuditLogs: (params) => api.get('/admin/settings/audit', { params }),

        // Export
        exportData: (type) => api.get(`/admin/settings/export/${type}`),
    },

    // Attendance V2 - All roles
    attendanceV2: {
        // Faculty
        getAssignedSubjects: () => api.get('/faculty/attendance/v2/subjects'),
        getStudentsForAttendance: (params) => api.get('/faculty/attendance/v2/students', { params }),
        markAttendance: (data) => api.post('/faculty/attendance/v2/mark', data),
        getAttendanceHistory: (params) => api.get('/faculty/attendance/v2/history', { params }),

        // Student
        getMyAttendance: () => api.get('/student/attendance/v2'),
        getMyAttendanceSummary: () => api.get('/student/attendance/v2/summary'),
        checkEligibility: () => api.get('/student/attendance/v2/eligibility'),

        // Admin
        getDashboard: (params) => api.get('/admin/attendance/v2/dashboard', { params }),
        getAnalytics: (params) => api.get('/admin/attendance/v2/analytics', { params }),
        getLowAttendance: (params) => api.get('/admin/attendance/v2/low-attendance', { params }),
        exportReport: (params) => api.get('/admin/attendance/v2/export', { params }),
    },

    // Leave Management (NEW)
    getFacultyLeaves: (params) => api.get('/admin/leave/faculty', { params }),
    approveFacultyLeave: (id, data) => api.put(`/admin/leave/${id}/approve`, data),
    rejectFacultyLeave: (id, data) => api.put(`/admin/leave/${id}/reject`, data),
    getLeaveStats: () => api.get('/admin/leave/stats'),
    getLeaveAnalytics: () => api.get('/admin/leave/analytics'),

    // DOB Management
    updateUserDOB: (userId, dateOfBirth) => api.put(`/admin/users/${userId}/dob`, { dateOfBirth }),

    // Faculty Attendance Management (Admin)
    facultyAttendance: {
        getToday: () => api.get('/admin/faculty-attendance/today'),
        getAnalytics: (params) => api.get('/admin/faculty-attendance/analytics', { params }),
        getFacultyRecords: (facultyId, params) => api.get(`/admin/faculty-attendance/faculty/${facultyId}`, { params }),
        updateNote: (id, note) => api.put(`/admin/faculty-attendance/${id}/note`, { note }),
        processEndOfDay: () => api.post('/admin/faculty-attendance/process-eod'),
    },
};

// Birthday Intelligence API
export const birthdayAPI = {
    // Get all users with birthday today
    getTodaysBirthdays: () => api.get('/birthdays/today'),
    // Check if current user's birthday is today
    checkMyBirthday: () => api.get('/birthdays/me'),
    // Get birthday statistics (admin only)
    getStats: () => api.get('/birthdays/stats'),
    // Get users missing DOB (admin only, for migration)
    getUsersMissingDOB: () => api.get('/birthdays/missing-dob'),
};

// ==================== FEE MANAGEMENT API ====================
export const feeAPI = {
    // Admin - Fee Structures
    structures: {
        getAll: (params) => api.get('/fees/structures', { params }),
        get: (id) => api.get(`/fees/structures/${id}`),
        create: (data) => api.post('/fees/structures', data),
        update: (id, data) => api.put(`/fees/structures/${id}`, data),
        approve: (id, remarks) => api.put(`/fees/structures/${id}/approve`, { remarks }),
        activate: (id) => api.put(`/fees/structures/${id}/activate`),
        archive: (id) => api.put(`/fees/structures/${id}/archive`),
        createVersion: (id) => api.post(`/fees/structures/${id}/version`),
        getFeeHeads: () => api.get('/fees/structures/fee-heads'),
    },

    // Admin - Student Ledgers
    ledgers: {
        getAll: (params) => api.get('/fees/ledgers', { params }),
        get: (id) => api.get(`/fees/ledgers/${id}`),
        create: (data) => api.post('/fees/ledgers', data),
        bulkAssign: (data) => api.post('/fees/ledgers/bulk-assign', data),
        getByStudent: (studentId, params) => api.get(`/fees/ledgers/student/${studentId}`, { params }),
        close: (id, reason) => api.put(`/fees/ledgers/${id}/close`, { reason }),
        getAcademicYears: () => api.get('/fees/ledgers/academic-years'),
    },

    // Admin - Receipts
    receipts: {
        getAll: (params) => api.get('/fees/receipts', { params }),
        get: (id) => api.get(`/fees/receipts/${id}`),
        create: (data) => api.post('/fees/receipts', data),
        reverse: (id, reason) => api.post(`/fees/receipts/${id}/reverse`, { reason }),
        verify: (id) => api.put(`/fees/receipts/${id}/verify`),
        getByNumber: (receiptNumber) => api.get(`/fees/receipts/number/${receiptNumber}`),
        getByLedger: (ledgerId) => api.get(`/fees/receipts/ledger/${ledgerId}`),
        getToday: () => api.get('/fees/receipts/today'),
    },

    // Admin - Dashboard & Reports
    dashboard: {
        get: (params) => api.get('/fees/dashboard', { params }),
    },
    reports: {
        getSummary: (params) => api.get('/fees/reports/summary', { params }),
        getAging: (params) => api.get('/fees/reports/aging', { params }),
        getCollection: (params) => api.get('/fees/reports/collection', { params }),
        getDefaulters: (params) => api.get('/fees/reports/defaulters', { params }),
        getDepartment: (deptId, params) => api.get(`/fees/reports/department/${deptId}`, { params }),
        getStudentLedger: (studentId, params) => api.get(`/fees/reports/student/${studentId}`, { params }),
        export: (type, params) => api.get(`/fees/reports/export/${type}`, { params }),
        getAudit: (params) => api.get('/fees/reports/audit', { params }),
    },

    // Student - Read Only
    student: {
        getLedger: () => api.get('/fees/student/ledger'),
        getSummary: () => api.get('/fees/student/summary'),
        getReceipts: () => api.get('/fees/student/receipts'),
    },
};

export default api;
