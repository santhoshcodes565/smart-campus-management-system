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
import ErrorBoundary from './components/common/ErrorBoundary';

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
// Fee Management V2 (Institutional Fees Accounting)
import AdminFeeDashboard from './pages/admin/fees/AdminFeeDashboard';
import AdminFeeStructures from './pages/admin/fees/AdminFeeStructures';
import AdminFeeLedgers from './pages/admin/fees/AdminFeeLedgers';
import AdminFeeReceipts from './pages/admin/fees/AdminFeeReceipts';
import AdminNotices from './pages/admin/AdminNotices';
import Reports from './pages/admin/Reports';
// Academic Master Management Pages
import ManageDepartments from './pages/admin/ManageDepartments';
import ManageCourses from './pages/admin/ManageCourses';
import ManageSubjects from './pages/admin/ManageSubjects';
// Online Exam Monitoring
import AdminOnlineExams from './pages/admin/AdminOnlineExams';
import AdminExamResults from './pages/admin/AdminExamResults';
import AdminFeedback from './pages/admin/AdminFeedback';
import AdminExamAnalyticsV2 from './pages/admin/AdminExamAnalyticsV2';
// Admin Settings V2
import AdminSettingsLayout from './pages/admin/settings/AdminSettingsLayout';
import AdminProfile from './pages/admin/settings/AdminProfile';
import AdminSecuritySettings from './pages/admin/settings/AdminSecuritySettings';
import AdminSystemSettings from './pages/admin/settings/AdminSystemSettings';
import AdminAcademicRules from './pages/admin/settings/AdminAcademicRules';
import AdminUserPolicies from './pages/admin/settings/AdminUserPolicies';
import AdminAccessControl from './pages/admin/settings/AdminAccessControl';
import AdminAuditLogs from './pages/admin/settings/AdminAuditLogs';
import AdminExportBackup from './pages/admin/settings/AdminExportBackup';

