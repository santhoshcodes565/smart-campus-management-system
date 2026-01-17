import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal, { ConfirmModal } from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import { FiPlus, FiEdit2, FiTrash2, FiSend, FiSearch, FiBell, FiUsers, FiGlobe } from 'react-icons/fi';
import { getErrorMessage } from '../../utils/errorNormalizer';

const ManageNotices = () => {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedNotice, setSelectedNotice] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { emitEvent } = useSocket();

    const [formData, setFormData] = useState({
        title: '',
        message: '',
        type: 'general',
        targetAudience: 'all',
        priority: 'normal',
        department: '',
        year: '',
    });

    const noticeTypes = ['general', 'academic', 'event', 'holiday', 'exam', 'urgent'];
    const priorities = ['low', 'normal', 'high', 'urgent'];
    const audienceOptions = ['all', 'students', 'faculty', 'department', 'year'];
    const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'];

    useEffect(() => {
        fetchNotices();
    }, []);

    const fetchNotices = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getNotices();
            if (response.data.success) {
                setNotices(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching notices:', error);
            setNotices([
                { _id: '1', title: 'Mid-term Exam Schedule', message: 'Mid-term exams will be conducted from 15th to 20th January.', type: 'exam', priority: 'high', targetAudience: 'students', createdAt: new Date().toISOString() },
                { _id: '2', title: 'Republic Day Holiday', message: 'College will remain closed on 26th January for Republic Day.', type: 'holiday', priority: 'normal', targetAudience: 'all', createdAt: new Date(Date.now() - 86400000).toISOString() },
                { _id: '3', title: 'Fee Payment Reminder', message: 'Last date for fee payment is 31st January.', type: 'general', priority: 'high', targetAudience: 'students', createdAt: new Date(Date.now() - 172800000).toISOString() },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (selectedNotice) {
                await adminAPI.updateNotice(selectedNotice._id, formData);
                toast.success('Notice updated successfully');
            } else {
                await adminAPI.createNotice(formData);
                toast.success('Notice posted successfully');

                // Emit real-time notification
                emitEvent('post-notice', {
                    title: formData.title,
                    message: formData.message,
                    type: formData.type,
                    targetAudience: formData.targetAudience,
                });
            }
            fetchNotices();
            handleCloseModal();
        } catch (error) {
            toast.error(getErrorMessage(error, 'Operation failed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (notice) => {
        setSelectedNotice(notice);
        setFormData({
            title: notice.title || '',
            message: notice.message || '',
            type: notice.type || 'general',
            targetAudience: notice.targetAudience || 'all',
            priority: notice.priority || 'normal',
            department: notice.department || '',
            year: notice.year || '',
        });
        setShowModal(true);
    };

    const handleDelete = async () => {
        setIsSubmitting(true);
        try {
            await adminAPI.deleteNotice(selectedNotice._id);
            toast.success('Notice deleted successfully');
            fetchNotices();
            setShowDeleteModal(false);
            setSelectedNotice(null);
        } catch (error) {
            toast.error(getErrorMessage(error, 'Delete failed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedNotice(null);
        setFormData({
            title: '', message: '', type: 'general', targetAudience: 'all',
            priority: 'normal', department: '', year: ''
        });
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'urgent': return 'badge-danger';
            case 'high': return 'badge-warning';
            case 'normal': return 'badge-primary';
            default: return 'badge bg-gray-100 text-gray-600';
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'exam': return '📝';
            case 'holiday': return '🎉';
            case 'event': return '📅';
            case 'urgent': return '⚠️';
            default: return '📢';
        }
    };

    const filteredNotices = notices.filter(notice =>
        notice.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notice.message?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="animate-fade-in">
            <Breadcrumb />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Global Notices</h1>
                    <p className="text-secondary-500 mt-1">Post and manage campus-wide announcements</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary mt-4 md:mt-0">
                    <FiPlus size={18} />
                    Post Notice
                </button>
            </div>

            {/* Search */}
            <div className="card mb-6">
                <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search notices..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input pl-10"
                    />
                </div>
            </div>

            {/* Notices List */}
            {loading ? (
                <SkeletonTable rows={4} />
            ) : filteredNotices.length === 0 ? (
                <EmptyState
                    icon={FiBell}
                    title="No notices found"
                    description="No notices have been posted yet."
                    action={() => setShowModal(true)}
                    actionLabel="Post Notice"
                />
            ) : (
                <div className="space-y-4">
                    {filteredNotices.map((notice) => (
                        <div key={notice._id} className="card hover:shadow-lg transition-shadow">
                            <div className="flex items-start gap-4">
                                <div className="text-3xl">{getTypeIcon(notice.type)}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-secondary-800">{notice.title}</h3>
                                            <p className="text-secondary-600 mt-1">{notice.message}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() => handleEdit(notice)}
                                                className="p-2 rounded-lg hover:bg-gray-100 text-secondary-600"
                                            >
                                                <FiEdit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => { setSelectedNotice(notice); setShowDeleteModal(true); }}
                                                className="p-2 rounded-lg hover:bg-danger-50 text-danger-500"
                                            >
                                                <FiTrash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 mt-3">
                                        <span className={getPriorityColor(notice.priority)}>{notice.priority}</span>
                                        <span className="badge bg-gray-100 text-gray-600 flex items-center gap-1">
                                            {notice.targetAudience === 'all' ? <FiGlobe size={12} /> : <FiUsers size={12} />}
                                            {notice.targetAudience}
                                        </span>
                                        <span className="text-sm text-secondary-500">
                                            {new Date(notice.createdAt).toLocaleDateString('en-US', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={selectedNotice ? 'Edit Notice' : 'Post New Notice'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="form-group">
                        <label className="label">Title *</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            className="input"
                            placeholder="Notice title"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="label">Message *</label>
                        <textarea
                            name="message"
                            value={formData.message}
                            onChange={handleChange}
                            className="input"
                            rows={4}
                            placeholder="Notice content..."
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="form-group">
                            <label className="label">Type</label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className="input"
                            >
                                {noticeTypes.map(type => (
                                    <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="label">Priority</label>
                            <select
                                name="priority"
                                value={formData.priority}
                                onChange={handleChange}
                                className="input"
                            >
                                {priorities.map(p => (
                                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="label">Target Audience</label>
                            <select
                                name="targetAudience"
                                value={formData.targetAudience}
                                onChange={handleChange}
                                className="input"
                            >
                                {audienceOptions.map(opt => (
                                    <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {formData.targetAudience === 'department' && (
                        <div className="form-group">
                            <label className="label">Department</label>
                            <select
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                                className="input"
                            >
                                <option value="">Select Department</option>
                                {departments.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={handleCloseModal} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={isSubmitting}>
                            <FiSend size={16} />
                            {isSubmitting ? 'Posting...' : selectedNotice ? 'Update Notice' : 'Post Notice'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete Notice"
                message="Are you sure you want to delete this notice? This action cannot be undone."
                confirmText="Delete"
                isLoading={isSubmitting}
            />
        </div>
    );
};

export default ManageNotices;
