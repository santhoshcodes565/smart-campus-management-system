import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import {
    FiArrowLeft, FiSearch, FiUsers, FiCheckCircle, FiXCircle,
    FiPercent, FiAward, FiClock
} from 'react-icons/fi';

const AdminExamResults = () => {
    const { id: examId } = useParams();
    const navigate = useNavigate();

    const [exam, setExam] = useState(null);
    const [attempts, setAttempts] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        fetchResults();
    }, [examId]);

    const fetchResults = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/admin/online-exams/${examId}/results`);
            if (response.data.success) {
                const { exam, attempts, stats } = response.data.data;
                setExam(exam);
                setAttempts(attempts || []);
                setStats(stats);
            }
        } catch (error) {
            console.error('Error fetching results:', error);
            toast.error('Failed to load exam results');
            navigate('/admin/online-exams');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status, percentage) => {
        if (status === 'in_progress') {
            return <span className="badge badge-warning">In Progress</span>;
        }
        if (status === 'submitted') {
            return <span className="badge badge-info">Pending Evaluation</span>;
        }
        if (status === 'evaluated') {
            const passed = parseFloat(percentage) >= 40;
            return (
                <span className={`badge ${passed ? 'badge-success' : 'badge-danger'}`}>
                    {passed ? 'PASS' : 'FAIL'}
                </span>
            );
        }
        return null;
    };

    // Filter attempts
    const filteredAttempts = attempts.filter(a => {
        const studentName = a.studentId?.userId?.name || '';
        const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || a.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return <SkeletonTable rows={5} />;
    }

    return (
        <div className="animate-fade-in">
            <Breadcrumb items={[
                { label: 'Dashboard', path: '/admin/dashboard' },
                { label: 'Online Exams', path: '/admin/online-exams' },
                { label: 'Results', path: `/admin/online-exams/${examId}/results`, isLast: true }
            ]} />

            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate('/admin/online-exams')}
                    className="p-2 rounded-lg hover:bg-gray-100"
                >
                    <FiArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">{exam?.name}</h1>
                    <p className="text-secondary-500">
                        {exam?.subjectId?.name} • By {exam?.facultyId?.userId?.name || 'Unknown'}
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                    <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
                        <div className="flex items-center gap-3">
                            <FiUsers className="text-blue-500" size={24} />
                            <div>
                                <p className="text-2xl font-bold text-blue-700">{stats.totalAttempts}</p>
                                <p className="text-xs text-blue-600">Total</p>
                            </div>
                        </div>
                    </div>
                    <div className="card bg-gradient-to-br from-green-50 to-green-100">
                        <div className="flex items-center gap-3">
                            <FiCheckCircle className="text-green-500" size={24} />
                            <div>
                                <p className="text-2xl font-bold text-green-700">{stats.submitted}</p>
                                <p className="text-xs text-green-600">Submitted</p>
                            </div>
                        </div>
                    </div>
                    <div className="card bg-gradient-to-br from-purple-50 to-purple-100">
                        <div className="flex items-center gap-3">
                            <FiPercent className="text-purple-500" size={24} />
                            <div>
                                <p className="text-2xl font-bold text-purple-700">{stats.avgScore}</p>
                                <p className="text-xs text-purple-600">Avg Score</p>
                            </div>
                        </div>
                    </div>
                    <div className="card bg-gradient-to-br from-amber-50 to-amber-100">
                        <div className="flex items-center gap-3">
                            <FiPercent className="text-amber-500" size={24} />
                            <div>
                                <p className="text-2xl font-bold text-amber-700">{stats.avgPercentage}%</p>
                                <p className="text-xs text-amber-600">Avg %</p>
                            </div>
                        </div>
                    </div>
                    <div className="card bg-gradient-to-br from-emerald-50 to-emerald-100">
                        <div className="flex items-center gap-3">
                            <FiAward className="text-emerald-500" size={24} />
                            <div>
                                <p className="text-2xl font-bold text-emerald-700">{stats.passCount}</p>
                                <p className="text-xs text-emerald-600">Passed</p>
                            </div>
                        </div>
                    </div>
                    <div className="card bg-gradient-to-br from-red-50 to-red-100">
                        <div className="flex items-center gap-3">
                            <FiXCircle className="text-red-500" size={24} />
                            <div>
                                <p className="text-2xl font-bold text-red-700">{stats.failCount}</p>
                                <p className="text-xs text-red-600">Failed</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Pass Rate */}
            {stats && stats.passRate && (
                <div className="card mb-6">
                    <div className="flex items-center justify-between">
                        <span className="text-secondary-600">Pass Rate</span>
                        <span className="text-2xl font-bold text-green-600">{stats.passRate}%</span>
                    </div>
                    <div className="mt-2 h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-green-500 transition-all duration-500"
                            style={{ width: `${stats.passRate}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="card mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                        <input
                            type="text"
                            placeholder="Search by student name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input pl-10"
                        />
                    </div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="input w-full md:w-48"
                    >
                        <option value="all">All Status</option>
                        <option value="in_progress">In Progress</option>
                        <option value="submitted">Pending Evaluation</option>
                        <option value="evaluated">Evaluated</option>
                    </select>
                </div>
            </div>

            {/* Results Table */}
            {filteredAttempts.length === 0 ? (
                <EmptyState
                    title="No attempts found"
                    description="No students have attempted this exam yet."
                />
            ) : (
                <div className="card overflow-hidden">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Started At</th>
                                    <th>Submitted At</th>
                                    <th>Score</th>
                                    <th>Percentage</th>
                                    <th>Grade</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAttempts.map((attempt) => (
                                    <tr key={attempt._id}>
                                        <td>
                                            <div>
                                                <p className="font-medium">{attempt.studentId?.userId?.name || 'Unknown'}</p>
                                                <p className="text-xs text-secondary-500">{attempt.studentId?.userId?.email}</p>
                                            </div>
                                        </td>
                                        <td className="text-sm">
                                            {new Date(attempt.startedAt).toLocaleString()}
                                        </td>
                                        <td className="text-sm">
                                            {attempt.submittedAt
                                                ? new Date(attempt.submittedAt).toLocaleString()
                                                : '-'
                                            }
                                        </td>
                                        <td className="font-semibold">
                                            {attempt.totalScore}/{attempt.maxScore}
                                        </td>
                                        <td>
                                            <span className={`font-semibold ${parseFloat(attempt.percentage) >= 40 ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                {attempt.percentage}%
                                            </span>
                                        </td>
                                        <td className="font-bold">{attempt.grade || '-'}</td>
                                        <td>{getStatusBadge(attempt.status, attempt.percentage)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminExamResults;
