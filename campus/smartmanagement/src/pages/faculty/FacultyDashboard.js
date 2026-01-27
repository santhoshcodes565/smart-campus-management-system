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
import {
    FiCalendar, FiCheckSquare, FiClock, FiBell, FiUsers, FiClipboard,
    FiArrowRight, FiLogIn, FiLogOut, FiEdit3
} from 'react-icons/fi';

const FacultyDashboard = () => {
    const { user } = useAuth();
    const { isConnected } = useSocket();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [todayClasses, setTodayClasses] = useState([]);
    const [recentLeaves, setRecentLeaves] = useState([]);

    // Attendance state
    const [attendanceStatus, setAttendanceStatus] = useState({
        hasCheckedIn: false,
        hasCheckedOut: false,
        checkInTime: null,
        checkOutTime: null,
        formattedCheckIn: null,
        formattedCheckOut: null,
        totalWorkingHours: 0
    });
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [noteAction, setNoteAction] = useState(null); // 'check-in' or 'check-out'
    const [note, setNote] = useState('');

    const attendanceData = [
        { name: 'Mon', attendance: 92 },
        { name: 'Tue', attendance: 88 },
        { name: 'Wed', attendance: 95 },
        { name: 'Thu', attendance: 90 },
        { name: 'Fri', attendance: 85 },
    ];

    useEffect(() => {
        fetchDashboardData();
        fetchAttendanceStatus();
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

    const fetchAttendanceStatus = async () => {
        try {
            const response = await facultyAPI.facultyAttendance.getStatus();
            if (response.data.success) {
                setAttendanceStatus(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching attendance status:', error);
        }
    };

    const handleCheckIn = async (withNote = false) => {
        if (withNote && !showNoteModal) {
            setNoteAction('check-in');
            setShowNoteModal(true);
            return;
        }

        try {
            setAttendanceLoading(true);
            const response = await facultyAPI.facultyAttendance.checkIn(note);
            if (response.data.success) {
                toast.success('✅ Check-in successful!');
                setAttendanceStatus(prev => ({
                    ...prev,
                    hasCheckedIn: true,
                    checkInTime: response.data.data.checkInTime,
                    formattedCheckIn: response.data.data.formattedCheckIn
                }));
                setShowNoteModal(false);
                setNote('');
            }
        } catch (error) {
            toast.error(error.message || 'Check-in failed');
        } finally {
            setAttendanceLoading(false);
        }
    };

    const handleCheckOut = async (withNote = false) => {
        if (withNote && !showNoteModal) {
            setNoteAction('check-out');
            setShowNoteModal(true);
            return;
        }

        try {
            setAttendanceLoading(true);
            const response = await facultyAPI.facultyAttendance.checkOut(note);
            if (response.data.success) {
                toast.success('✅ Check-out successful!');
                setAttendanceStatus(prev => ({
                    ...prev,
                    hasCheckedOut: true,
                    checkOutTime: response.data.data.checkOutTime,
                    formattedCheckOut: response.data.data.formattedCheckOut,
                    totalWorkingHours: response.data.data.totalWorkingHours
                }));
                setShowNoteModal(false);
                setNote('');
            }
        } catch (error) {
            toast.error(error.message || 'Check-out failed');
        } finally {
            setAttendanceLoading(false);
        }
    };

    const handleNoteSubmit = () => {
        if (noteAction === 'check-in') {
            handleCheckIn(false);
        } else if (noteAction === 'check-out') {
            handleCheckOut(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <Breadcrumb items={[{ label: 'Dashboard', path: '/faculty/dashboard', isLast: true }]} />

            {/* ==================== CHECK-IN / CHECK-OUT CONTROLS ==================== */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 mb-6 shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Status Display */}
                    <div className="text-white">
                        <h2 className="text-xl font-semibold mb-1">Today's Attendance</h2>
                        {attendanceStatus.hasCheckedIn ? (
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></span>
                                <span>Checked in at <strong>{attendanceStatus.formattedCheckIn}</strong></span>
                                {attendanceStatus.hasCheckedOut && (
                                    <span className="ml-2">
                                        | Checked out at <strong>{attendanceStatus.formattedCheckOut}</strong>
                                        <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-sm">
                                            {attendanceStatus.totalWorkingHours?.toFixed(2)} hrs
                                        </span>
                                    </span>
                                )}
                            </div>
                        ) : (
                            <p className="text-white/80">You haven't checked in yet today</p>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleCheckIn(true)}
                            disabled={attendanceStatus.hasCheckedIn || attendanceLoading}
                            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${attendanceStatus.hasCheckedIn
                                    ? 'bg-white/20 text-white/50 cursor-not-allowed'
                                    : 'bg-white text-primary-600 hover:bg-gray-100 shadow-md hover:shadow-lg'
                                }`}
                        >
                            <FiLogIn size={20} />
                            {attendanceLoading && noteAction === 'check-in' ? 'Processing...' : 'CHECK-IN'}
                        </button>
                        <button
                            onClick={() => handleCheckOut(true)}
                            disabled={!attendanceStatus.hasCheckedIn || attendanceStatus.hasCheckedOut || attendanceLoading}
                            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${!attendanceStatus.hasCheckedIn || attendanceStatus.hasCheckedOut
                                    ? 'bg-white/20 text-white/50 cursor-not-allowed'
                                    : 'bg-white text-danger-600 hover:bg-gray-100 shadow-md hover:shadow-lg'
                                }`}
                        >
                            <FiLogOut size={20} />
                            {attendanceLoading && noteAction === 'check-out' ? 'Processing...' : 'CHECK-OUT'}
                        </button>
                        <Link
                            to="/faculty/my-attendance"
                            className="flex items-center gap-2 px-4 py-3 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all"
                        >
                            <FiClock size={18} />
                            View History
                        </Link>
                    </div>
                </div>
            </div>

            {/* Note Modal */}
            {showNoteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
                        <h3 className="text-lg font-semibold text-secondary-800 mb-4">
                            {noteAction === 'check-in' ? 'Add Check-in Note' : 'Add Check-out Note'}
                        </h3>
                        <p className="text-secondary-500 text-sm mb-4">
                            Optional: Add a note for your {noteAction} (e.g., late arrival reason, early departure)
                        </p>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Enter optional note..."
                            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                            rows={3}
                            maxLength={500}
                        />
                        <p className="text-xs text-secondary-400 mt-1 mb-4">{note.length}/500 characters</p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowNoteModal(false);
                                    setNote('');
                                }}
                                className="px-4 py-2 text-secondary-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleNoteSubmit}
                                disabled={attendanceLoading}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                            >
                                {attendanceLoading ? 'Processing...' : `Confirm ${noteAction === 'check-in' ? 'Check-in' : 'Check-out'}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    <Link to="/faculty/attendance-v2" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-primary-50 hover:text-primary-600 transition-colors">
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
                    <Link to="/faculty/my-attendance" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <FiCalendar size={24} />
                        <span className="text-sm font-medium">My Attendance</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default FacultyDashboard;
