import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import StatCard from '../../components/common/StatCard';
import { SkeletonStats } from '../../components/common/LoadingSpinner';
import {
    FiUsers, FiLogIn, FiLogOut, FiXCircle, FiRefreshCw, FiSearch,
    FiFilter, FiClock
} from 'react-icons/fi';

const AdminFacultyAttendance = () => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState({
        date: '',
        summary: { total: 0, checkedIn: 0, checkedOut: 0, absent: 0 },
        faculty: []
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const fetchData = useCallback(async (showRefresh = false) => {
        try {
            if (showRefresh) setRefreshing(true);
            else setLoading(true);

            const response = await adminAPI.facultyAttendance.getToday();
            if (response.data.success) {
                setData(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching faculty attendance:', error);
            toast.error('Failed to fetch attendance data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        // Auto-refresh every 60 seconds
        const interval = setInterval(() => fetchData(true), 60000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleRefresh = () => {
        fetchData(true);
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'CHECKED_IN':
                return <span className="px-3 py-1 bg-success-50 text-success-600 rounded-full text-xs font-medium">Checked In</span>;
            case 'CHECKED_OUT':
                return <span className="px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-xs font-medium">Checked Out</span>;
            case 'ABSENT':
                return <span className="px-3 py-1 bg-danger-50 text-danger-600 rounded-full text-xs font-medium">Absent</span>;
            default:
                return <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">{status}</span>;
        }
    };

    const filteredFaculty = data.faculty.filter(f => {
        const matchesSearch = f.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.department?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || f.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const formatCurrentTime = () => {
        return new Date().toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            dateStyle: 'full',
            timeStyle: 'short'
        });
    };

    return (
        <div className="animate-fade-in">
            <Breadcrumb
                items={[
                    { label: 'Dashboard', path: '/admin/dashboard' },
                    { label: 'Faculty Attendance', path: '/admin/faculty-attendance', isLast: true }
                ]}
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Faculty Attendance</h1>
                    <p className="text-secondary-500 mt-1">Real-time attendance monitoring • {data.date}</p>
                </div>
                <div className="flex items-center gap-3 mt-4 md:mt-0">
                    <span className="text-sm text-secondary-500 flex items-center gap-2">
                        <FiClock size={14} />
                        {formatCurrentTime()}
                    </span>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                        <FiRefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {loading ? (
                <SkeletonStats />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <StatCard
                        icon={<FiUsers size={24} />}
                        iconBg="bg-primary-100 text-primary-600"
                        value={data.summary.total}
                        label="Total Faculty"
                    />
                    <StatCard
                        icon={<FiLogIn size={24} />}
                        iconBg="bg-success-50 text-success-500"
                        value={data.summary.checkedIn}
                        label="Currently Present"
                    />
                    <StatCard
                        icon={<FiLogOut size={24} />}
                        iconBg="bg-primary-50 text-primary-500"
                        value={data.summary.checkedOut}
                        label="Checked Out"
                    />
                    <StatCard
                        icon={<FiXCircle size={24} />}
                        iconBg="bg-danger-50 text-danger-500"
                        value={data.summary.absent}
                        label="Absent Today"
                    />
                </div>
            )}

            {/* Filters */}
            <div className="card mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Search */}
                    <div className="flex-1 min-w-64">
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by name or department..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                        <FiFilter className="text-secondary-400" size={18} />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                            <option value="ALL">All Status</option>
                            <option value="CHECKED_IN">Checked In</option>
                            <option value="CHECKED_OUT">Checked Out</option>
                            <option value="ABSENT">Absent</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Faculty Attendance Table */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Today's Faculty Attendance</h3>
                    <span className="text-sm text-secondary-500">
                        Showing {filteredFaculty.length} of {data.faculty.length} faculty
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="text-left py-3 px-4 text-sm font-semibold text-secondary-600">Faculty Name</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-secondary-600">Department</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-secondary-600">Check-In</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-secondary-600">Check-Out</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-secondary-600">Hours</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-secondary-600">Status</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-secondary-600">Note</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                                        <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                                        <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                                        <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                                        <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                                        <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                                        <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                                    </tr>
                                ))
                            ) : filteredFaculty.length > 0 ? (
                                filteredFaculty.map((faculty) => (
                                    <tr key={faculty.facultyId} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold">
                                                    {faculty.name?.charAt(0)?.toUpperCase() || 'F'}
                                                </div>
                                                <span className="font-medium text-secondary-800">{faculty.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-secondary-600">{faculty.department || '-'}</td>
                                        <td className="py-3 px-4">
                                            {faculty.formattedCheckIn ? (
                                                <span className="text-success-600 font-medium">{faculty.formattedCheckIn}</span>
                                            ) : (
                                                <span className="text-secondary-400">--</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            {faculty.formattedCheckOut ? (
                                                <span className="text-primary-600 font-medium">{faculty.formattedCheckOut}</span>
                                            ) : (
                                                <span className="text-secondary-400">--</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            {faculty.totalWorkingHours > 0 ? (
                                                <span className={`font-medium ${faculty.totalWorkingHours >= 8 ? 'text-success-600' : 'text-warning-600'}`}>
                                                    {faculty.totalWorkingHours.toFixed(2)}h
                                                </span>
                                            ) : (
                                                <span className="text-secondary-400">--</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            {getStatusBadge(faculty.status)}
                                        </td>
                                        <td className="py-3 px-4">
                                            {faculty.note ? (
                                                <span className="text-sm text-secondary-600 truncate max-w-xs block" title={faculty.note}>
                                                    {faculty.note.length > 25 ? `${faculty.note.substring(0, 25)}...` : faculty.note}
                                                </span>
                                            ) : (
                                                <span className="text-secondary-400">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-secondary-500">
                                        No faculty records found matching your filters
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Status Legend */}
            <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-secondary-600">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-success-500"></span>
                    <span>Checked In (Currently on campus)</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-primary-500"></span>
                    <span>Checked Out (Left for the day)</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-danger-500"></span>
                    <span>Absent (No check-in today)</span>
                </div>
            </div>
        </div>
    );
};

export default AdminFacultyAttendance;
