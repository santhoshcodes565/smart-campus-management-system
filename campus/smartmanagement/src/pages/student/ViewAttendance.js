import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { studentAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import { SkeletonStats } from '../../components/common/LoadingSpinner';
import { FiCheckSquare, FiCalendar } from 'react-icons/fi';

const ViewAttendance = () => {
    const [loading, setLoading] = useState(true);
    const [attendance, setAttendance] = useState([]);
    const [monthlyData, setMonthlyData] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState('');

    const demoAttendance = [
        { subject: 'Data Structures', total: 45, attended: 42, percentage: 93 },
        { subject: 'Algorithms', total: 40, attended: 35, percentage: 88 },
        { subject: 'Database Systems', total: 42, attended: 40, percentage: 95 },
        { subject: 'Operating Systems', total: 38, attended: 32, percentage: 84 },
        { subject: 'Computer Networks', total: 35, attended: 28, percentage: 80 },
    ];

    const demoMonthlyData = [
        { month: 'Aug', attendance: 92 },
        { month: 'Sep', attendance: 88 },
        { month: 'Oct', attendance: 90 },
        { month: 'Nov', attendance: 85 },
        { month: 'Dec', attendance: 87 },
        { month: 'Jan', attendance: 89 },
    ];

    useEffect(() => {
        fetchAttendance();
    }, []);

    const fetchAttendance = async () => {
        try {
            setLoading(true);
            const response = await studentAPI.getAttendance();
            if (response.data.success) {
                setAttendance(response.data.data.subjectWise || []);
                setMonthlyData(response.data.data.monthly || []);
            }
        } catch (error) {
            console.error('Error fetching attendance:', error);
            setAttendance(demoAttendance);
            setMonthlyData(demoMonthlyData);
        } finally {
            setLoading(false);
        }
    };

    const overallAttendance = attendance.length > 0
        ? Math.round(attendance.reduce((sum, s) => sum + s.percentage, 0) / attendance.length)
        : 0;

    const getAttendanceColor = (percentage) => {
        if (percentage >= 85) return 'text-success-500';
        if (percentage >= 75) return 'text-warning-500';
        return 'text-danger-500';
    };

    const getAttendanceBg = (percentage) => {
        if (percentage >= 85) return 'bg-success-500';
        if (percentage >= 75) return 'bg-warning-500';
        return 'bg-danger-500';
    };

    return (
        <div className="animate-fade-in">
            <Breadcrumb />

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-secondary-800">My Attendance</h1>
                <p className="text-secondary-500 mt-1">View your attendance records and statistics</p>
            </div>

            {loading ? (
                <SkeletonStats />
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="card text-center">
                            <div className={`text-4xl font-bold ${getAttendanceColor(overallAttendance)}`}>
                                {overallAttendance}%
                            </div>
                            <p className="text-sm text-secondary-500 mt-2">Overall Attendance</p>
                        </div>
                        <div className="card text-center">
                            <div className="text-4xl font-bold text-secondary-800">
                                {attendance.reduce((sum, s) => sum + s.attended, 0)}
                            </div>
                            <p className="text-sm text-secondary-500 mt-2">Classes Attended</p>
                        </div>
                        <div className="card text-center">
                            <div className="text-4xl font-bold text-secondary-800">
                                {attendance.reduce((sum, s) => sum + s.total, 0)}
                            </div>
                            <p className="text-sm text-secondary-500 mt-2">Total Classes</p>
                        </div>
                        <div className="card text-center">
                            <div className="text-4xl font-bold text-danger-500">
                                {attendance.reduce((sum, s) => sum + (s.total - s.attended), 0)}
                            </div>
                            <p className="text-sm text-secondary-500 mt-2">Classes Missed</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Subject-wise Chart */}
                        <div className="card">
                            <h3 className="card-title mb-4">Subject-wise Attendance</h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={attendance} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={12} />
                                        <YAxis dataKey="subject" type="category" stroke="#94a3b8" fontSize={11} width={100} />
                                        <Tooltip formatter={(v) => `${v}%`} />
                                        <Bar dataKey="percentage" fill="#6366f1" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Monthly Trend */}
                        <div className="card">
                            <h3 className="card-title mb-4">Monthly Trend</h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={monthlyData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                                        <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
                                        <Tooltip formatter={(v) => `${v}%`} />
                                        <Line type="monotone" dataKey="attendance" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Table */}
                    <div className="card">
                        <h3 className="card-title mb-4">Detailed Attendance</h3>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Subject</th>
                                        <th>Classes Attended</th>
                                        <th>Total Classes</th>
                                        <th>Percentage</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendance.map((subject, index) => (
                                        <tr key={index}>
                                            <td className="font-medium">{subject.subject}</td>
                                            <td>{subject.attended}</td>
                                            <td>{subject.total}</td>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 h-2 bg-gray-200 rounded-full max-w-[100px]">
                                                        <div
                                                            className={`h-2 rounded-full ${getAttendanceBg(subject.percentage)}`}
                                                            style={{ width: `${subject.percentage}%` }}
                                                        />
                                                    </div>
                                                    <span className={`font-medium ${getAttendanceColor(subject.percentage)}`}>
                                                        {subject.percentage}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${subject.percentage >= 85 ? 'badge-success' :
                                                        subject.percentage >= 75 ? 'badge-warning' : 'badge-danger'
                                                    }`}>
                                                    {subject.percentage >= 85 ? 'Good' : subject.percentage >= 75 ? 'Warning' : 'Low'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Warning Message */}
                    {attendance.some(s => s.percentage < 75) && (
                        <div className="mt-6 p-4 bg-danger-50 border border-danger-200 rounded-lg flex items-start gap-3">
                            <FiCheckSquare className="text-danger-500 mt-0.5" size={20} />
                            <div>
                                <h4 className="font-medium text-danger-700">Attendance Warning</h4>
                                <p className="text-sm text-danger-600 mt-1">
                                    Your attendance in some subjects is below 75%. Please attend more classes to avoid debarment from exams.
                                </p>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ViewAttendance;