// Faculty Pages
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import MarkAttendance from './pages/faculty/MarkAttendance';
import UploadMarks from './pages/faculty/UploadMarks';
import StudentList from './pages/faculty/StudentList';
import FacultyTimetable from './pages/faculty/FacultyTimetable';
import LeaveRequests from './pages/faculty/LeaveRequests';
import FacultyNotices from './pages/faculty/FacultyNotices';
import FacultyExams from './pages/faculty/FacultyExams';
import ExamQuestions from './pages/faculty/ExamQuestions';
import FacultyExamResults from './pages/faculty/FacultyExamResults';
import FacultyFeedback from './pages/faculty/FacultyFeedback';
import FacultyAttendanceV2 from './pages/faculty/FacultyAttendanceV2';
import FacultyApplyLeave from './pages/faculty/ApplyLeave';
// Faculty Self Attendance
import FacultyAttendanceSummary from './pages/faculty/FacultyAttendanceSummary';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import ViewAttendance from './pages/student/ViewAttendance';
import ViewMarks from './pages/student/ViewMarks';
import StudentTimetable from './pages/student/StudentTimetable';
import FeeDetails from './pages/student/FeeDetails';
import TransportDetails from './pages/student/TransportDetails';
import ApplyLeave from './pages/student/ApplyLeave';
import StudentExams from './pages/student/StudentExams';
import TakeExam from './pages/student/TakeExam';
import StudentResults from './pages/student/StudentResults';
import StudentFeedback from './pages/student/StudentFeedback';
import StudentNotices from './pages/student/StudentNotices';
import StudentAttendanceV2 from './pages/student/StudentAttendanceV2';
// Admin Attendance V2
import AdminAttendanceAnalytics from './pages/admin/AdminAttendanceAnalytics';
// Admin Faculty Attendance
import AdminFacultyAttendance from './pages/admin/AdminFacultyAttendance';
import AdminFacultyAttendanceAnalytics from './pages/admin/AdminFacultyAttendanceAnalytics';
// Admin Leave Management
import ManageLeaves from './pages/admin/ManageLeaves';

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
    <ErrorBoundary>
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
                  {/* Academic Master Management */}
                  <Route path="departments" element={<ManageDepartments />} />
                  <Route path="courses" element={<ManageCourses />} />
                  <Route path="subjects" element={<ManageSubjects />} />
                  {/* User Management */}
                  <Route path="students" element={<ManageStudents />} />
                  <Route path="faculty" element={<ManageFaculty />} />
                  <Route path="timetable" element={<ManageTimetable />} />
                  <Route path="fees" element={<AdminFeeDashboard />} />
                  <Route path="fees/structures" element={<AdminFeeStructures />} />
                  <Route path="fees/ledgers" element={<AdminFeeLedgers />} />
                  <Route path="fees/receipts" element={<AdminFeeReceipts />} />
                  <Route path="transport" element={<ManageTransport />} />
                  <Route path="notices" element={<AdminNotices />} />
                  <Route path="reports" element={<Reports />} />
                  {/* Online Exam Monitoring */}
                  <Route path="online-exams" element={<AdminOnlineExams />} />
                  <Route path="online-exams/:id/results" element={<AdminExamResults />} />
                  {/* Feedback System */}
                  <Route path="feedback" element={<AdminFeedback />} />
                  {/* Exam Analytics V2 */}
                  <Route path="exam-analytics" element={<AdminExamAnalyticsV2 />} />
                  {/* Attendance V2 */}
                  <Route path="attendance-analytics" element={<AdminAttendanceAnalytics />} />
                  {/* Faculty Attendance */}
                  <Route path="faculty-attendance" element={<AdminFacultyAttendance />} />
                  <Route path="faculty-attendance-analytics" element={<AdminFacultyAttendanceAnalytics />} />
                  {/* Leave Management */}
                  <Route path="leaves" element={<ManageLeaves />} />
                  {/* Admin Settings V2 */}
                  <Route path="settings" element={<AdminSettingsLayout />}>
                    <Route index element={<AdminProfile />} />
                    <Route path="profile" element={<AdminProfile />} />
                    <Route path="security" element={<AdminSecuritySettings />} />
                    <Route path="system" element={<AdminSystemSettings />} />
                    <Route path="academic" element={<AdminAcademicRules />} />
                    <Route path="policies" element={<AdminUserPolicies />} />
                    <Route path="access" element={<AdminAccessControl />} />
                    <Route path="audit" element={<AdminAuditLogs />} />
                    <Route path="export" element={<AdminExportBackup />} />
                  </Route>
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
                  <Route path="notices" element={<FacultyNotices />} />
                  {/* Online Exams */}
                  <Route path="online-exams" element={<FacultyExams />} />
                  <Route path="online-exams/:id/questions" element={<ExamQuestions />} />
                  <Route path="online-exams/:id/results" element={<FacultyExamResults />} />
                  {/* Feedback System */}
                  <Route path="feedback" element={<FacultyFeedback />} />
                  {/* Attendance V2 */}
                  <Route path="attendance-v2" element={<FacultyAttendanceV2 />} />
                  {/* Faculty Self Attendance */}
                  <Route path="my-attendance" element={<FacultyAttendanceSummary />} />
                  {/* Leave Management */}
                  <Route path="apply-leave" element={<FacultyApplyLeave />} />
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
                  {/* Online Exams */}
                  <Route path="online-exams" element={<StudentExams />} />
                  <Route path="online-exams/:id" element={<TakeExam />} />
                  <Route path="online-exams/results" element={<StudentResults />} />
                  {/* Feedback System */}
                  <Route path="feedback" element={<StudentFeedback />} />
                  {/* Notice System */}
                  <Route path="notices" element={<StudentNotices />} />
                  {/* Attendance V2 */}
                  <Route path="attendance-v2" element={<StudentAttendanceV2 />} />
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
    </ErrorBoundary>
  );
}

export default App;