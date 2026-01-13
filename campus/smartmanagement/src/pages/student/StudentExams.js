import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { studentAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import { FiClock, FiPlay, FiCheckCircle, FiCalendar, FiBook, FiAlertCircle } from 'react-icons/fi';

const StudentExams = () => {
    const navigate = useNavigate();
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('upcoming');

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        try {
            setLoading(true);
            const response = await studentAPI.getOnlineExams();
            if (response.data.success) {
                setExams(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching exams:', error);
            toast.error('Failed to fetch exams');
        } finally {
            setLoading(false);
        }
    };

    const categorizeExams = () => {
        const now = new Date();
        return {
            upcoming: exams.filter(e => e.isUpcoming && !e.attemptStatus),
            ongoing: exams.filter(e => e.isOngoing && (e.canAttempt || e.attemptStatus === 'in_progress')),
            completed: exams.filter(e => e.attemptStatus === 'submitted' || e.attemptStatus === 'evaluated' || (e.isExpired && !e.canAttempt))
        };
    };

    const categorized = categorizeExams();

    const getTimeRemaining = (endTime) => {
        const now = new Date();
        const end = new Date(endTime);
        const diff = end - now;

        if (diff <= 0) return 'Ended';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days}d ${hours % 24}h remaining`;
        }
        return `${hours}h ${minutes}m remaining`;
    };

    const handleStartExam = (exam) => {
        if (!exam.canAttempt) {
            toast.error('This exam is not available right now');
            return;
        }
        navigate(`/student/online-exams/${exam._id}`);
    };

    const ExamCard = ({ exam }) => {
        const statusConfig = {
            upcoming: { bg: 'bg-blue-50', border: 'border-blue-200', icon: FiCalendar, color: 'text-blue-600' },
            ongoing: { bg: 'bg-green-50', border: 'border-green-200', icon: FiPlay, color: 'text-green-600' },
            completed: { bg: 'bg-purple-50', border: 'border-purple-200', icon: FiCheckCircle, color: 'text-purple-600' }
        };

        const status = exam.isUpcoming ? 'upcoming' : exam.isOngoing ? 'ongoing' : 'completed';
        const config = statusConfig[status];

        return (
            <div className={`card ${config.bg} border ${config.border}`}>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-secondary-800">{exam.name}</h3>
                        <p className="text-sm text-secondary-500 flex items-center gap-1 mt-1">
                            <FiBook size={14} /> {exam.subjectId?.name || 'Subject'}
                        </p>
                    </div>
                    <span className={`badge ${config.color} ${config.bg}`}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                    <div>
                        <p className="text-xl font-bold text-secondary-800">{exam.duration}</p>
                        <p className="text-xs text-secondary-500">Minutes</p>
                    </div>
                    <div>
                        <p className="text-xl font-bold text-secondary-800">{exam.maxMarks}</p>
                        <p className="text-xs text-secondary-500">Marks</p>
                    </div>
                    <div>
                        <p className="text-xl font-bold text-secondary-800 capitalize">{exam.examMode}</p>
                        <p className="text-xs text-secondary-500">Type</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-secondary-600 mb-4">
                    <FiClock size={14} />
                    <span>
                        {new Date(exam.startTime).toLocaleDateString()} {new Date(exam.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' - '}
                        {new Date(exam.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

                {exam.isOngoing && !exam.attemptStatus && (
                    <div className="flex items-center gap-2 text-sm text-green-600 mb-4">
                        <FiAlertCircle size={14} />
                        <span>{getTimeRemaining(exam.endTime)}</span>
                    </div>
                )}

                {exam.attemptStatus && (
                    <div className="p-3 rounded-lg bg-white mb-4">
                        <p className="text-sm text-secondary-600">
                            Status: <span className="font-medium capitalize">{exam.attemptStatus}</span>
                        </p>
                    </div>
                )}

                <div className="flex gap-2">
                    {exam.canAttempt && (
                        <button
                            onClick={() => handleStartExam(exam)}
                            className="btn-primary flex-1"
                        >
                            <FiPlay size={16} /> {exam.attemptStatus === 'in_progress' ? 'Continue Exam' : 'Start Exam'}
                        </button>
                    )}
                    {!exam.canAttempt && exam.isUpcoming && (
                        <button className="btn-secondary flex-1" disabled>
                            <FiClock size={16} /> Not Started Yet
                        </button>
                    )}
                    {(exam.attemptStatus === 'submitted' || exam.attemptStatus === 'evaluated') && (
                        <button
                            onClick={() => navigate('/student/online-exams/results')}
                            className="btn-primary flex-1"
                        >
                            <FiCheckCircle size={16} /> View Results
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const tabs = [
        { key: 'upcoming', label: 'Upcoming', count: categorized.upcoming.length },
        { key: 'ongoing', label: 'Ongoing', count: categorized.ongoing.length },
        { key: 'completed', label: 'Completed', count: categorized.completed.length }
    ];

    return (
        <div className="animate-fade-in">
            <Breadcrumb items={[
                { label: 'Dashboard', path: '/student/dashboard' },
                { label: 'Online Exams', path: '/student/online-exams', isLast: true }
            ]} />

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-secondary-800">Online Exams</h1>
                <p className="text-secondary-500 mt-1">View and attempt your online examinations</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === tab.key
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-secondary-600 hover:bg-gray-200'
                            }`}
                    >
                        {tab.label} ({tab.count})
                    </button>
                ))}
            </div>

            {/* Exam Grid */}
            {loading ? (
                <SkeletonTable rows={3} />
            ) : categorized[activeTab].length === 0 ? (
                <EmptyState
                    icon={FiBook}
                    title={`No ${activeTab} exams`}
                    description={`You don't have any ${activeTab} exams right now`}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categorized[activeTab].map(exam => (
                        <ExamCard key={exam._id} exam={exam} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default StudentExams;
