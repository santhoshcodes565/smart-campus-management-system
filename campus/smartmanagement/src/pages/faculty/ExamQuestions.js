import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { facultyAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import { FiPlus, FiEdit2, FiTrash2, FiCheckCircle, FiList, FiArrowLeft } from 'react-icons/fi';

const ExamQuestions = () => {
    const { id: examId } = useParams();
    const navigate = useNavigate();
    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [totalMarks, setTotalMarks] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        questionType: 'mcq',
        questionText: '',
        options: ['', '', '', ''],
        correctAnswer: '',
        marks: 1,
        explanation: ''
    });

    useEffect(() => {
        fetchQuestions();
    }, [examId]);

    const fetchQuestions = async () => {
        try {
            setLoading(true);
            const response = await facultyAPI.getExamQuestions(examId);
            if (response.data.success) {
                setQuestions(response.data.data.questions);
                setTotalMarks(response.data.data.totalMarks);
            }
            // Also get exam details
            const examsRes = await facultyAPI.getOnlineExams();
            if (examsRes.data.success) {
                const examData = examsRes.data.data.find(e => e._id === examId);
                setExam(examData);
            }
        } catch (error) {
            console.error('Error fetching questions:', error);
            toast.error('Failed to fetch questions');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleOptionChange = (index, value) => {
        const newOptions = [...formData.options];
        newOptions[index] = value;
        setFormData(prev => ({ ...prev, options: newOptions }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.questionType === 'mcq' && !formData.correctAnswer) {
            toast.error('Please select the correct answer for MCQ');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                options: formData.questionType === 'mcq' ? formData.options.filter(o => o.trim()) : []
            };

            await facultyAPI.addExamQuestion(examId, payload);
            toast.success('Question added successfully');
            setShowModal(false);
            resetForm();
            fetchQuestions();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to add question');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (questionId) => {
        if (!window.confirm('Are you sure you want to delete this question?')) return;
        try {
            await facultyAPI.deleteExamQuestion(examId, questionId);
            toast.success('Question deleted');
            fetchQuestions();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to delete question');
        }
    };

    const resetForm = () => {
        setFormData({
            questionType: 'mcq',
            questionText: '',
            options: ['', '', '', ''],
            correctAnswer: '',
            marks: 1,
            explanation: ''
        });
    };

    return (
        <div className="animate-fade-in">
            <Breadcrumb items={[
                { label: 'Dashboard', path: '/faculty/dashboard' },
                { label: 'Online Exams', path: '/faculty/online-exams' },
                { label: 'Questions', path: `/faculty/online-exams/${examId}/questions`, isLast: true }
            ]} />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <button onClick={() => navigate('/faculty/online-exams')} className="btn-icon bg-gray-100">
                            <FiArrowLeft size={18} />
                        </button>
                        <h1 className="text-2xl font-bold text-secondary-800">
                            {exam?.name || 'Exam Questions'}
                        </h1>
                    </div>
                    <p className="text-secondary-500">
                        {exam?.subjectId?.name} • Total Marks: {totalMarks} • {questions.length} Questions
                    </p>
                </div>
                {exam?.status === 'draft' && (
                    <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary mt-4 md:mt-0">
                        <FiPlus size={18} /> Add Question
                    </button>
                )}
            </div>

            {/* Questions List */}
            {loading ? (
                <SkeletonTable rows={5} />
            ) : questions.length === 0 ? (
                <EmptyState
                    icon={FiList}
                    title="No questions added"
                    description="Add questions to this exam"
                    action={exam?.status === 'draft' ? { label: 'Add Question', onClick: () => setShowModal(true) } : null}
                />
            ) : (
                <div className="space-y-4">
                    {questions.map((question, index) => (
                        <div key={question._id} className="card">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm">
                                        {index + 1}
                                    </span>
                                    <span className={`badge ${question.questionType === 'mcq' ? 'badge-primary' : 'badge-warning'}`}>
                                        {question.questionType.toUpperCase()}
                                    </span>
                                    <span className="text-sm text-secondary-500">{question.marks} marks</span>
                                </div>
                                {exam?.status === 'draft' && (
                                    <button
                                        onClick={() => handleDelete(question._id)}
                                        className="btn-icon bg-danger-50 text-danger-600 hover:bg-danger-100"
                                    >
                                        <FiTrash2 size={16} />
                                    </button>
                                )}
                            </div>

                            <p className="text-secondary-800 font-medium mb-3">{question.questionText}</p>

                            {question.questionType === 'mcq' && question.options && (
                                <div className="grid grid-cols-2 gap-2">
                                    {question.options.map((option, optIndex) => (
                                        <div
                                            key={optIndex}
                                            className={`p-3 rounded-lg border ${option === question.correctAnswer
                                                    ? 'border-green-500 bg-green-50'
                                                    : 'border-gray-200 bg-gray-50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                {option === question.correctAnswer && (
                                                    <FiCheckCircle className="text-green-600" size={16} />
                                                )}
                                                <span className="text-sm">{option}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Add Question Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => { setShowModal(false); resetForm(); }}
                title="Add Question"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="label">Question Type</label>
                            <select name="questionType" value={formData.questionType} onChange={handleInputChange} className="input">
                                <option value="mcq">MCQ</option>
                                <option value="descriptive">Descriptive</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="label">Marks</label>
                            <input
                                type="number"
                                name="marks"
                                value={formData.marks}
                                onChange={handleInputChange}
                                className="input"
                                min="1"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="label">Question Text *</label>
                        <textarea
                            name="questionText"
                            value={formData.questionText}
                            onChange={handleInputChange}
                            className="input"
                            rows="3"
                            required
                            placeholder="Enter your question..."
                        />
                    </div>

                    {formData.questionType === 'mcq' && (
                        <>
                            <div className="form-group">
                                <label className="label">Options</label>
                                <div className="space-y-2">
                                    {formData.options.map((option, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="correctAnswer"
                                                value={option}
                                                checked={formData.correctAnswer === option && option !== ''}
                                                onChange={(e) => setFormData(prev => ({ ...prev, correctAnswer: e.target.value }))}
                                                disabled={!option.trim()}
                                            />
                                            <input
                                                type="text"
                                                value={option}
                                                onChange={(e) => handleOptionChange(index, e.target.value)}
                                                className="input flex-1"
                                                placeholder={`Option ${index + 1}`}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-secondary-500 mt-1">Select the radio button for the correct answer</p>
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label className="label">Explanation (Optional)</label>
                        <textarea
                            name="explanation"
                            value={formData.explanation}
                            onChange={handleInputChange}
                            className="input"
                            rows="2"
                            placeholder="Explanation shown after submission..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? 'Adding...' : 'Add Question'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ExamQuestions;
