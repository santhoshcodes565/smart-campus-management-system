import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { SocketProvider } from './context/SocketContext';

// Layouts
import DashboardLayout from './components/layout/DashboardLayout';
import PublicLayout from './components/layout/PublicLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Public Pages
import Home from './pages/public/Home';
import Features from './pages/public/Features';
import About from './pages/public/About';
import Contact from './pages/public/Contact';
// SignUp removed - admin-only user creation

// Auth Pages
import LoginForm from './components/auth/LoginForm';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageStudents from './pages/admin/ManageStudents';
import ManageFaculty from './pages/admin/ManageFaculty';
import ManageTimetable from './pages/admin/ManageTimetable';
import ManageFees from './pages/admin/ManageFees';
import ManageTransport from './pages/admin/ManageTransport';
import ManageNotices from './pages/admin/ManageNotices';
import Reports from './pages/admin/Reports';

// Faculty Pages
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import MarkAttendance from './pages/faculty/MarkAttendance';
import UploadMarks from './pages/faculty/UploadMarks';
import StudentList from './pages/faculty/StudentList';
import FacultyTimetable from './pages/faculty/FacultyTimetable';
import LeaveRequests from './pages/faculty/LeaveRequests';
import PostNotice from './pages/faculty/PostNotice';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import ViewAttendance from './pages/student/ViewAttendance';
import ViewMarks from './pages/student/ViewMarks';
import StudentTimetable from './pages/student/StudentTimetable';
import FeeDetails from './pages/student/FeeDetails';
import TransportDetails from './pages/student/TransportDetails';
import ApplyLeave from './pages/student/ApplyLeave';

// Placeholder component for pages not yet created
const ComingSoon = ({ title }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
    <div className="text-6xl mb-4">🚧</div>
    <h1 className="text-2xl font-bold text-secondary-800 mb-2">{title}</h1>
    <p className="text-secondary-500">This page is under construction. Check back soon!</p>
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppProvider>
          <SocketProvider>
            <Routes>
              {/* Public Routes with PublicLayout */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/features" element={<Features />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                {/* Signup disabled - redirect to login */}
                <Route path="/signup" element={<Navigate to="/login" replace />} />
              </Route>

              {/* Login Page (no layout wrapper) */}
              <Route path="/login" element={<LoginForm />} />

              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="students" element={<ManageStudents />} />
                <Route path="faculty" element={<ManageFaculty />} />
                <Route path="timetable" element={<ManageTimetable />} />
                <Route path="fees" element={<ManageFees />} />
                <Route path="transport" element={<ManageTransport />} />
                <Route path="notices" element={<ManageNotices />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<ComingSoon title="Settings" />} />
              </Route>

              {/* Faculty Routes */}
              <Route
                path="/faculty"
                element={
                  <ProtectedRoute allowedRoles={['faculty']}>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<FacultyDashboard />} />
                <Route path="attendance" element={<MarkAttendance />} />
                <Route path="marks" element={<UploadMarks />} />
                <Route path="students" element={<StudentList />} />
                <Route path="timetable" element={<FacultyTimetable />} />
                <Route path="leaves" element={<LeaveRequests />} />
                <Route path="notices" element={<PostNotice />} />
              </Route>

              {/* Student Routes */}
              <Route
                path="/student"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<StudentDashboard />} />
                <Route path="attendance" element={<ViewAttendance />} />
                <Route path="marks" element={<ViewMarks />} />
                <Route path="timetable" element={<StudentTimetable />} />
                <Route path="fees" element={<FeeDetails />} />
                <Route path="transport" element={<TransportDetails />} />
                <Route path="leave" element={<ApplyLeave />} />
              </Route>

              {/* Catch all - redirect to home instead of login */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Toast Container */}
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />
          </SocketProvider>
        </AppProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;