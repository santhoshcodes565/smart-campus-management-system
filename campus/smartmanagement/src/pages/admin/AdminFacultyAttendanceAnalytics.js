import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { adminAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import StatCard from '../../components/common/StatCard';
import { SkeletonStats } from '../../components/common/LoadingSpinner';
import {
    FiTrendingUp, FiCalendar, FiClock, FiAlertTriangle, FiUsers,
    FiBarChart2, FiPieChart
} from 'react-icons/fi';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const AdminFacultyAttendanceAnalytics = () => {
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    useEffect(() => {
        fetchAnalytics();
    }, [selectedMonth, selectedYear]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.facultyAttendance.getAnalytics({
                month: selectedMonth,
                year: selectedYear
            });
            if (response.data.success) {
                setAnalytics(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error('Failed to fetch analytics data');
        } finally {
            setLoading(false);
        }
    };

    const getMonthName = (month) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months[month - 1];
    };

    // Calculate summary statistics
    const summaryStats = analytics ? {
        totalFaculty: analytics.facultySummary?.length || 0,
        avgAttendance: analytics.facultySummary?.length > 0
            ? (analytics.facultySummary.reduce((sum, f) => sum + f.presentDays, 0) / analytics.facultySummary.length).toFixed(1)
            : 0,
        avgHours: analytics.facultySummary?.length > 0
            ? (analytics.facultySummary.reduce((sum, f) => sum + f.avgHours, 0) / analytics.facultySummary.length).toFixed(1)
            : 0,
        atRiskCount: analytics.insights?.frequentAbsences?.length || 0
    } : null;

    // Prepare department chart data
    const departmentChartData = analytics?.departmentStats?.map(d => ({
        name: d.department?.substring(0, 15) || 'Unknown',
        avgHours: d.avgHoursPerFaculty,
        faculty: d.totalFaculty
    })) || [];

    // Prepare attendance distribution for pie chart
    const attendanceDistribution = analytics?.facultySummary ? [
        { name: 'Present', value: analytics.facultySummary.reduce((sum, f) => sum + f.presentDays, 0) },
        { name: 'Absent', value: analytics.facultySummary.reduce((sum, f) => sum + f.absentDays, 0) },
        { name: 'Partial', value: analytics.facultySummary.reduce((sum, f) => sum + f.partialDays, 0) }
    ].filter(d => d.value > 0) : [];

    return (
        <div className="animate-fade-in">
            <Breadcrumb
                items={[
                    { label: 'Dashboard', path: '/admin/dashboard' },
                    { label: 'Faculty Attendance', path: '/admin/faculty-attendance' },
                    { label: 'Analytics', path: '/admin/faculty-attendance-analytics', isLast: true }
                ]}
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Smart Attendance Analyzer</h1>
                    <p className="text-secondary-500 mt-1">
                        Comprehensive analytics for {getMonthName(selectedMonth)} {selectedYear}
                    </p>
                </div>
                <div className="flex items-center gap-3 mt-4 md:mt-0">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                            <option key={m} value={m}>{getMonthName(m)}</option>
                        ))}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                        {[2024, 2025, 2026].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Summary Stats */}
            {loading ? (
                <SkeletonStats />
            ) : summaryStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <StatCard
                        icon={<FiUsers size={24} />}
                        iconBg="bg-primary-100 text-primary-600"
                        value={summaryStats.totalFaculty}
                        label="Total Faculty Tracked"
                    />
                    <StatCard
                        icon={<FiCalendar size={24} />}
                        iconBg="bg-success-50 text-success-500"
                        value={summaryStats.avgAttendance}
                        label="Avg Present Days"
                    />
                    <StatCard
                        icon={<FiClock size={24} />}
                        iconBg="bg-warning-50 text-warning-500"
                        value={`${summaryStats.avgHours}h`}
                        label="Avg Working Hours"
                    />
                    <StatCard
                        icon={<FiAlertTriangle size={24} />}
                        iconBg="bg-danger-50 text-danger-500"
                        value={summaryStats.atRiskCount}
                        label="Frequent Absentees"
                    />
                </div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Department Average Hours */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title flex items-center gap-2">
                            <FiBarChart2 size={18} className="text-primary-600" />
                            Avg Working Hours by Department
                        </h3>
                    </div>
                    {loading ? (
                        <div className="h-64 flex items-center justify-center">
                            <div className="animate-pulse text-secondary-400">Loading chart...</div>
                        </div>
                    ) : (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={departmentChartData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis type="number" domain={[0, 'auto']} />
                                    <YAxis type="category" dataKey="name" width={100} fontSize={12} />
                                    <Tooltip
                                        formatter={(value, name) => [`${value}h`, 'Avg Hours']}
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                    />
                                    <Bar dataKey="avgHours" fill="#6366f1" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Attendance Distribution */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title flex items-center gap-2">
                            <FiPieChart size={18} className="text-primary-600" />
                            Overall Attendance Distribution
                        </h3>
                    </div>
                    {loading ? (
                        <div className="h-64 flex items-center justify-center">
                            <div className="animate-pulse text-secondary-400">Loading chart...</div>
                        </div>
                    ) : (
                        <div className="h-64 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={attendanceDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={2}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {attendanceDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>

            {/* Insights Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Frequent Absences */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title text-danger-600">⚠️ Frequent Absence Detection</h3>
                        <span className="text-sm text-secondary-500">3+ absences this month</span>
                    </div>
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="animate-pulse h-12 bg-gray-100 rounded-lg"></div>
                            ))}
                        </div>
                    ) : analytics?.insights?.frequentAbsences?.length > 0 ? (
                        <div className="space-y-3">
                            {analytics.insights.frequentAbsences.slice(0, 5).map((faculty, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-danger-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-danger-100 flex items-center justify-center text-danger-600 font-semibold">
                                            {faculty.name?.charAt(0)?.toUpperCase() || 'F'}
                                        </div>
                                        <div>
                                            <p className="font-medium text-secondary-800">{faculty.name}</p>
                                            <p className="text-xs text-secondary-500">{faculty.department}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-lg font-bold text-danger-600">{faculty.absentDays}</span>
                                        <p className="text-xs text-secondary-500">absent days</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-secondary-500">
                            <FiAlertTriangle size={32} className="mx-auto mb-2 opacity-50" />
                            <p>No frequent absences detected</p>
                        </div>
                    )}
                </div>

                {/* Early Leavers */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title text-warning-600">⏰ Early Leave Pattern Detection</h3>
                        <span className="text-sm text-secondary-500">Avg &lt; 7 hours/day</span>
                    </div>
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="animate-pulse h-12 bg-gray-100 rounded-lg"></div>
                            ))}
                        </div>
                    ) : analytics?.insights?.earlyLeavers?.length > 0 ? (
                        <div className="space-y-3">
                            {analytics.insights.earlyLeavers.slice(0, 5).map((faculty, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-warning-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-warning-100 flex items-center justify-center text-warning-600 font-semibold">
                                            {faculty.name?.charAt(0)?.toUpperCase() || 'F'}
                                        </div>
                                        <div>
                                            <p className="font-medium text-secondary-800">{faculty.name}</p>
                                            <p className="text-xs text-secondary-500">{faculty.department}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-lg font-bold text-warning-600">{faculty.avgHours}h</span>
                                        <p className="text-xs text-secondary-500">avg/day</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-secondary-500">
                            <FiClock size={32} className="mx-auto mb-2 opacity-50" />
                            <p>No early leave patterns detected</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Faculty Summary Table */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Monthly Faculty Summary</h3>
                    <span className="text-sm text-secondary-500">
                        {analytics?.facultySummary?.length || 0} faculty members
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="text-left py-3 px-4 text-sm font-semibold text-secondary-600">Faculty</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-secondary-600">Department</th>
                                <th className="text-center py-3 px-4 text-sm font-semibold text-secondary-600">Present</th>
                                <th className="text-center py-3 px-4 text-sm font-semibold text-secondary-600">Absent</th>
                                <th className="text-center py-3 px-4 text-sm font-semibold text-secondary-600">Partial</th>
                                <th className="text-center py-3 px-4 text-sm font-semibold text-secondary-600">Total Hours</th>
                                <th className="text-center py-3 px-4 text-sm font-semibold text-secondary-600">Avg Hours</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                                        <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                                        <td className="py-3 px-4 text-center"><div className="h-4 bg-gray-200 rounded w-8 mx-auto"></div></td>
                                        <td className="py-3 px-4 text-center"><div className="h-4 bg-gray-200 rounded w-8 mx-auto"></div></td>
                                        <td className="py-3 px-4 text-center"><div className="h-4 bg-gray-200 rounded w-8 mx-auto"></div></td>
                                        <td className="py-3 px-4 text-center"><div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div></td>
                                        <td className="py-3 px-4 text-center"><div className="h-4 bg-gray-200 rounded w-12 mx-auto"></div></td>
                                    </tr>
                                ))
                            ) : analytics?.facultySummary?.length > 0 ? (
                                analytics.facultySummary.map((faculty, index) => (
                                    <tr key={index} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                        <td className="py-3 px-4">
                                            <span className="font-medium text-secondary-800">{faculty.name}</span>
                                        </td>
                                        <td className="py-3 px-4 text-secondary-600">{faculty.department || '-'}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="px-2 py-1 bg-success-50 text-success-600 rounded-full text-sm font-medium">
                                                {faculty.presentDays}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-sm font-medium ${faculty.absentDays >= 3
                                                    ? 'bg-danger-50 text-danger-600'
                                                    : 'bg-gray-100 text-secondary-600'
                                                }`}>
                                                {faculty.absentDays}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="px-2 py-1 bg-warning-50 text-warning-600 rounded-full text-sm font-medium">
                                                {faculty.partialDays}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center font-medium text-secondary-800">
                                            {faculty.totalHours?.toFixed(1)}h
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`font-semibold ${faculty.avgHours >= 8 ? 'text-success-600' :
                                                    faculty.avgHours >= 6 ? 'text-warning-600' : 'text-danger-600'
                                                }`}>
                                                {faculty.avgHours}h
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-secondary-500">
                                        No attendance data available for this period
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminFacultyAttendanceAnalytics;
