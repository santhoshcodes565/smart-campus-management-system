import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal, { ConfirmModal } from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import {
    FiPlus, FiEdit2, FiTrash2, FiSend, FiSearch, FiBell,
    FiUsers, FiGlobe, FiBookOpen, FiAlertTriangle, FiClock,
    FiCalendar, FiStar, FiFilter
} from 'react-icons/fi';
import { getErrorMessage } from '../../utils/errorNormalizer';

const AdminNotices = () => {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedNotice, setSelectedNotice] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [filterAudience, setFilterAudience] = useState('');
    const { emitEvent } = useSocket();

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        type: 'general',
        targetAudience: 'all',
        priority: 'medium',
        isImportant: false,
        expiresAt: '',
    });

    const noticeTypes = [
        { value: 'general', label: 'General', icon: '📢' },
        { value: 'academic', label: 'Academic', icon: '📚' },
        { value: 'event', label: 'Event', icon: '📅' },
        { value: 'holiday', label: 'Holiday', icon: '🎉' },
        { value: 'exam', label: 'Exam', icon: '📝' },
        { value: 'urgent', label: 'Urgent', icon: '⚠️' },
    ];

    const priorities = [
        { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-600' },
        { value: 'medium', label: 'Medium', color: 'badge-primary' },
        { value: 'high', label: 'High', color: 'badge-warning' },
        { value: 'urgent', label: 'Urgent', color: 'badge-danger' },
    ];

    const audienceOptions = [
        { value: 'all', label: 'All Users', icon: FiGlobe, description: 'Faculty + Students' },
        { value: 'faculty', label: 'Faculty Only', icon: FiBookOpen, description: 'Only faculty will see this' },
        { value: 'students', label: 'Students Only', icon: FiUsers, description: 'Only students will see this' },
    ];

    useEffect(() => {
        fetchNotices();
    }, [filterAudience]);

    const fetchNotices = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filterAudience) params.targetAudience = filterAudience;

            const response = await adminAPI.getNotices(params);
            if (response.data.success) {
                // Handle both old and new response format
                const noticesData = response.data.data?.notices || response.data.data || [];
                setNotices(noticesData);
            }
        } catch (error) {
            console.error('Error fetching notices:', error);
            toast.error('Failed to fetch notices');
            setNotices([]);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const payload = {
                title: formData.title,
                content: formData.content,
                type: formData.type,
                targetAudience: formData.targetAudience,
                priority: formData.priority,
                isImportant: formData.isImportant,
                expiresAt: formData.expiresAt || null,
            };

            if (selectedNotice) {
                await adminAPI.updateNotice(selectedNotice._id, payload);
                toast.success('Notice updated successfully');
            } else {
                await adminAPI.createNotice(payload);
                toast.success('Notice created successfully');

                // Emit real-time notification
                emitEvent('post-notice', {
                    title: formData.title,
                    message: formData.content,
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
            content: notice.content || notice.message || '',
            type: notice.type || 'general',
            targetAudience: notice.targetAudience || 'all',
            priority: notice.priority || 'medium',
            isImportant: notice.isImportant || false,
            expiresAt: notice.expiresAt ? new Date(notice.expiresAt).toISOString().slice(0, 16) : '',
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
            title: '', content: '', type: 'general', targetAudience: 'all',
            priority: 'medium', isImportant: false, expiresAt: ''
        });
    };

    const getPriorityBadge = (priority) => {
        const p = priorities.find(pr => pr.value === priority);
        return p ? p.color : 'bg-gray-100 text-gray-600';
    };

    const getTypeInfo = (type) => {
        const t = noticeTypes.find(nt => nt.value === type);
        return t ? t.icon : '📢';
    };

    const getAudienceIcon = (audience) => {
        switch (audience) {
            case 'faculty': return <FiBookOpen className="text-blue-500" />;
            case 'students': return <FiUsers className="text-green-500" />;
            default: return <FiGlobe className="text-purple-500" />;
        }
    };

    const getRelativeTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const filteredNotices = notices.filter(notice =>
    (notice.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notice.content?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="animate-fade-in">
            <Breadcrumb />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Notice Board</h1>
                    <p className="text-secondary-500 mt-1">Create and manage campus-wide announcements</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary mt-4 md:mt-0">
                    <FiPlus size={18} />
                    Create Notice
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="card bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-500 rounded-lg text-white">
                            <FiBell size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-purple-600">Total Notices</p>
                            <p className="text-2xl font-bold text-purple-700">{notices.length}</p>
                        </div>
                    </div>
                </div>
                <div className="card bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-500 rounded-lg text-white">
                            <FiGlobe size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-blue-600">All Users</p>
                            <p className="text-2xl font-bold text-blue-700">
                                {notices.filter(n => n.targetAudience === 'all').length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="card bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-500 rounded-lg text-white">
                            <FiUsers size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-green-600">Students Only</p>
                            <p className="text-2xl font-bold text-green-700">
                                {notices.filter(n => n.targetAudience === 'students').length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="card bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-orange-500 rounded-lg text-white">
                            <FiStar size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-orange-600">Important</p>
                            <p className="text-2xl font-bold text-orange-700">
                                {notices.filter(n => n.isImportant).length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="card mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search notices..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input pl-10"
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={filterAudience}
                            onChange={(e) => setFilterAudience(e.target.value)}
                            className="input"
                        >
                            <option value="">All Audiences</option>
                            <option value="all">All Users</option>
                            <option value="faculty">Faculty Only</option>
                            <option value="students">Students Only</option>
                        </select>
                    </div>
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
                    actionLabel="Create Notice"
                />
            ) : (
                <div className="space-y-4">
                    {filteredNotices.map((notice) => (
                        <div
                            key={notice._id}
                            className={`card hover:shadow-lg transition-shadow relative ${notice.isImportant ? 'border-l-4 border-l-orange-500' : ''
                                }`}
                        >
                            {notice.isImportant && (
                                <div className="absolute top-3 right-3">
                                    <FiStar className="text-orange-500 fill-orange-500" size={20} />
                                </div>
                            )}
                            <div className="flex items-start gap-4">
                                <div className="text-3xl">{getTypeInfo(notice.type)}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4 pr-8">
                                        <div>
                                            <h3 className="text-lg font-semibold text-secondary-800">{notice.title}</h3>
                                            <p className="text-secondary-600 mt-1 line-clamp-2">
                                                {notice.content || notice.message}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() => handleEdit(notice)}
                                                className="p-2 rounded-lg hover:bg-gray-100 text-secondary-600"
                                                title="Edit"
                                            >
                                                <FiEdit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => { setSelectedNotice(notice); setShowDeleteModal(true); }}
                                                className="p-2 rounded-lg hover:bg-danger-50 text-danger-500"
                                                title="Delete"
                                            >
                                                <FiTrash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 mt-3">
                                        <span className={`badge ${getPriorityBadge(notice.priority)}`}>
                                            {notice.priority}
                                        </span>
                                        <span className="badge bg-gray-100 text-gray-600 flex items-center gap-1">
                                            {getAudienceIcon(notice.targetAudience)}
                                            {notice.targetAudience === 'all' ? 'All Users' :
                                                notice.targetAudience === 'faculty' ? 'Faculty' : 'Students'}
                                        </span>
                                        <span className="badge bg-secondary-100 text-secondary-600">
                                            {notice.createdByRole === 'admin' ? '👑 Admin' : '👨‍🏫 Faculty'}
                                        </span>
                                        <span className="text-sm text-secondary-500 flex items-center gap-1">
                                            <FiClock size={14} />
                                            {getRelativeTime(notice.createdAt)}
                                        </span>
                                        {notice.expiresAt && (
                                            <span className="text-sm text-orange-500 flex items-center gap-1">
                                                <FiCalendar size={14} />
                                                Expires: {new Date(notice.expiresAt).toLocaleDateString()}
                                            </span>
                                        )}
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
                title={selectedNotice ? 'Edit Notice' : 'Create New Notice'}
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
                        <label className="label">Content *</label>
                        <textarea
                            name="content"
                            value={formData.content}
                            onChange={handleChange}
                            className="input"
                            rows={4}
                            placeholder="Notice content..."
                            required
                        />
                    </div>

                    {/* Target Audience Selection */}
                    <div className="form-group">
                        <label className="label">Target Audience *</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {audienceOptions.map((option) => (
                                <label
                                    key={option.value}
                                    className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${formData.targetAudience === option.value
                                        ? 'border-primary-500 bg-primary-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="targetAudience"
                                        value={option.value}
                                        checked={formData.targetAudience === option.value}
                                        onChange={handleChange}
                                        className="hidden"
                                    />
                                    <option.icon className={`text-xl ${formData.targetAudience === option.value ? 'text-primary-500' : 'text-gray-400'
                                        }`} />
                                    <div>
                                        <p className="font-semibold text-secondary-800">{option.label}</p>
                                        <p className="text-xs text-secondary-500">{option.description}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
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
                                    <option key={type.value} value={type.value}>
                                        {type.icon} {type.label}
                                    </option>
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
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="label">Expires At</label>
                            <input
                                type="datetime-local"
                                name="expiresAt"
                                value={formData.expiresAt}
                                onChange={handleChange}
                                className="input"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                name="isImportant"
                                checked={formData.isImportant}
                                onChange={handleChange}
                                className="w-5 h-5 rounded text-primary-500 focus:ring-primary-500"
                            />
                            <div className="flex items-center gap-2">
                                <FiStar className="text-orange-500" />
                                <span className="font-medium">Mark as Important</span>
                            </div>
                        </label>
                        <p className="text-sm text-secondary-500 ml-8">
                            Important notices will be highlighted and pinned at the top
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={handleCloseModal} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={isSubmitting}>
                            <FiSend size={16} />
                            {isSubmitting ? 'Processing...' : selectedNotice ? 'Update Notice' : 'Post Notice'}
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

export default AdminNotices;
