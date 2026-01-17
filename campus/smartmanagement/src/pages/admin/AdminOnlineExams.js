import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import {
    FiEye, FiUsers, FiCheckCircle, FiClock, FiFileText,
    FiTrendingUp, FiPercent, FiAward, FiCalendar, FiSearch
} from 'react-icons/fi';

const AdminOnlineExams = () => {
    const navigate = useNavigate();
    const [exams, setExams] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [examsRes, analyticsRes] = await Promise.all([
                api.get('/admin/online-exams'),
                api.get('/admin/online-exams/analytics')
            ]);

            if (examsRes.data.success) {
                setExams(examsRes.data.data);
            }
            if (analyticsRes.data.success) {
                setAnalytics(analyticsRes.data.data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load exam data');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            draft: 'bg-gray-100 text-gray-600',
            published: 'bg-blue-100 text-blue-600',
            ongoing: 'bg-green-100 text-green-600',
            completed: 'bg-purple-100 text-purple-600',
            cancelled: 'bg-red-100 text-red-600'
        };
        return badges[status] || badges.draft;
    };

    const filteredExams = exams.filter(exam => {
        const matchesSearch = exam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exam.subjectId?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || exam.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="animate-fade-in">
            <Breadcrumb items={[
                { label: 'Dashboard', path: '/admin/dashboard' },
                { label: 'Online Exams', path: '/admin/online-exams', isLast: true }
            ]} />

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-secondary-800">Online Exam Monitoring</h1>
                <p className="text-secondary-500 mt-1">View and monitor all online examinations</p>
            </div>

            {/* Analytics Cards */}
            {analytics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-blue-500 text-white">
                                <FiFileText size={24} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-blue-700">{analytics.totalExams}</p>
                                <p className="text-sm text-blue-600">Total Exams</p>
                            </div>
                        </div>
                    </div>

                    <div className="card bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-green-500 text-white">
                                <FiCheckCircle size={24} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-green-700">{analytics.publishedExams}</p>
                                <p className="text-sm text-green-600">Published</p>
                            </div>
                        </div>
                    </div>

                    <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-purple-500 text-white">
                                <FiUsers size={24} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-purple-700">{analytics.totalAttempts}</p>
                                <p className="text-sm text-purple-600">Total Attempts</p>
                            </div>
                        </div>
                    </div>

                    <div className="card bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-amber-500 text-white">
                                <FiPercent size={24} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-amber-700">{analytics.avgPercentage}%</p>
                                <p className="text-sm text-amber-600">Avg Score</p>
                            </div>
                        </div>
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
                            placeholder="Search by exam or subject name..."
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
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
            </div>

            {/* Exams Table */}
            {loading ? (
                <SkeletonTable rows={5} />
            ) : filteredExams.length === 0 ? (
                <EmptyState
                    icon={FiFileText}
                    title="No exams found"
                    description="No online exams match your search criteria"
                />
            ) : (
                <div className="card overflow-hidden">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Exam Name</th>
                                    <th>Subject</th>
                                    <th>Faculty</th>
                                    <th>Questions</th>
                                    <th>Attempts</th>
                                    <th>Submitted</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredExams.map((exam) => (
                                    <tr key={exam._id}>
                                        <td>
                                            <div>
                                                <p className="font-medium">{exam.name}</p>
                                                <p className="text-xs text-secondary-500">
                                                    {exam.duration} mins • {exam.maxMarks} marks
                                                </p>
                                            </div>
                                        </td>
                                        <td>{exam.subjectId?.name || '-'}</td>
                                        <td>{exam.facultyId?.userId?.name || '-'}</td>
                                        <td className="text-center">{exam.questionCount || 0}</td>
                                        <td className="text-center">{exam.attemptCount || 0}</td>
                                        <td className="text-center">{exam.submittedCount || 0}</td>
                                        <td>
                                            <span className={`badge ${getStatusBadge(exam.status)}`}>
                                                {exam.status}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => navigate(`/admin/online-exams/${exam._id}/results`)}
                                                className="btn-icon bg-blue-50 text-blue-600 hover:bg-blue-100"
                                                title="View Results"
                                            >
                                                <FiEye size={16} />
                                            </button>
                                        </td>
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

export default AdminOnlineExams;
