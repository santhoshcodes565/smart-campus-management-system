import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { studentAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import { FiCheckCircle, FiXCircle, FiClock, FiAward, FiTrendingUp, FiCalendar } from 'react-icons/fi';

const StudentResults = () => {
    const navigate = useNavigate();
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchResults();
    }, []);

    const fetchResults = async () => {
        try {
            setLoading(true);
            const response = await studentAPI.getOnlineExamResults();
            if (response.data.success) {
                setResults(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching results:', error);
            toast.error('Failed to load results');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (result) => {
        if (result.status === 'evaluated') {
            const passed = parseFloat(result.percentage) >= 40;
            return (
                <span className={`badge ${passed ? 'badge-success' : 'badge-danger'}`}>
                    {passed ? 'PASS' : 'FAIL'}
                </span>
            );
        }
        return <span className="badge badge-warning">Pending Evaluation</span>;
    };

    const getGradeColor = (grade) => {
        const colors = {
            'A+': 'text-green-600',
            'A': 'text-green-500',
            'B+': 'text-blue-600',
            'B': 'text-blue-500',
            'C+': 'text-yellow-600',
            'C': 'text-yellow-500',
            'D': 'text-orange-500',
            'F': 'text-red-600'
        };
        return colors[grade] || 'text-gray-600';
    };

    // Filter results
    const filteredResults = results.filter(r => {
        if (filter === 'all') return true;
        if (filter === 'passed') return r.status === 'evaluated' && parseFloat(r.percentage) >= 40;
        if (filter === 'failed') return r.status === 'evaluated' && parseFloat(r.percentage) < 40;
        if (filter === 'pending') return r.status === 'submitted';
        return true;
    });

    // Calculate statistics
    const evaluatedResults = results.filter(r => r.status === 'evaluated');
    const avgPercentage = evaluatedResults.length > 0
        ? (evaluatedResults.reduce((sum, r) => sum + parseFloat(r.percentage), 0) / evaluatedResults.length).toFixed(1)
        : 0;
    const passedCount = evaluatedResults.filter(r => parseFloat(r.percentage) >= 40).length;

    return (
        <div className="animate-fade-in">
            <Breadcrumb />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">My Exam Results</h1>
                    <p className="text-secondary-500 mt-1">
                        View your online exam scores and performance
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-blue-500 text-white">
                            <FiCalendar size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-blue-700">{results.length}</p>
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
                            <p className="text-2xl font-bold text-green-700">{passedCount}</p>
                            <p className="text-sm text-green-600">Passed</p>
                        </div>
                    </div>
                </div>

                <div className="card bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-red-500 text-white">
                            <FiXCircle size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-red-700">{evaluatedResults.length - passedCount}</p>
                            <p className="text-sm text-red-600">Failed</p>
                        </div>
                    </div>
                </div>

                <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-purple-500 text-white">
                            <FiTrendingUp size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-purple-700">{avgPercentage}%</p>
                            <p className="text-sm text-purple-600">Average Score</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter */}
            <div className="card mb-6">
                <div className="flex gap-2 flex-wrap">
                    {['all', 'passed', 'failed', 'pending'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${filter === f
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-gray-100 text-secondary-600 hover:bg-gray-200'
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results List */}
            {loading ? (
                <SkeletonTable rows={5} />
            ) : filteredResults.length === 0 ? (
                <EmptyState
                    title="No results found"
                    description="You haven't completed any exams yet or no results match your filter."
                    action={() => navigate('/student/online-exams')}
                    actionLabel="View Available Exams"
                />
            ) : (
                <div className="space-y-4">
                    {filteredResults.map((result) => (
                        <div key={result._id} className="card hover:shadow-lg transition-shadow">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-bold text-lg text-secondary-800">
                                            {result.examId?.name || 'Exam'}
                                        </h3>
                                        {getStatusBadge(result)}
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-sm text-secondary-500">
                                        <span className="flex items-center gap-1">
                                            <FiCalendar size={14} />
                                            {result.examId?.subjectId?.name || 'Subject'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <FiClock size={14} />
                                            {new Date(result.submittedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-primary-600">
                                            {result.totalScore}/{result.maxScore}
                                        </p>
                                        <p className="text-xs text-secondary-500">Marks</p>
                                    </div>
                                    <div className="text-center">
                                        <p className={`text-3xl font-bold ${parseFloat(result.percentage) >= 40 ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                            {result.percentage}%
                                        </p>
                                        <p className="text-xs text-secondary-500">Percentage</p>
                                    </div>
                                    {result.grade && (
                                        <div className="text-center">
                                            <p className={`text-3xl font-bold ${getGradeColor(result.grade)}`}>
                                                {result.grade}
                                            </p>
                                            <p className="text-xs text-secondary-500">Grade</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {result.autoSubmitted && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                                        ⚠️ Auto-submitted due to time limit
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StudentResults;
