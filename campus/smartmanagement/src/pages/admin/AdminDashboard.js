import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { adminAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import StatCard from '../../components/common/StatCard';
import Breadcrumb from '../../components/common/Breadcrumb';
import { SkeletonStats } from '../../components/common/LoadingSpinner';
import { FiUsers, FiUserCheck, FiDollarSign, FiBell, FiTrendingUp, FiCalendar, FiArrowRight } from 'react-icons/fi';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [recentNotices, setRecentNotices] = useState([]);
    const { isConnected } = useSocket();

    // Sample attendance data for chart
    const attendanceData = [
        { name: 'Mon', present: 420, absent: 30 },
        { name: 'Tue', present: 435, absent: 15 },
        { name: 'Wed', present: 410, absent: 40 },
        { name: 'Thu', present: 445, absent: 5 },
        { name: 'Fri', present: 400, absent: 50 },
    ];

    // Fee collection data
    const feeData = [
        { name: 'Collected', value: 75, color: '#10b981' },
        { name: 'Pending', value: 25, color: '#f59e0b' },
    ];

    // Department-wise students
    const departmentData = [
        { name: 'CSE', students: 120 },
        { name: 'ECE', students: 95 },
        { name: 'EEE', students: 80 },
        { name: 'MECH', students: 75 },
        { name: 'CIVIL', students: 60 },
    ];

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getDashboard();
            // Extract data from response - handle { success, data: { overview } } structure
            const data = response.data?.data?.overview || response.data?.data || response.data || {};
            setStats(data);
            setRecentNotices(response.data?.data?.recentNotices || []);
        } catch (error) {
            console.error('Error fetching dashboard:', error);
            // Use fallback data for demo
            setStats({
                totalStudents: 450,
                totalFaculty: 35,
                attendanceToday: 92,
                feesCollected: 1250000,
                feesPending: 450000,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <Breadcrumb items={[{ label: 'Dashboard', path: '/admin/dashboard', isLast: true }]} />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Admin Dashboard</h1>
                    <p className="text-secondary-500 mt-1">Welcome back! Here's what's happening today.</p>
                </div>
                <div className="flex items-center gap-3 mt-4 md:mt-0">
                    <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${isConnected ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600'
                        }`}>
                        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success-500' : 'bg-danger-500'}`} />
                        {isConnected ? 'Live Updates' : 'Offline'}
                    </span>
                </div>
            </div>

            {/* Stats Cards */}
            {loading ? (
                <SkeletonStats />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <StatCard
                        icon={<FiUsers size={24} />}
                        iconBg="bg-primary-100 text-primary-600"
                        value={stats?.totalStudents || 0}
                        label="Student Usernames Generated"
                        trend="12%"
                        trendUp={true}
                    />
                    <StatCard
                        icon={<FiUserCheck size={24} />}
                        iconBg="bg-success-50 text-success-500"
                        value={stats?.totalFaculty || 0}
                        label="Faculty Usernames Generated"
                        trend="5%"
                        trendUp={true}
                    />
                    <StatCard
                        icon={<FiCalendar size={24} />}
                        iconBg="bg-warning-50 text-warning-500"
                        value={`${stats?.attendanceToday || 92}%`}
                        label="Today's Attendance"
                        trend="3%"
                        trendUp={true}
                    />
                    <StatCard
                        icon={<FiDollarSign size={24} />}
                        iconBg="bg-danger-50 text-danger-500"
                        value={`₹${((stats?.feesCollected || 1250000) / 100000).toFixed(1)}L`}
                        label="Fees Collected"
                        trend="8%"
                        trendUp={true}
                    />
                </div>
            )}

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Attendance Chart */}
                <div className="lg:col-span-2 card">
                    <div className="card-header">
                        <h3 className="card-title">Weekly Attendance Overview</h3>
                        <Link to="/admin/reports" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                            View Report <FiArrowRight size={14} />
                        </Link>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={attendanceData}>
                                <defs>
                                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                                <YAxis stroke="#94a3b8" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    }}
                                />
                                <Area type="monotone" dataKey="present" stroke="#10b981" fillOpacity={1} fill="url(#colorPresent)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Fee Collection Pie Chart */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Fee Collection</h3>
                    </div>
                    <div className="h-72 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={feeData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {feeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Department Stats */}
                <div className="lg:col-span-2 card">
                    <div className="card-header">
                        <h3 className="card-title">Students by Department</h3>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={departmentData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={50} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Bar dataKey="students" fill="#6366f1" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Notices */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Recent Notices</h3>
                        <Link to="/admin/notices" className="text-sm text-primary-600 hover:text-primary-700">
                            View All
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {recentNotices.length > 0 ? recentNotices.slice(0, 4).map((notice, index) => (
                            <div key={notice._id || index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                                    <FiBell size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-secondary-800 truncate">{notice.title}</p>
                                    <p className="text-xs text-secondary-500">{new Date(notice.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        )) : (
                            <>
                                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                                        <FiBell size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-secondary-800 truncate">Mid-term Exam Schedule</p>
                                        <p className="text-xs text-secondary-500">Today at 10:00 AM</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-success-50 flex items-center justify-center text-success-600">
                                        <FiBell size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-secondary-800 truncate">Holiday Notice - Republic Day</p>
                                        <p className="text-xs text-secondary-500">Yesterday</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-warning-50 flex items-center justify-center text-warning-600">
                                        <FiBell size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-secondary-800 truncate">Fee Payment Reminder</p>
                                        <p className="text-xs text-secondary-500">2 days ago</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 card">
                <h3 className="card-title mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <Link to="/admin/students" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <FiUsers size={24} />
                        <span className="text-sm font-medium">Add Student</span>
                    </Link>
                    <Link to="/admin/faculty" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <FiUserCheck size={24} />
                        <span className="text-sm font-medium">Add Faculty</span>
                    </Link>
                    <Link to="/admin/notices" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <FiBell size={24} />
                        <span className="text-sm font-medium">Post Notice</span>
                    </Link>
                    <Link to="/admin/timetable" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <FiCalendar size={24} />
                        <span className="text-sm font-medium">Timetable</span>
                    </Link>
                    <Link to="/admin/fees" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <FiDollarSign size={24} />
                        <span className="text-sm font-medium">Fee Setup</span>
                    </Link>
                    <Link to="/admin/reports" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <FiTrendingUp size={24} />
                        <span className="text-sm font-medium">Reports</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
