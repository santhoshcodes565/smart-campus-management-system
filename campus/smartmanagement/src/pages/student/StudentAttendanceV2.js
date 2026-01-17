import React, { useState, useEffect } from 'react';
import { studentAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import { SkeletonCard } from '../../components/common/LoadingSpinner';
import {
    FiCheckCircle,
    FiXCircle,
    FiAlertCircle,
    FiBarChart2,
    FiTrendingUp,
    FiCalendar
} from 'react-icons/fi';

const StudentAttendanceV2 = () => {
    const [loading, setLoading] = useState(true);
    const [attendance, setAttendance] = useState([]);
    const [summary, setSummary] = useState(null);
    const [eligibility, setEligibility] = useState(null);
    const [activeTab, setActiveTab] = useState('subjects');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [attendanceRes, summaryRes, eligibilityRes] = await Promise.all([
                studentAPI.attendanceV2.getMyAttendance(),
                studentAPI.attendanceV2.getMyAttendanceSummary(),
                studentAPI.attendanceV2.checkEligibility()
            ]);

            if (attendanceRes.data.success) setAttendance(attendanceRes.data.data.attendance || []);
            if (summaryRes.data.success) setSummary(summaryRes.data.data);
            if (eligibilityRes.data.success) setEligibility(eligibilityRes.data.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'eligible':
                return <span className="badge badge-success"><FiCheckCircle size={12} /> Eligible</span>;
            case 'warning':
                return <span className="badge badge-warning"><FiAlertCircle size={12} /> Warning</span>;
            case 'critical':
                return <span className="badge badge-danger"><FiXCircle size={12} /> Critical</span>;
            default:
                return null;
        }
    };

    const getProgressColor = (percentage) => {
        if (percentage >= 75) return 'bg-green-500';
        if (percentage >= 60) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    if (loading) return <SkeletonCard />;

    return (
        <div className="animate-fade-in">
            <Breadcrumb />

            {/* Header */}
            <div className="card mb-6 border-l-4 border-l-primary-500">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-primary-100 text-primary-600">
                        <FiCalendar size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-secondary-800">My Attendance</h1>
                        <p className="text-sm text-secondary-500">View your subject-wise attendance and eligibility</p>
                    </div>
                </div>
            </div>

            {/* Overall Summary */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="card bg-gradient-to-br from-primary-500 to-primary-600 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-80">Overall Attendance</p>
                                <p className="text-3xl font-bold">{summary.percentage}%</p>
                            </div>
                            <FiBarChart2 size={32} className="opacity-50" />
                        </div>
                    </div>
                    <div className="card">
                        <p className="text-sm text-secondary-500">Total Classes</p>
                        <p className="text-2xl font-bold text-secondary-800">{summary.totalClasses}</p>
                    </div>
                    <div className="card">
                        <p className="text-sm text-secondary-500">Present</p>
                        <p className="text-2xl font-bold text-green-600">{summary.present}</p>
                    </div>
                    <div className="card">
                        <p className="text-sm text-secondary-500">Absent</p>
                        <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
                    </div>
                </div>
            )}

            {/* Eligibility Status */}
            {eligibility && (
                <div className={`card mb-6 ${eligibility.overallEligible
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}>
                    <div className="flex items-center gap-4">
                        {eligibility.overallEligible ? (
                            <FiCheckCircle size={32} className="text-green-600" />
                        ) : (
                            <FiXCircle size={32} className="text-red-600" />
                        )}
                        <div>
                            <h3 className={`font-semibold ${eligibility.overallEligible ? 'text-green-700' : 'text-red-700'}`}>
                                {eligibility.overallEligible ? 'Eligible for Exams' : 'Attendance Shortage'}
                            </h3>
                            <p className={`text-sm ${eligibility.overallEligible ? 'text-green-600' : 'text-red-600'}`}>
                                {eligibility.message}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
                <button
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'subjects' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-secondary-600'
                        }`}
                    onClick={() => setActiveTab('subjects')}
                >
                    Subject-wise
                </button>
                <button
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'eligibility' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-secondary-600'
                        }`}
                    onClick={() => setActiveTab('eligibility')}
                >
                    Exam Eligibility
                </button>
            </div>

            {activeTab === 'subjects' ? (
                /* Subject-wise Attendance */
                <div className="card">
                    <h3 className="font-semibold text-secondary-800 mb-4">Subject-wise Attendance</h3>

                    {attendance.length === 0 ? (
                        <p className="text-center py-8 text-secondary-500">No attendance records yet</p>
                    ) : (
                        <div className="space-y-4">
                            {attendance.map((item, idx) => (
                                <div key={idx} className="p-4 border rounded-xl hover:shadow-sm transition-all">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <h4 className="font-medium text-secondary-800">{item.subject.name}</h4>
                                            <p className="text-sm text-secondary-500">{item.subject.code}</p>
                                        </div>
                                        {getStatusBadge(item.status)}
                                    </div>

                                    <div className="flex items-center gap-4 mb-2">
                                        <span className="text-sm text-green-600">Present: {item.present}</span>
                                        <span className="text-sm text-red-600">Absent: {item.absent}</span>
                                        <span className="text-sm text-secondary-500">Total: {item.total}</span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${getProgressColor(item.percentage)} transition-all`}
                                                style={{ width: `${item.percentage}%` }}
                                            />
                                        </div>
                                        <span className={`font-bold ${item.percentage >= 75 ? 'text-green-600' :
                                                item.percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                                            }`}>
                                            {item.percentage}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* Eligibility Details */
                <div className="card">
                    <h3 className="font-semibold text-secondary-800 mb-4">Exam Eligibility by Subject</h3>

                    {eligibility?.subjects?.length === 0 ? (
                        <p className="text-center py-8 text-secondary-500">No subjects found</p>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Subject</th>
                                        <th>Attended</th>
                                        <th>Total</th>
                                        <th>Percentage</th>
                                        <th>Status</th>
                                        <th>Shortfall</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {eligibility?.subjects?.map((sub, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <p className="font-medium">{sub.subject}</p>
                                                <p className="text-xs text-secondary-500">{sub.subjectCode}</p>
                                            </td>
                                            <td className="text-green-600 font-medium">{sub.classesAttended}</td>
                                            <td>{sub.totalClasses}</td>
                                            <td>
                                                <span className={`font-bold ${sub.percentage >= 75 ? 'text-green-600' :
                                                        sub.percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                                                    }`}>
                                                    {sub.percentage}%
                                                </span>
                                            </td>
                                            <td>
                                                {sub.isEligible ? (
                                                    <span className="badge badge-success">Eligible</span>
                                                ) : (
                                                    <span className="badge badge-danger">Not Eligible</span>
                                                )}
                                            </td>
                                            <td>
                                                {sub.shortfall > 0 ? (
                                                    <span className="text-red-600">Need {sub.shortfall} more classes</span>
                                                ) : (
                                                    <span className="text-green-600">—</span>
                                                )}
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

export default StudentAttendanceV2;
