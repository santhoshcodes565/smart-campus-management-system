import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { studentAPI } from '../../services/api';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import { FiClock, FiChevronLeft, FiChevronRight, FiSend, FiAlertTriangle, FiCheckCircle, FiAlertCircle, FiSave } from 'react-icons/fi';

const TakeExam = () => {
    const { id: examId } = useParams();
    const navigate = useNavigate();

    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [attempt, setAttempt] = useState(null);
    const [answers, setAnswers] = useState({});
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [examStarted, setExamStarted] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showTimeWarning, setShowTimeWarning] = useState(false);
    const [tabVisible, setTabVisible] = useState(true);

    const answersRef = useRef(answers);
    const examStartedRef = useRef(examStarted);

    // Update refs when state changes
    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    useEffect(() => {
        examStartedRef.current = examStarted;
    }, [examStarted]);

    // Fetch exam data
    useEffect(() => {
        fetchExamData();
    }, [examId]);

    // Timer countdown
    useEffect(() => {
        if (!examStarted || timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleAutoSubmit();
                    return 0;
                }
                // Show warning at 5 minutes
                if (prev === 300 && !showTimeWarning) {
                    setShowTimeWarning(true);
                    toast.warning('Only 5 minutes remaining!', { autoClose: 5000 });
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [examStarted, timeLeft]);

    // Auto-save every 10 seconds
    useEffect(() => {
        if (!examStarted) return;

        const autoSaveInterval = setInterval(async () => {
            if (Object.keys(answersRef.current).length > 0) {
                await saveProgress();
            }
        }, 10000);

        return () => clearInterval(autoSaveInterval);
    }, [examStarted]);

    // Prevent navigation and tab close
    useEffect(() => {
        if (!examStarted) return;

        const handleBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = 'You have an exam in progress. Are you sure you want to leave?';
            return e.returnValue;
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                setTabVisible(false);
                toast.warning('Tab switching detected! Stay focused on the exam.', { autoClose: 3000 });
            } else {
                setTabVisible(true);
            }
        };

        // Prevent back button
        window.history.pushState(null, '', window.location.pathname);
        const handlePopState = (e) => {
            window.history.pushState(null, '', window.location.pathname);
            toast.warning('Navigation is disabled during the exam');
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('popstate', handlePopState);
        };
    }, [examStarted]);

    const fetchExamData = async () => {
        try {
            setLoading(true);
            const response = await studentAPI.getExamForAttempt(examId);
            if (response.data.success) {
                const { exam, questions, attempt, serverTime } = response.data.data;
                setExam(exam);
                setQuestions(questions);

                if (attempt) {
                    setAttempt(attempt);
                    if (attempt.status === 'in_progress') {
                        setExamStarted(true);
                        const endTime = new Date(exam.endTime).getTime();
                        const now = new Date(serverTime).getTime();
                        const maxDuration = exam.duration * 60;
                        const elapsedSinceStart = Math.floor((now - new Date(attempt.startedAt).getTime()) / 1000);
                        const remaining = Math.min(maxDuration - elapsedSinceStart, Math.floor((endTime - now) / 1000));
                        setTimeLeft(Math.max(0, remaining));

                        // Restore previous answers
                        const savedAnswers = {};
                        attempt.answers?.forEach(a => {
                            savedAnswers[a.questionId] = a.answer;
                        });
                        setAnswers(savedAnswers);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching exam:', error);
            toast.error(error.response?.data?.error || 'Failed to load exam');
            navigate('/student/online-exams');
        } finally {
            setLoading(false);
        }
    };

    const handleStartExam = async () => {
        try {
            const response = await studentAPI.startExam(examId);
            if (response.data.success) {
                const { attempt, duration } = response.data.data;
                setAttempt(attempt);
                setExamStarted(true);
                setTimeLeft(duration * 60);
                toast.success('Exam started! Good luck!');
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to start exam');
        }
    };

    const handleAnswerChange = (questionId, answer) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
    };

    const saveProgress = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            // Just update local storage as backup - actual save happens on submit
            localStorage.setItem(`exam_${examId}_answers`, JSON.stringify(answersRef.current));
            setLastSaved(new Date());
        } catch (error) {
            console.error('Auto-save failed:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAutoSubmit = useCallback(async () => {
        toast.info('Time is up! Auto-submitting your exam...', { autoClose: 3000 });
        await submitExam(true);
    }, []);

    const submitExam = async (autoSubmitted = false) => {
        setSubmitting(true);
        try {
            const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
                questionId,
                answer
            }));

            const response = await studentAPI.submitExam(examId, {
                answers: formattedAnswers,
                autoSubmitted
            });

            if (response.data.success) {
                // Clear local storage backup
                localStorage.removeItem(`exam_${examId}_answers`);

                const { totalScore, maxScore, percentage, grade } = response.data.data;
                toast.success(`Exam submitted! Score: ${totalScore}/${maxScore} (${percentage}%)`);
                navigate('/student/online-exams/results');
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to submit exam');
        } finally {
            setSubmitting(false);
            setShowConfirmModal(false);
        }
    };

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getAnsweredCount = () => {
        return questions.filter(q => answers[q._id] && answers[q._id].toString().trim()).length;
    };

    if (loading) {
        return <SkeletonTable rows={5} />;
    }

    if (!examStarted) {
        return (
            <div className="max-w-2xl mx-auto mt-12">
                <div className="card text-center">
                    <h1 className="text-2xl font-bold text-secondary-800 mb-4">{exam?.name}</h1>
                    <p className="text-secondary-600 mb-6">{exam?.subjectId?.name}</p>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="p-4 rounded-lg bg-blue-50">
                            <p className="text-2xl font-bold text-blue-600">{exam?.duration}</p>
                            <p className="text-sm text-secondary-500">Minutes</p>
                        </div>
                        <div className="p-4 rounded-lg bg-green-50">
                            <p className="text-2xl font-bold text-green-600">{questions.length}</p>
                            <p className="text-sm text-secondary-500">Questions</p>
                        </div>
                        <div className="p-4 rounded-lg bg-purple-50">
                            <p className="text-2xl font-bold text-purple-600">{exam?.maxMarks}</p>
                            <p className="text-sm text-secondary-500">Marks</p>
                        </div>
                    </div>

                    {/* Security Notice */}
                    <div className="p-4 rounded-lg bg-red-50 border border-red-200 mb-4 text-left">
                        <h3 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                            <FiAlertCircle /> Exam Security Rules
                        </h3>
                        <ul className="text-sm text-red-700 space-y-1">
                            <li>• Tab switching will be monitored</li>
                            <li>• Navigation is disabled during exam</li>
                            <li>• Answers auto-save every 10 seconds</li>
                            <li>• Exam auto-submits when time expires</li>
                        </ul>
                    </div>

                    {exam?.instructions && (
                        <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 mb-6 text-left">
                            <h3 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
                                <FiAlertTriangle /> Instructions
                            </h3>
                            <p className="text-sm text-yellow-700 whitespace-pre-wrap">{exam.instructions}</p>
                        </div>
                    )}

                    <button onClick={handleStartExam} className="btn-primary text-lg py-3 px-8">
                        <FiClock size={20} /> Start Exam
                    </button>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentQuestion];

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Tab Warning Banner */}
            {!tabVisible && (
                <div className="fixed top-0 left-0 right-0 bg-red-600 text-white py-2 px-4 text-center z-50 animate-pulse">
                    <FiAlertTriangle className="inline mr-2" />
                    Tab switching detected! Focus on your exam.
                </div>
            )}

            {/* Time Warning Banner */}
            {showTimeWarning && timeLeft > 0 && timeLeft <= 300 && (
                <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white py-2 px-4 text-center z-40">
                    <FiClock className="inline mr-2" />
                    Less than 5 minutes remaining! Submit your exam soon.
                </div>
            )}

            {/* Header with Timer */}
            <div className={`sticky ${!tabVisible ? 'top-10' : showTimeWarning && timeLeft <= 300 ? 'top-10' : 'top-0'} bg-white shadow-md z-30 px-4 py-3`}>
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold text-secondary-800">{exam?.name}</h1>
                        <p className="text-sm text-secondary-500">Question {currentQuestion + 1} of {questions.length}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {lastSaved && (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                                <FiSave size={12} /> Saved {lastSaved.toLocaleTimeString()}
                            </span>
                        )}
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold ${timeLeft < 300 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-green-100 text-green-600'
                            }`}>
                            <FiClock size={20} />
                            {formatTime(timeLeft)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* Question Navigation */}
                <div className="card mb-6">
                    <p className="text-sm text-secondary-500 mb-3">Question Navigation</p>
                    <div className="flex flex-wrap gap-2">
                        {questions.map((q, idx) => (
                            <button
                                key={q._id}
                                onClick={() => setCurrentQuestion(idx)}
                                className={`w-10 h-10 rounded-lg font-medium text-sm transition-colors ${idx === currentQuestion
                                        ? 'bg-primary-600 text-white'
                                        : answers[q._id]
                                            ? 'bg-green-100 text-green-700 border-2 border-green-400'
                                            : 'bg-gray-100 text-secondary-600 hover:bg-gray-200'
                                    }`}
                            >
                                {idx + 1}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-sm">
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded bg-green-400"></span> Answered ({getAnsweredCount()})
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded bg-gray-300"></span> Unanswered ({questions.length - getAnsweredCount()})
                        </span>
                    </div>
                </div>

                {/* Current Question */}
                {currentQ && (
                    <div className="card mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <span className={`badge ${currentQ.questionType === 'mcq' ? 'badge-primary' : 'badge-warning'}`}>
                                {currentQ.questionType.toUpperCase()}
                            </span>
                            <span className="text-sm text-secondary-500">{currentQ.marks} mark(s)</span>
                        </div>

                        <p className="text-lg text-secondary-800 font-medium mb-6">{currentQ.questionText}</p>

                        {currentQ.questionType === 'mcq' ? (
                            <div className="space-y-3">
                                {currentQ.options.map((option, idx) => (
                                    <label
                                        key={idx}
                                        className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-colors ${answers[currentQ._id] === option
                                                ? 'border-primary-500 bg-primary-50'
                                                : 'border-gray-200 hover:border-gray-300 bg-white'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name={`question-${currentQ._id}`}
                                            value={option}
                                            checked={answers[currentQ._id] === option}
                                            onChange={() => handleAnswerChange(currentQ._id, option)}
                                            className="mr-3"
                                        />
                                        <span>{option}</span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <textarea
                                value={answers[currentQ._id] || ''}
                                onChange={(e) => handleAnswerChange(currentQ._id, e.target.value)}
                                className="input"
                                rows="6"
                                placeholder="Type your answer here..."
                            />
                        )}
                    </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                        disabled={currentQuestion === 0}
                        className="btn-secondary"
                    >
                        <FiChevronLeft size={18} /> Previous
                    </button>

                    {currentQuestion < questions.length - 1 ? (
                        <button
                            onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
                            className="btn-primary"
                        >
                            Next <FiChevronRight size={18} />
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowConfirmModal(true)}
                            className="btn-success"
                        >
                            <FiSend size={18} /> Submit Exam
                        </button>
                    )}
                </div>
            </div>

            {/* Submit Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                        <h2 className="text-xl font-bold text-secondary-800 mb-4">Submit Exam?</h2>
                        <p className="text-secondary-600 mb-4">
                            You have answered <strong>{getAnsweredCount()}</strong> out of <strong>{questions.length}</strong> questions.
                        </p>
                        {getAnsweredCount() < questions.length && (
                            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 mb-4">
                                <p className="text-sm text-yellow-700 flex items-center gap-2">
                                    <FiAlertTriangle /> Some questions are unanswered
                                </p>
                            </div>
                        )}
                        <p className="text-sm text-secondary-500 mb-4">
                            Time remaining: <strong className={timeLeft < 300 ? 'text-red-600' : 'text-green-600'}>{formatTime(timeLeft)}</strong>
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="btn-secondary flex-1"
                                disabled={submitting}
                            >
                                Continue Exam
                            </button>
                            <button
                                onClick={() => submitExam(false)}
                                className="btn-primary flex-1"
                                disabled={submitting}
                            >
                                {submitting ? 'Submitting...' : 'Submit Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TakeExam;

