import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { studentAPI, facultyAPI, adminAPI } from '../../services/api';
import {
    FiHome, FiUsers, FiCalendar, FiDollarSign, FiTruck, FiBell,
    FiBarChart2, FiSettings, FiBook, FiClipboard, FiFileText,
    FiCheckSquare, FiClock, FiLogOut, FiChevronLeft, FiChevronRight,
    FiEdit3, FiMessageSquare, FiTrendingUp
} from 'react-icons/fi';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const { sidebarCollapsed, toggleSidebarCollapse, sidebarOpen } = useApp();
    const location = useLocation();
    const navigate = useNavigate();

    // Leave badge counts
    const [leaveStats, setLeaveStats] = useState({
        pendingStudentLeaves: 0,
        pendingFacultyLeaves: 0,
        myPending: 0
    });

    // Fetch leave stats on mount and periodically
    useEffect(() => {
        if (user) {
            fetchLeaveStats();
            // Refresh every 60 seconds
            const interval = setInterval(fetchLeaveStats, 60000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const fetchLeaveStats = async () => {
        try {
            if (user?.role === 'student') {
                const response = await studentAPI.getLeaveStats();
                if (response.data.success) {
                    setLeaveStats({ myPending: response.data.data.pending || 0 });
                }
            } else if (user?.role === 'faculty') {
                const response = await facultyAPI.getLeaveStats();
                if (response.data.success) {
                    setLeaveStats({
                        pendingStudentLeaves: response.data.data.pendingStudentLeaves || 0,
                        myPending: response.data.data.myLeaves?.pending || 0
                    });
                }
            } else if (user?.role === 'admin') {
                const response = await adminAPI.getLeaveStats();
                if (response.data.success) {
                    setLeaveStats({
                        pendingFacultyLeaves: response.data.data.pendingFacultyLeaves || 0,
                        pendingStudentLeaves: response.data.data.pendingStudentLeaves || 0
                    });
                }
            }
        } catch (error) {
            console.log('Failed to fetch leave stats');
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getMenuItems = () => {
        switch (user?.role) {
            case 'admin':
                return [
                    { path: '/admin/dashboard', icon: FiHome, label: 'Dashboard' },
                    // Academic Master Management
                    { path: '/admin/departments', icon: FiBook, label: 'Departments' },
                    { path: '/admin/courses', icon: FiFileText, label: 'Courses' },
                    { path: '/admin/subjects', icon: FiClipboard, label: 'Subjects' },
                    // User Management
                    { path: '/admin/students', icon: FiUsers, label: 'Manage Students' },
                    { path: '/admin/faculty', icon: FiUsers, label: 'Manage Faculty' },
                    { path: '/admin/timetable', icon: FiCalendar, label: 'Timetable' },
                    { path: '/admin/fees', icon: FiDollarSign, label: 'Fee Management' },
                    { path: '/admin/transport', icon: FiTruck, label: 'Transport' },
                    { path: '/admin/leaves', icon: FiClock, label: 'Leave Management', badge: leaveStats.pendingFacultyLeaves },
                    { path: '/admin/notices', icon: FiBell, label: 'Notices' },
                    { path: '/admin/feedback', icon: FiMessageSquare, label: 'Feedback' },
                    { path: '/admin/exam-analytics', icon: FiTrendingUp, label: 'Exam Analytics' },
                    { path: '/admin/attendance-analytics', icon: FiCheckSquare, label: 'Student Attendance' },
                    { path: '/admin/faculty-attendance', icon: FiClock, label: 'Faculty Attendance' },
                    { path: '/admin/reports', icon: FiBarChart2, label: 'Reports' },
                    { path: '/admin/settings', icon: FiSettings, label: 'Settings' },
                ];
            case 'faculty':
                return [
                    { path: '/faculty/dashboard', icon: FiHome, label: 'Dashboard' },
                    { path: '/faculty/attendance-v2', icon: FiCheckSquare, label: 'Attendance' },
                    { path: '/faculty/marks', icon: FiClipboard, label: 'Upload Marks' },
                    { path: '/faculty/online-exams', icon: FiEdit3, label: 'Online Exams' },
                    { path: '/faculty/students', icon: FiUsers, label: 'Student List' },
                    { path: '/faculty/timetable', icon: FiCalendar, label: 'Timetable' },
                    { path: '/faculty/my-attendance', icon: FiClock, label: 'My Attendance' },
                    { path: '/faculty/leaves', icon: FiClock, label: 'Leave Requests', badge: leaveStats.pendingStudentLeaves },
                    { path: '/faculty/apply-leave', icon: FiFileText, label: 'Apply Leave', badge: leaveStats.myPending > 0 ? `${leaveStats.myPending} pending` : null },
                    { path: '/faculty/notices', icon: FiBell, label: 'Post Notice' },
                    { path: '/faculty/feedback', icon: FiMessageSquare, label: 'Feedback' },
                ];
            case 'student':
                return [
                    { path: '/student/dashboard', icon: FiHome, label: 'Dashboard' },
                    { path: '/student/attendance-v2', icon: FiCheckSquare, label: 'Attendance' },
                    { path: '/student/marks', icon: FiClipboard, label: 'Marks' },
                    { path: '/student/online-exams', icon: FiEdit3, label: 'Online Exams' },
                    { path: '/student/timetable', icon: FiCalendar, label: 'Timetable' },
                    { path: '/student/fees', icon: FiDollarSign, label: 'Fee Details' },
                    { path: '/student/transport', icon: FiTruck, label: 'Transport' },
                    { path: '/student/leave', icon: FiFileText, label: 'Apply Leave', badge: leaveStats.myPending > 0 ? leaveStats.myPending : null },
                    { path: '/student/feedback', icon: FiMessageSquare, label: 'Feedback' },
                ];
            default:
                return [];
        }
    };

    const menuItems = getMenuItems();

    return (
        <aside
            className={`sidebar bg-white border-r border-gray-200 transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'
                } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        >
            {/* Logo */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
                {!sidebarCollapsed && (
                    <Link to="/" className="flex items-center gap-2">
                        <span className="text-2xl">🎓</span>
                        <span className="font-bold text-lg text-primary-600">SmartCampus+</span>
                    </Link>
                )}
                {sidebarCollapsed && (
                    <span className="text-2xl mx-auto">🎓</span>
                )}
                <button
                    onClick={toggleSidebarCollapse}
                    className="hidden lg:flex p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                >
                    {sidebarCollapsed ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
                </button>
            </div>

            {/* User Info */}
            <div className={`p-4 border-b border-gray-100 ${sidebarCollapsed ? 'text-center' : ''}`}>
                <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold">
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    {!sidebarCollapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-secondary-800 truncate">{user?.name}</p>
                            <p className="text-xs text-secondary-500 capitalize">{user?.role}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
                <ul className="space-y-1">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <li key={item.path}>
                                <Link
                                    to={item.path}
                                    className={`sidebar-link ${isActive ? 'active' : ''} ${sidebarCollapsed ? 'justify-center' : ''}`}
                                    title={sidebarCollapsed ? item.label : ''}
                                >
                                    <Icon size={20} />
                                    {!sidebarCollapsed && (
                                        <>
                                            <span className="flex-1">{item.label}</span>
                                            {item.badge && item.badge > 0 && (
                                                <span className="px-2 py-0.5 text-xs font-medium bg-primary-500 text-white rounded-full">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </>
                                    )}
                                    {sidebarCollapsed && item.badge && item.badge > 0 && (
                                        <span className="absolute top-0 right-1 w-2 h-2 bg-primary-500 rounded-full" />
                                    )}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-gray-100">
                <button
                    onClick={handleLogout}
                    className={`sidebar-link w-full text-danger-500 hover:bg-danger-50 hover:text-danger-600 ${sidebarCollapsed ? 'justify-center' : ''
                        }`}
                >
                    <FiLogOut size={20} />
                    {!sidebarCollapsed && <span>Logout</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
