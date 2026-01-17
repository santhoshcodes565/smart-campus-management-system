import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import { SkeletonCard, SkeletonTable } from '../../components/common/LoadingSpinner';
import {
    FiBarChart2,
    FiUsers,
    FiAlertTriangle,
    FiTrendingUp,
    FiDownload,
    FiFilter,
    FiRefreshCw
} from 'react-icons/fi';

const AdminAttendanceAnalytics = () => {
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [lowAttendance, setLowAttendance] = useState([]);
    const [filters, setFilters] = useState({ departmentId: '', semester: '', threshold: 75 });
    const [activeTab, setActiveTab] = useState('overview');
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [dashRes, analyticsRes, lowRes] = await Promise.all([
                adminAPI.attendanceV2.getDashboard(filters),
                adminAPI.attendanceV2.getAnalytics(filters),
                adminAPI.attendanceV2.getLowAttendance({ threshold: filters.threshold })
            ]);

            if (dashRes.data.success) setDashboard(dashRes.data.data);
            if (analyticsRes.data.success) setAnalytics(analyticsRes.data.data);
            if (lowRes.data.success) setLowAttendance(lowRes.data.data.students || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const response = await adminAPI.attendanceV2.exportReport(filters);
            if (response.data.success) {
                const dataStr = JSON.stringify(response.data.data.data, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `attendance_report_${Date.now()}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success(`Exported ${response.data.data.count} records`);
            }
        } catch (error) {
            toast.error('Export failed');
        } finally {
            setExporting(false);
        }
    };

    const getStatusColor = (status) => {
        return status === 'critical' ? 'text-red-600 bg-red-50' : 'text-yellow-600 bg-yellow-50';
    };

    if (loading) return <SkeletonCard />;

    return (
        <div className="animate-fade-in">
            <Breadcrumb />

            {/* Header */}
            <div className="card mb-6 border-l-4 border-l-primary-500">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-primary-100 text-primary-600">
                            <FiBarChart2 size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-secondary-800">Attendance Analytics</h1>
                            <p className="text-sm text-secondary-500">Monitor attendance trends and identify at-risk students</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={fetchData} className="btn-secondary">
                            <FiRefreshCw size={16} /> Refresh
                        </button>
                        <button onClick={handleExport} className="btn-primary" disabled={exporting}>
                            <FiDownload size={16} /> {exporting ? 'Exporting...' : 'Export'}
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            {dashboard && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="card bg-gradient-to-br from-primary-500 to-primary-600 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-80">Overall Attendance</p>
                                <p className="text-3xl font-bold">{dashboard.overview.overallPercentage}%</p>
                            </div>
                            <FiTrendingUp size={32} className="opacity-50" />
                        </div>
                    </div>
                    <div className="card">
                        <p className="text-sm text-secondary-500">Total Records</p>
                        <p className="text-2xl font-bold text-secondary-800">{dashboard.overview.totalAttendanceRecords}</p>
                    </div>
                    <div className="card">
                        <p className="text-sm text-secondary-500">Total Present</p>
                        <p className="text-2xl font-bold text-green-600">{dashboard.overview.totalPresent}</p>
                    </div>
                    <div className="card bg-red-50">
                        <p className="text-sm text-red-500">Low Attendance Students</p>
                        <p className="text-2xl font-bold text-red-600">{lowAttendance.length}</p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
                {['overview', 'departments', 'low-attendance'].map(tab => (
                    <button
                        key={tab}
                        className={`px-4 py-2 rounded-lg font-medium capitalize transition-all ${activeTab === tab ? 'bg-primary-600 text-white' : 'bg-gray-100 text-secondary-600'
                            }`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab.replace('-', ' ')}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && analytics && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Semester Trend */}
                    <div className="card">
                        <h3 className="font-semibold text-secondary-800 mb-4">Semester-wise Attendance</h3>
                        <div className="space-y-3">
                            {analytics.semesterTrend.map(sem => (
                                <div key={sem.semester} className="flex items-center gap-3">
                                    <span className="w-20 text-sm text-secondary-600">Sem {sem.semester}</span>
                                    <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${sem.percentage >= 75 ? 'bg-green-500' : sem.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                            style={{ width: `${sem.percentage}%` }}
                                        />
                                    </div>
                                    <span className="w-16 text-right font-medium">{sem.percentage}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Subjects */}
                    <div className="card">
                        <h3 className="font-semibold text-secondary-800 mb-4">Top Subjects by Attendance</h3>
                        <div className="space-y-2">
                            {analytics.topSubjects.slice(0, 5).map((sub, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-secondary-800">{sub.subject}</p>
                                        <p className="text-xs text-secondary-500">{sub.code} • {sub.classes} classes</p>
                                    </div>
                                    <span className={`font-bold ${sub.percentage >= 75 ? 'text-green-600' : 'text-yellow-600'}`}>
                                        {sub.percentage}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'departments' && dashboard && (
                <div className="card">
                    <h3 className="font-semibold text-secondary-800 mb-4">Department-wise Attendance</h3>
                    {dashboard.departmentStats.length === 0 ? (
                        <p className="text-center py-8 text-secondary-500">No department data available</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {dashboard.departmentStats.map((dept, idx) => (
                                <div key={idx} className="p-4 border rounded-xl hover:shadow-sm transition-all">
                                    <h4 className="font-medium text-secondary-800 mb-2">{dept.department}</h4>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${dept.percentage >= 75 ? 'bg-green-500' : dept.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                style={{ width: `${dept.percentage}%` }}
                                            />
                                        </div>
                                        <span className="font-bold">{dept.percentage}%</span>
                                    </div>
                                    <p className="text-sm text-secondary-500">{dept.totalStudents} students</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'low-attendance' && (
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-secondary-800 flex items-center gap-2">
                            <FiAlertTriangle className="text-red-500" />
                            Students Below {filters.threshold}% Attendance
                        </h3>
                        <select
                            className="input w-40"
                            value={filters.threshold}
                            onChange={(e) => {
                                setFilters({ ...filters, threshold: parseInt(e.target.value) });
                                setTimeout(fetchData, 100);
                            }}
                        >
                            <option value="75">Below 75%</option>
                            <option value="60">Below 60%</option>
                            <option value="50">Below 50%</option>
                        </select>
                    </div>

                    {lowAttendance.length === 0 ? (
                        <div className="text-center py-12">
                            <FiUsers size={48} className="mx-auto text-green-500 mb-4" />
                            <p className="text-green-600 font-medium">All students have good attendance!</p>
                        </div>
                    ) : (
                        <div className="table-container max-h-96 overflow-y-auto">
                            <table className="table">
                                <thead className="sticky top-0 bg-white">
                                    <tr>
                                        <th>Student</th>
                                        <th>Roll No</th>
                                        <th>Department</th>
                                        <th>Semester</th>
                                        <th>Present</th>
                                        <th>Absent</th>
                                        <th>Percentage</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lowAttendance.map(student => (
                                        <tr key={student._id}>
                                            <td>
                                                <p className="font-medium">{student.name}</p>
                                                <p className="text-xs text-secondary-500">{student.email}</p>
                                            </td>
                                            <td>{student.rollNo}</td>
                                            <td>{student.department}</td>
                                            <td>Sem {student.semester}</td>
                                            <td className="text-green-600">{student.present}</td>
                                            <td className="text-red-600">{student.absent}</td>
                                            <td>
                                                <span className={`font-bold ${student.percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                                                    }`}>
                                                    {student.percentage}%
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(student.status)}`}>
                                                    {student.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminAttendanceAnalytics;
