import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { studentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import StatCard from '../../components/common/StatCard';
import Breadcrumb from '../../components/common/Breadcrumb';
import { SkeletonStats } from '../../components/common/LoadingSpinner';
import {
    FiCheckSquare, FiClipboard, FiCalendar, FiDollarSign, FiTruck, FiFileText,
    FiBell, FiArrowRight, FiClock
} from 'react-icons/fi';

const StudentDashboard = () => {
    const { user } = useAuth();
    const { isConnected, subscribeToEvent } = useSocket();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [todayClasses, setTodayClasses] = useState([]);
    const [recentNotices, setRecentNotices] = useState([]);

    const attendanceData = [
        { subject: 'DS', attendance: 92 },
        { subject: 'Algo', attendance: 88 },
        { subject: 'DBMS', attendance: 95 },
        { subject: 'OS', attendance: 85 },
        { subject: 'CN', attendance: 78 },
    ];

    const feeData = [
        { name: 'Paid', value: 75000, color: '#10b981' },
        { name: 'Pending', value: 25000, color: '#f59e0b' },
    ];

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const response = await studentAPI.getDashboard();
            if (response.data.success) {
                setStats(response.data.data);
                setTodayClasses(response.data.data.todayClasses || []);
                setRecentNotices(response.data.data.notices || []);
            }
        } catch (error) {
            console.error('Error fetching dashboard:', error);
            setStats({
                attendance: 87,
                cgpa: 8.2,
                feeStatus: 'Partial',
                pendingFee: 25000,
            });
            setTodayClasses([
                { _id: '1', subject: 'Data Structures', time: '09:00 AM', room: 'CS-101', faculty: 'Dr. Robert Smith' },
                { _id: '2', subject: 'Algorithms', time: '11:00 AM', room: 'CS-102', faculty: 'Prof. Emily Davis' },
                { _id: '3', subject: 'Database Systems', time: '02:00 PM', room: 'CS-103', faculty: 'Dr. Michael Lee' },
            ]);
            setRecentNotices([
                { _id: '1', title: 'Mid-term Exam Schedule', type: 'exam', createdAt: new Date().toISOString() },
                { _id: '2', title: 'Fee Payment Reminder', type: 'general', createdAt: new Date(Date.now() - 86400000).toISOString() },
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <Breadcrumb items={[{ label: 'Dashboard', path: '/student/dashboard', isLast: true }]} />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Welcome, {user?.name}!</h1>
                    <p className="text-secondary-500 mt-1">Track your academic progress and stay updated.</p>
                </div>
                <div className="flex items-center gap-3 mt-4 md:mt-0">
                    <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${isConnected ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600'
                        }`}>
                        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success-500' : 'bg-danger-500'}`} />
                        {isConnected ? 'Live' : 'Offline'}
                    </span>
                </div>
            </div>

            {/* Stats Cards */}
            {loading ? (
                <SkeletonStats />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <StatCard
                        icon={<FiCheckSquare size={24} />}
                        iconBg="bg-primary-100 text-primary-600"
                        value={`${stats?.attendance || 87}%`}
                        label="Overall Attendance"
                    />
                    <StatCard
                        icon={<FiClipboard size={24} />}
                        iconBg="bg-success-50 text-success-500"
                        value={stats?.cgpa || 8.2}
                        label="Current CGPA"
                    />
                    <StatCard
                        icon={<FiCalendar size={24} />}
                        iconBg="bg-warning-50 text-warning-500"
                        value={todayClasses.length}
                        label="Classes Today"
                    />
                    <StatCard
                        icon={<FiDollarSign size={24} />}
                        iconBg="bg-danger-50 text-danger-500"
                        value={`₹${((stats?.pendingFee || 25000) / 1000).toFixed(0)}K`}
                        label="Pending Fee"
                    />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Today's Classes */}
                <div className="lg:col-span-2">
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Today's Classes</h3>
                            <Link to="/student/timetable" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                                View Timetable <FiArrowRight size={14} />
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {todayClasses.length > 0 ? todayClasses.map((cls, index) => (
                                <div
                                    key={cls._id}
                                    className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 hover:border-primary-200 transition-colors"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
                                        <FiCalendar size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-secondary-800">{cls.subject}</h4>
                                        <p className="text-sm text-secondary-500">{cls.faculty} • {cls.room}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-secondary-800">{cls.time}</p>
                                        {index === 0 && <span className="badge-success text-xs">Upcoming</span>}
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-8 text-secondary-500">
                                    <FiCalendar size={32} className="mx-auto mb-2 opacity-50" />
                                    <p>No classes scheduled for today</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Attendance Chart */}
                    <div className="card">
                        <h3 className="card-title mb-4">Subject-wise Attendance</h3>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={attendanceData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={12} />
                                    <YAxis dataKey="subject" type="category" stroke="#94a3b8" fontSize={12} width={40} />
                                    <Tooltip />
                                    <Bar dataKey="attendance" fill="#6366f1" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Fee Status */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Fee Status</h3>
                            <Link to="/student/fees" className="text-sm text-primary-600 hover:text-primary-700">
                                View Details
                            </Link>
                        </div>
                        <div className="h-40">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={feeData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={60}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {feeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-6 mt-2">
                            {feeData.map((item) => (
                                <div key={item.name} className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-sm text-secondary-600">{item.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Notices */}
            <div className="mt-6 card">
                <div className="card-header">
                    <h3 className="card-title">Recent Notices</h3>
                    <Link to="/student/notices" className="text-sm text-primary-600 hover:text-primary-700">
                        View All
                    </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recentNotices.length > 0 ? recentNotices.map((notice) => (
                        <div key={notice._id} className="p-4 rounded-lg bg-gray-50 hover:bg-primary-50 transition-colors">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600">
                                    <FiBell size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-secondary-800 truncate">{notice.title}</h4>
                                    <p className="text-xs text-secondary-500 mt-1">
                                        {new Date(notice.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <p className="text-secondary-500 col-span-3 text-center py-4">No recent notices</p>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 card">
                <h3 className="card-title mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <Link to="/student/attendance" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <FiCheckSquare size={24} />
                        <span className="text-sm font-medium">Attendance</span>
                    </Link>
                    <Link to="/student/marks" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <FiClipboard size={24} />
                        <span className="text-sm font-medium">Marks</span>
                    </Link>
                    <Link to="/student/timetable" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <FiCalendar size={24} />
                        <span className="text-sm font-medium">Timetable</span>
                    </Link>
                    <Link to="/student/fees" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <FiDollarSign size={24} />
                        <span className="text-sm font-medium">Fees</span>
                    </Link>
                    <Link to="/student/transport" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <FiTruck size={24} />
                        <span className="text-sm font-medium">Transport</span>
                    </Link>
                    <Link to="/student/leave" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <FiFileText size={24} />
                        <span className="text-sm font-medium">Apply Leave</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
