import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { facultyAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Breadcrumb from '../../components/common/Breadcrumb';
import StatCard from '../../components/common/StatCard';
import { SkeletonStats } from '../../components/common/LoadingSpinner';
import {
    FiCalendar, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle,
    FiTrendingUp, FiChevronLeft, FiChevronRight
} from 'react-icons/fi';

const FacultyAttendanceSummary = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);
    const [history, setHistory] = useState({ records: [], pagination: {} });
    const [currentPage, setCurrentPage] = useState(1);
    const [dateFilter, setDateFilter] = useState({
        fromDate: '',
        toDate: ''
    });

    useEffect(() => {
        fetchSummary();
        fetchHistory();
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [currentPage]);

    const fetchSummary = async () => {
        try {
            const params = {};
            if (dateFilter.fromDate) params.fromDate = dateFilter.fromDate;
            if (dateFilter.toDate) params.toDate = dateFilter.toDate;

            const response = await facultyAPI.facultyAttendance.getSummary(params);
            if (response.data.success) {
                setSummary(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching summary:', error);
            toast.error('Failed to fetch attendance summary');
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const response = await facultyAPI.facultyAttendance.getHistory({
                page: currentPage,
                limit: 15
            });
            if (response.data.success) {
                setHistory(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    };

    const handleFilterApply = () => {
        setCurrentPage(1);
        fetchSummary();
        fetchHistory();
    };

    const handleFilterClear = () => {
        setDateFilter({ fromDate: '', toDate: '' });
        setCurrentPage(1);
        fetchSummary();
        fetchHistory();
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PRESENT':
                return <span className="badge badge-success">Present</span>;
            case 'ABSENT':
                return <span className="badge badge-danger">Absent</span>;
            case 'PARTIAL':
                return <span className="badge badge-warning">Partial</span>;
            default:
                return <span className="badge">{status}</span>;
        }
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="animate-fade-in">
            <Breadcrumb
                items={[
                    { label: 'Dashboard', path: '/faculty/dashboard' },
                    { label: 'My Attendance', path: '/faculty/my-attendance', isLast: true }
                ]}
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">My Attendance Summary</h1>
                    <p className="text-secondary-500 mt-1">View your attendance history and statistics</p>
                </div>
            </div>

            {/* Summary Stats Cards */}
            {loading ? (
                <SkeletonStats />
            ) : summary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                    <StatCard
                        icon={<FiCalendar size={24} />}
                        iconBg="bg-primary-100 text-primary-600"
                        value={summary.totalRecords || 0}
                        label="Total Working Days"
                    />
                    <StatCard
                        icon={<FiCheckCircle size={24} />}
                        iconBg="bg-success-50 text-success-500"
                        value={summary.presentDays || 0}
                        label="Present Days"
                    />
                    <StatCard
                        icon={<FiXCircle size={24} />}
                        iconBg="bg-danger-50 text-danger-500"
                        value={summary.absentDays || 0}
                        label="Absent Days"
                    />
                    <StatCard
                        icon={<FiClock size={24} />}
                        iconBg="bg-warning-50 text-warning-500"
                        value={`${summary.averageHoursPerDay?.toFixed(1) || 0}h`}
                        label="Avg Working Hours"
                    />
                    <StatCard
                        icon={<FiAlertCircle size={24} />}
                        iconBg="bg-secondary-100 text-secondary-600"
                        value={summary.earlyCheckouts || 0}
                        label="Early Checkouts"
                    />
                </div>
            )}

            {/* Filter Section */}
            <div className="card mb-6">
                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">From Date</label>
                        <input
                            type="date"
                            value={dateFilter.fromDate}
                            onChange={(e) => setDateFilter(prev => ({ ...prev, fromDate: e.target.value }))}
                            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">To Date</label>
                        <input
                            type="date"
                            value={dateFilter.toDate}
                            onChange={(e) => setDateFilter(prev => ({ ...prev, toDate: e.target.value }))}
                            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                    <button
                        onClick={handleFilterApply}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                        Apply Filter
                    </button>
                    <button
                        onClick={handleFilterClear}
                        className="px-4 py-2 text-secondary-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Attendance History Table */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Attendance History</h3>
                    <span className="text-sm text-secondary-500">
                        Showing {history.records?.length || 0} of {history.pagination?.total || 0} records
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="text-left py-3 px-4 text-sm font-semibold text-secondary-600">Date</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-secondary-600">Check-In</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-secondary-600">Check-Out</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-secondary-600">Total Hours</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-secondary-600">Status</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-secondary-600">Note</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.records?.length > 0 ? (
                                history.records.map((record) => (
                                    <tr key={record._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                        <td className="py-3 px-4">
                                            <span className="font-medium text-secondary-800">
                                                {formatDate(record.date)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            {record.formattedCheckIn ? (
                                                <span className="text-success-600 font-medium">{record.formattedCheckIn}</span>
                                            ) : (
                                                <span className="text-secondary-400">--</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            {record.formattedCheckOut ? (
                                                <span className="text-danger-600 font-medium">{record.formattedCheckOut}</span>
                                            ) : (
                                                <span className="text-secondary-400">--</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            {record.totalWorkingHours > 0 ? (
                                                <span className={`font-medium ${record.totalWorkingHours >= 8 ? 'text-success-600' : 'text-warning-600'}`}>
                                                    {record.totalWorkingHours?.toFixed(2)} hrs
                                                </span>
                                            ) : (
                                                <span className="text-secondary-400">--</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            {getStatusBadge(record.status)}
                                        </td>
                                        <td className="py-3 px-4">
                                            {record.note ? (
                                                <span className="text-sm text-secondary-600 truncate max-w-xs block" title={record.note}>
                                                    {record.note.length > 30 ? `${record.note.substring(0, 30)}...` : record.note}
                                                </span>
                                            ) : (
                                                <span className="text-secondary-400">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-secondary-500">
                                        No attendance records found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {history.pagination?.pages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                        <span className="text-sm text-secondary-500">
                            Page {history.pagination.page} of {history.pagination.pages}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <FiChevronLeft size={20} />
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(history.pagination.pages, prev + 1))}
                                disabled={currentPage === history.pagination.pages}
                                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <FiChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Summary Charts */}
            {summary && summary.presentDays > 0 && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Attendance Rate Card */}
                    <div className="card">
                        <h3 className="card-title mb-4">Attendance Rate</h3>
                        <div className="flex items-center justify-center py-8">
                            <div className="relative w-40 h-40">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="80"
                                        cy="80"
                                        r="70"
                                        fill="none"
                                        stroke="#e2e8f0"
                                        strokeWidth="12"
                                    />
                                    <circle
                                        cx="80"
                                        cy="80"
                                        r="70"
                                        fill="none"
                                        stroke="#10b981"
                                        strokeWidth="12"
                                        strokeDasharray={`${(summary.presentDays / summary.totalRecords) * 440} 440`}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                        <span className="text-3xl font-bold text-secondary-800">
                                            {((summary.presentDays / summary.totalRecords) * 100).toFixed(0)}%
                                        </span>
                                        <p className="text-sm text-secondary-500">Present</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Working Hours Summary */}
                    <div className="card">
                        <h3 className="card-title mb-4">Working Hours Summary</h3>
                        <div className="space-y-4 py-4">
                            <div className="flex items-center justify-between">
                                <span className="text-secondary-600">Total Hours Worked</span>
                                <span className="text-lg font-semibold text-secondary-800">
                                    {summary.totalWorkingHours?.toFixed(1) || 0} hrs
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-secondary-600">Average Per Day</span>
                                <span className="text-lg font-semibold text-secondary-800">
                                    {summary.averageHoursPerDay?.toFixed(1) || 0} hrs
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-secondary-600">Full Days (8+ hrs)</span>
                                <span className="text-lg font-semibold text-success-600">
                                    {summary.presentDays - summary.earlyCheckouts || 0}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-secondary-600">Early Checkouts (&lt;8 hrs)</span>
                                <span className="text-lg font-semibold text-warning-600">
                                    {summary.earlyCheckouts || 0}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FacultyAttendanceSummary;
