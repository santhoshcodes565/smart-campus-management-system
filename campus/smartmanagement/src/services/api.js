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
    (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const message = error.response?.data?.error || error.message || 'Something went wrong';

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

        return Promise.reject(error);
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
    getNotices: () => api.get('/student/notices'),
    applyLeave: (data) => api.post('/student/leave', data),
    getLeaves: () => api.get('/student/leaves'),
    getDashboard: () => api.get('/student/dashboard'),
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
    postNotice: (data) => api.post('/faculty/notices', data),
    getNotices: () => api.get('/faculty/notices'),
};

// Admin API
export const adminAPI = {
    getDashboard: () => api.get('/admin/dashboard'),

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

    // Timetable
    getTimetables: () => api.get('/admin/timetables'),
    createTimetable: (data) => api.post('/admin/timetables', data),
    updateTimetable: (id, data) => api.put(`/admin/timetables/${id}`, data),
    deleteTimetable: (id) => api.delete(`/admin/timetables/${id}`),

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

    // Notices
    getNotices: () => api.get('/admin/notices'),
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
};

export default api;
