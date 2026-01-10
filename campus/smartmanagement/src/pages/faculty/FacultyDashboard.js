import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { facultyAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import StatCard from '../../components/common/StatCard';
import Breadcrumb from '../../components/common/Breadcrumb';
import { SkeletonStats } from '../../components/common/LoadingSpinner';
import { FiCalendar, FiCheckSquare, FiClock, FiBell, FiUsers, FiClipboard, FiArrowRight } from 'react-icons/fi';

const FacultyDashboard = () => {
    const { user } = useAuth();
    const { isConnected } = useSocket();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [todayClasses, setTodayClasses] = useState([]);
    const [recentLeaves, setRecentLeaves] = useState([]);

    const attendanceData = [
        { name: 'Mon', attendance: 92 },
        { name: 'Tue', attendance: 88 },
        { name: 'Wed', attendance: 95 },
        { name: 'Thu', attendance: 90 },
        { name: 'Fri', attendance: 85 },
    ];

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const response = await facultyAPI.getDashboard();
            if (response.data.success) {
                setStats(response.data.data);
                setTodayClasses(response.data.data.todayClasses || []);
                setRecentLeaves(response.data.data.leaveRequests || []);
            }
        } catch (error) {
            console.error('Error fetching dashboard:', error);
            setStats({
                classesToday: 4,
                pendingAttendance: 2,
                leaveRequests: 3,
                totalStudents: 120,
            });
            setTodayClasses([
                { _id: '1', subject: 'Data Structures', time: '09:00 AM', class: 'CSE 3rd Year A', room: 'CS-101', status: 'completed' },
                { _id: '2', subject: 'Algorithms', time: '11:00 AM', class: 'CSE 3rd Year B', room: 'CS-102', status: 'upcoming' },
                { _id: '3', subject: 'Database Systems', time: '02:00 PM', class: 'CSE 2nd Year A', room: 'CS-103', status: 'upcoming' },
                { _id: '4', subject: 'Data Structures Lab', time: '04:00 PM', class: 'CSE 3rd Year A', room: 'Lab-1', status: 'upcoming' },
            ]);
            setRecentLeaves([
                { _id: '1', studentName: 'John Doe', leaveType: 'Medical', fromDate: '2024-01-15', toDate: '2024-01-17', status: 'pending' },
                { _id: '2', studentName: 'Jane Smith', leaveType: 'Personal', fromDate: '2024-01-18', toDate: '2024-01-18', status: 'pending' },
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <Breadcrumb items={[{ label: 'Dashboard', path: '/faculty/dashboard', isLast: true }]} />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Welcome, {user?.name}!</h1>
                    <p className="text-secondary-500 mt-1">Here's your teaching overview for today.</p>
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
                        icon={<FiCalendar size={24} />}
                        iconBg="bg-primary-100 text-primary-600"
                        value={stats?.classesToday || 4}
                        label="Classes Today"
                    />
                    <StatCard
                        icon={<FiCheckSquare size={24} />}
                        iconBg="bg-warning-50 text-warning-500"
                        value={stats?.pendingAttendance || 2}
                        label="Pending Attendance"
                    />
                    <StatCard
                        icon={<FiClock size={24} />}
                        iconBg="bg-danger-50 text-danger-500"
                        value={stats?.leaveRequests || 3}
                        label="Leave Requests"
                    />
                    <StatCard
                        icon={<FiUsers size={24} />}
                        iconBg="bg-success-50 text-success-500"
                        value={stats?.totalStudents || 120}
                        label="Total Students"
                    />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Today's Classes */}
                <div className="lg:col-span-2">
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Today's Classes</h3>
                            <Link to="/faculty/timetable" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                                View Timetable <FiArrowRight size={14} />
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {todayClasses.map((cls) => (
                                <div
                                    key={cls._id}
                                    className={`flex items-center gap-4 p-4 rounded-lg border ${cls.status === 'completed' ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-100 hover:border-primary-200'
                                        } transition-colors`}
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cls.status === 'completed' ? 'bg-success-50 text-success-500' : 'bg-primary-100 text-primary-600'
                                        }`}>
                                        <FiCalendar size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-medium text-secondary-800">{cls.subject}</h4>
                                            {cls.status === 'completed' && (
                                                <span className="badge-success text-xs">Completed</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-secondary-500">{cls.class} • {cls.room}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-secondary-800">{cls.time}</p>
                                        {cls.status !== 'completed' && (
                                            <Link
                                                to={`/faculty/attendance?class=${cls.class}`}
                                                className="text-xs text-primary-600 hover:text-primary-700"
                                            >
                                                Mark Attendance
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Attendance Chart */}
                    <div className="card">
                        <h3 className="card-title mb-4">Weekly Attendance</h3>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={attendanceData}>
                                    <defs>
                                        <linearGradient id="colorAtt" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                                    <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="attendance" stroke="#6366f1" fillOpacity={1} fill="url(#colorAtt)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Leave Requests */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Leave Requests</h3>
                            <Link to="/faculty/leaves" className="text-sm text-primary-600 hover:text-primary-700">
                                View All
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {recentLeaves.length > 0 ? recentLeaves.slice(0, 3).map((leave) => (
                                <div key={leave._id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                                    <div>
                                        <p className="font-medium text-secondary-800">{leave.studentName}</p>
                                        <p className="text-xs text-secondary-500">
                                            {leave.leaveType} • {new Date(leave.fromDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <span className={`badge ${leave.status === 'pending' ? 'badge-warning' : leave.status === 'approved' ? 'badge-success' : 'badge-danger'}`}>
                                        {leave.status}
                                    </span>
                                </div>
                            )) : (
                                <p className="text-sm text-secondary-500 text-center py-4">No pending requests</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 card">
                <h3 className="card-title mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Link to="/faculty/attendance" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <FiCheckSquare size={24} />
                        <span className="text-sm font-medium">Mark Attendance</span>
                    </Link>
                    <Link to="/faculty/marks" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <FiClipboard size={24} />
                        <span className="text-sm font-medium">Upload Marks</span>
                    </Link>
                    <Link to="/faculty/leaves" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <FiClock size={24} />
                        <span className="text-sm font-medium">Leave Requests</span>
                    </Link>
                    <Link to="/faculty/notices" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <FiBell size={24} />
                        <span className="text-sm font-medium">Post Notice</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default FacultyDashboard;
