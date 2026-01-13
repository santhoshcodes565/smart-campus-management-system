import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { facultyAPI, adminAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiList, FiUsers, FiClock, FiCheckCircle, FiSend } from 'react-icons/fi';

const FacultyExams = () => {
    const navigate = useNavigate();
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [subjects, setSubjects] = useState([]);
    const [courses, setCourses] = useState([]);
    const [departments, setDepartments] = useState([]);

    const [formData, setFormData] = useState({
        name: '',
        subjectId: '',
        courseId: '',
        classId: '',
        semester: 1,
        examMode: 'mcq',
        duration: 60,
        maxMarks: 100,
        startTime: '',
        endTime: '',
        instructions: ''
    });

    useEffect(() => {
        fetchExams();
        fetchDropdownData();
    }, []);

    const fetchExams = async () => {
        try {
            setLoading(true);
            const response = await facultyAPI.getOnlineExams();
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

    const fetchDropdownData = async () => {
        try {
            const [subjectsRes, coursesRes, deptRes] = await Promise.all([
                adminAPI.getSubjects(),
                adminAPI.getCourses(),
                adminAPI.getDepartments()
            ]);
            if (subjectsRes.data.success) setSubjects(subjectsRes.data.data);
            if (coursesRes.data.success) setCourses(coursesRes.data.data);
            if (deptRes.data.success) setDepartments(deptRes.data.data);
        } catch (error) {
            console.error('Error fetching dropdown data:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (isEditing) {
                await facultyAPI.updateOnlineExam(formData._id, formData);
                toast.success('Exam updated successfully');
            } else {
                await facultyAPI.createOnlineExam(formData);
                toast.success('Exam created successfully');
            }
            setShowModal(false);
            resetForm();
            fetchExams();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to save exam');
        } finally {
            setSaving(false);
        }
    };

    const handlePublish = async (examId) => {
        if (!window.confirm('Are you sure you want to publish this exam? Students will be able to see it.')) return;
        try {
            await facultyAPI.publishOnlineExam(examId);
            toast.success('Exam published successfully');
            fetchExams();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to publish exam');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            subjectId: '',
            courseId: '',
            classId: '',
            semester: 1,
            examMode: 'mcq',
            duration: 60,
            maxMarks: 100,
            startTime: '',
            endTime: '',
            instructions: ''
        });
        setIsEditing(false);
    };

    const openEditModal = (exam) => {
        setFormData({
            ...exam,
            subjectId: exam.subjectId?._id || exam.subjectId,
            courseId: exam.courseId?._id || exam.courseId,
            startTime: exam.startTime ? new Date(exam.startTime).toISOString().slice(0, 16) : '',
            endTime: exam.endTime ? new Date(exam.endTime).toISOString().slice(0, 16) : ''
        });
        setIsEditing(true);
        setShowModal(true);
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

    return (
        <div className="animate-fade-in">
            <Breadcrumb items={[
                { label: 'Dashboard', path: '/faculty/dashboard' },
                { label: 'Online Exams', path: '/faculty/online-exams', isLast: true }
            ]} />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Online Exams</h1>
                    <p className="text-secondary-500 mt-1">Create and manage online examinations</p>
                </div>
                <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary mt-4 md:mt-0">
                    <FiPlus size={18} /> Create Exam
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="card text-center">
                    <p className="text-3xl font-bold text-secondary-800">{exams.length}</p>
                    <p className="text-sm text-secondary-500">Total Exams</p>
                </div>
                <div className="card text-center">
                    <p className="text-3xl font-bold text-blue-600">{exams.filter(e => e.status === 'published').length}</p>
                    <p className="text-sm text-secondary-500">Published</p>
                </div>
                <div className="card text-center">
                    <p className="text-3xl font-bold text-green-600">{exams.filter(e => e.status === 'ongoing').length}</p>
                    <p className="text-sm text-secondary-500">Ongoing</p>
                </div>
                <div className="card text-center">
                    <p className="text-3xl font-bold text-purple-600">{exams.filter(e => e.status === 'completed').length}</p>
                    <p className="text-sm text-secondary-500">Completed</p>
                </div>
            </div>

            {/* Exams Table */}
            {loading ? (
                <SkeletonTable rows={5} />
            ) : exams.length === 0 ? (
                <EmptyState
                    icon={FiList}
                    title="No exams found"
                    description="Create your first online exam to get started"
                    action={{ label: 'Create Exam', onClick: () => setShowModal(true) }}
                />
            ) : (
                <div className="card overflow-hidden">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Exam Name</th>
                                    <th>Subject</th>
                                    <th>Mode</th>
                                    <th>Duration</th>
                                    <th>Questions</th>
                                    <th>Attempts</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {exams.map((exam) => (
                                    <tr key={exam._id}>
                                        <td className="font-medium">{exam.name}</td>
                                        <td>{exam.subjectId?.name || '-'}</td>
                                        <td className="capitalize">{exam.examMode}</td>
                                        <td>{exam.duration} mins</td>
                                        <td>{exam.questionCount || 0}</td>
                                        <td>{exam.attemptCount || 0}</td>
                                        <td>
                                            <span className={`badge ${getStatusBadge(exam.status)}`}>
                                                {exam.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => navigate(`/faculty/online-exams/${exam._id}/questions`)}
                                                    className="btn-icon bg-blue-50 text-blue-600 hover:bg-blue-100"
                                                    title="Manage Questions"
                                                >
                                                    <FiList size={16} />
                                                </button>
                                                {exam.status === 'draft' && (
                                                    <>
                                                        <button
                                                            onClick={() => openEditModal(exam)}
                                                            className="btn-icon bg-gray-100 text-secondary-600 hover:bg-gray-200"
                                                            title="Edit"
                                                        >
                                                            <FiEdit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handlePublish(exam._id)}
                                                            className="btn-icon bg-green-50 text-green-600 hover:bg-green-100"
                                                            title="Publish"
                                                        >
                                                            <FiSend size={16} />
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => navigate(`/faculty/online-exams/${exam._id}/results`)}
                                                    className="btn-icon bg-purple-50 text-purple-600 hover:bg-purple-100"
                                                    title="View Results"
                                                >
                                                    <FiUsers size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => { setShowModal(false); resetForm(); }}
                title={isEditing ? 'Edit Exam' : 'Create New Exam'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="form-group">
                        <label className="label">Exam Name *</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="input"
                            required
                            placeholder="e.g., Mid-Term Exam - Data Structures"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="label">Subject *</label>
                            <select name="subjectId" value={formData.subjectId} onChange={handleInputChange} className="input" required>
                                <option value="">Select Subject</option>
                                {subjects.map(sub => (
                                    <option key={sub._id} value={sub._id}>{sub.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="label">Course *</label>
                            <select name="courseId" value={formData.courseId} onChange={handleInputChange} className="input" required>
                                <option value="">Select Course</option>
                                {courses.map(course => (
                                    <option key={course._id} value={course._id}>{course.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="form-group">
                            <label className="label">Class ID</label>
                            <input
                                type="text"
                                name="classId"
                                value={formData.classId}
                                onChange={handleInputChange}
                                className="input"
                                placeholder="e.g., CSE-3-A"
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Semester</label>
                            <select name="semester" value={formData.semester} onChange={handleInputChange} className="input">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                                    <option key={sem} value={sem}>Semester {sem}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="label">Exam Mode</label>
                            <select name="examMode" value={formData.examMode} onChange={handleInputChange} className="input">
                                <option value="mcq">MCQ Only</option>
                                <option value="descriptive">Descriptive Only</option>
                                <option value="mixed">Mixed</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="label">Duration (minutes) *</label>
                            <input
                                type="number"
                                name="duration"
                                value={formData.duration}
                                onChange={handleInputChange}
                                className="input"
                                min="1"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Max Marks</label>
                            <input
                                type="number"
                                name="maxMarks"
                                value={formData.maxMarks}
                                onChange={handleInputChange}
                                className="input"
                                min="1"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="label">Start Time *</label>
                            <input
                                type="datetime-local"
                                name="startTime"
                                value={formData.startTime}
                                onChange={handleInputChange}
                                className="input"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">End Time *</label>
                            <input
                                type="datetime-local"
                                name="endTime"
                                value={formData.endTime}
                                onChange={handleInputChange}
                                className="input"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="label">Instructions</label>
                        <textarea
                            name="instructions"
                            value={formData.instructions}
                            onChange={handleInputChange}
                            className="input"
                            rows="3"
                            placeholder="Enter exam instructions for students..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : isEditing ? 'Update Exam' : 'Create Exam'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default FacultyExams;
