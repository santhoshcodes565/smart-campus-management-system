import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { facultyAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import {
    FiCheckCircle, FiXCircle, FiEdit3, FiArrowLeft, FiSearch,
    FiUsers, FiPercent, FiAward, FiClock, FiSave
} from 'react-icons/fi';

const FacultyExamResults = () => {
    const { id: examId } = useParams();
    const navigate = useNavigate();

    const [exam, setExam] = useState(null);
    const [attempts, setAttempts] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    // Evaluation modal state
    const [showEvalModal, setShowEvalModal] = useState(false);
    const [selectedAttempt, setSelectedAttempt] = useState(null);
    const [evaluations, setEvaluations] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchResults();
    }, [examId]);

    const fetchResults = async () => {
        try {
            setLoading(true);
            const response = await facultyAPI.getExamResults(examId);
            if (response.data.success) {
                const { exam, attempts, stats } = response.data.data;
                setExam(exam);
                setAttempts(attempts || []);
                setStats(stats);
            }
        } catch (error) {
            console.error('Error fetching results:', error);
            toast.error('Failed to load exam results');
            navigate('/faculty/online-exams');
        } finally {
            setLoading(false);
        }
    };

    const handleEvaluate = (attempt) => {
        setSelectedAttempt(attempt);
        // Initialize evaluations from attempt answers
        const initialEvals = attempt.answers
            .filter(a => !a.evaluated)
            .map(a => ({
                questionId: a.questionId,
                marksObtained: a.marksObtained || 0,
                feedback: a.feedback || ''
            }));
        setEvaluations(initialEvals);
        setShowEvalModal(true);
    };

    const handleEvalChange = (questionId, field, value) => {
        setEvaluations(prev => prev.map(e =>
            e.questionId === questionId
                ? { ...e, [field]: field === 'marksObtained' ? parseFloat(value) || 0 : value }
                : e
        ));
    };

    const handleSaveEvaluation = async () => {
        setIsSaving(true);
        try {
            await facultyAPI.evaluateExam(examId, {
                attemptId: selectedAttempt._id,
                evaluations
            });
            toast.success('Evaluation saved successfully');
            setShowEvalModal(false);
            fetchResults();
        } catch (error) {
            toast.error('Failed to save evaluation');
        } finally {
            setIsSaving(false);
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
            <Breadcrumb />

            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate('/faculty/online-exams')}
                    className="p-2 rounded-lg hover:bg-gray-100"
                >
                    <FiArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">{exam?.name}</h1>
                    <p className="text-secondary-500">{exam?.subjectId?.name} - Exam Results</p>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
                        <div className="flex items-center gap-3">
                            <FiUsers className="text-blue-500" size={24} />
                            <div>
                                <p className="text-2xl font-bold text-blue-700">{stats.totalAttempts}</p>
                                <p className="text-xs text-blue-600">Total Attempts</p>
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
                                <th>Actions</th>
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
                                    <td>
                                        {attempt.status === 'submitted' && (
                                            <button
                                                onClick={() => handleEvaluate(attempt)}
                                                className="btn-primary btn-sm"
                                            >
                                                <FiEdit3 size={14} /> Evaluate
                                            </button>
                                        )}
                                        {attempt.autoSubmitted && (
                                            <span className="text-xs text-amber-600">Auto-submitted</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Evaluation Modal */}
            <Modal
                isOpen={showEvalModal}
                onClose={() => setShowEvalModal(false)}
                title="Evaluate Descriptive Answers"
                size="lg"
            >
                {selectedAttempt && (
                    <div className="space-y-4">
                        <div className="text-sm text-secondary-600 mb-4">
                            <strong>Student:</strong> {selectedAttempt.studentId?.userId?.name}
                        </div>

                        {selectedAttempt.answers.filter(a => !a.evaluated).length === 0 ? (
                            <div className="text-center py-8">
                                <FiCheckCircle className="mx-auto text-green-500 mb-2" size={48} />
                                <p className="text-secondary-600">All answers have been evaluated!</p>
                            </div>
                        ) : (
                            <div className="space-y-6 max-h-96 overflow-y-auto">
                                {selectedAttempt.answers.filter(a => !a.evaluated).map((answer, idx) => (
                                    <div key={answer.questionId} className="p-4 rounded-lg bg-gray-50">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="badge badge-warning">Q{idx + 1}</span>
                                            <span className="text-sm text-secondary-500">
                                                Max: {answer.maxMarks || 5} marks
                                            </span>
                                        </div>

                                        <p className="text-sm text-secondary-700 mb-3">
                                            <strong>Answer:</strong> {answer.answer || 'No answer provided'}
                                        </p>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="label">Marks</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    className="input"
                                                    value={evaluations.find(e => e.questionId === answer.questionId)?.marksObtained || 0}
                                                    onChange={(e) => handleEvalChange(answer.questionId, 'marksObtained', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="label">Feedback (Optional)</label>
                                                <input
                                                    type="text"
                                                    className="input"
                                                    placeholder="Add feedback..."
                                                    value={evaluations.find(e => e.questionId === answer.questionId)?.feedback || ''}
                                                    onChange={(e) => handleEvalChange(answer.questionId, 'feedback', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <button onClick={() => setShowEvalModal(false)} className="btn-secondary">
                                Cancel
                            </button>
                            <button onClick={handleSaveEvaluation} className="btn-primary" disabled={isSaving}>
                                <FiSave size={16} />
                                {isSaving ? 'Saving...' : 'Save Evaluation'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default FacultyExamResults;
