import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { facultyAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal, { ConfirmModal } from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import {
    FiPlus, FiEdit2, FiTrash2, FiSend, FiSearch, FiBell,
    FiUsers, FiClock, FiCalendar, FiStar, FiUser, FiMessageSquare
} from 'react-icons/fi';
import { getErrorMessage } from '../../utils/errorNormalizer';

const FacultyNotices = () => {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedNotice, setSelectedNotice] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'admin', 'my'

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        type: 'department',
        priority: 'medium',
        isImportant: false,
        expiresAt: '',
    });

    const noticeTypes = [
        { value: 'department', label: 'Department', icon: '🏛️' },
        { value: 'class', label: 'Class Notice', icon: '📚' },
        { value: 'assignment', label: 'Assignment', icon: '📝' },
        { value: 'exam', label: 'Exam', icon: '✍️' },
        { value: 'general', label: 'General', icon: '📢' },
    ];

    const priorities = [
        { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-600' },
        { value: 'medium', label: 'Medium', color: 'badge-primary' },
        { value: 'high', label: 'High', color: 'badge-warning' },
        { value: 'urgent', label: 'Urgent', color: 'badge-danger' },
    ];

    useEffect(() => {
        fetchNotices();
    }, []);

    const fetchNotices = async () => {
        try {
            setLoading(true);
            const response = await facultyAPI.getNotices();
            if (response.data.success) {
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
                priority: formData.priority,
                isImportant: formData.isImportant,
                expiresAt: formData.expiresAt || null,
            };

            await facultyAPI.postNotice(payload);
            toast.success('Notice posted successfully to students');

            fetchNotices();
            handleCloseModal();
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to post notice'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        setIsSubmitting(true);
        try {
            await facultyAPI.deleteNotice(selectedNotice._id);
            toast.success('Notice deleted successfully');
            fetchNotices();
            setShowDeleteModal(false);
            setSelectedNotice(null);
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to delete notice'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setFormData({
            title: '', content: '', type: 'department', priority: 'medium',
            isImportant: false, expiresAt: ''
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

    // Get current user ID from localStorage
    const getCurrentUserId = () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            return user?._id || user?.id;
        } catch {
            return null;
        }
    };

    const currentUserId = getCurrentUserId();

    // Filter notices based on active tab
    const getFilteredNotices = () => {
        let filtered = notices.filter(notice =>
            notice.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            notice.content?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (activeTab === 'admin') {
            filtered = filtered.filter(n => n.createdByRole === 'admin');
        } else if (activeTab === 'my') {
            filtered = filtered.filter(n =>
                n.createdBy?._id === currentUserId || n.createdBy === currentUserId
            );
        }

        return filtered;
    };

    const filteredNotices = getFilteredNotices();
    const adminNotices = notices.filter(n => n.createdByRole === 'admin');
    const myNotices = notices.filter(n =>
        n.createdBy?._id === currentUserId || n.createdBy === currentUserId
    );

    return (
        <div className="animate-fade-in">
            <Breadcrumb items={[
                { label: 'Dashboard', path: '/faculty/dashboard' },
                { label: 'Notices', path: '/faculty/notices', isLast: true }
            ]} />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Notice Board</h1>
                    <p className="text-secondary-500 mt-1">View announcements and post notices for students</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary mt-4 md:mt-0">
                    <FiPlus size={18} />
                    Post Notice
                </button>
            </div>

            {/* Info Banner */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500 rounded-lg text-white">
                        <FiUsers size={20} />
                    </div>
                    <div>
                        <p className="font-semibold text-blue-800">Your notices are visible to students only</p>
                        <p className="text-sm text-blue-600">
                            As a faculty member, you can post notices targeted specifically to students in your department.
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div
                    onClick={() => setActiveTab('all')}
                    className={`card cursor-pointer transition-all ${activeTab === 'all'
                        ? 'bg-gradient-to-r from-purple-50 to-purple-100 border-purple-300 shadow-md'
                        : 'hover:shadow-md'
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${activeTab === 'all' ? 'bg-purple-500' : 'bg-purple-100'} text-white`}>
                            <FiBell size={24} className={activeTab !== 'all' ? 'text-purple-500' : ''} />
                        </div>
                        <div>
                            <p className="text-sm text-purple-600">All Notices</p>
                            <p className="text-2xl font-bold text-purple-700">{notices.length}</p>
                        </div>
                    </div>
                </div>
                <div
                    onClick={() => setActiveTab('admin')}
                    className={`card cursor-pointer transition-all ${activeTab === 'admin'
                        ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 shadow-md'
                        : 'hover:shadow-md'
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${activeTab === 'admin' ? 'bg-blue-500' : 'bg-blue-100'} text-white`}>
                            <FiUser size={24} className={activeTab !== 'admin' ? 'text-blue-500' : ''} />
                        </div>
                        <div>
                            <p className="text-sm text-blue-600">From Admin</p>
                            <p className="text-2xl font-bold text-blue-700">{adminNotices.length}</p>
                        </div>
                    </div>
                </div>
                <div
                    onClick={() => setActiveTab('my')}
                    className={`card cursor-pointer transition-all ${activeTab === 'my'
                        ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-300 shadow-md'
                        : 'hover:shadow-md'
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${activeTab === 'my' ? 'bg-green-500' : 'bg-green-100'} text-white`}>
                            <FiMessageSquare size={24} className={activeTab !== 'my' ? 'text-green-500' : ''} />
                        </div>
                        <div>
                            <p className="text-sm text-green-600">My Notices</p>
                            <p className="text-2xl font-bold text-green-700">{myNotices.length}</p>
                        </div>
                    </div>
                </div>
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
                    title={activeTab === 'my' ? "No notices posted by you" : "No notices found"}
                    description={activeTab === 'my'
                        ? "Post your first notice to students."
                        : "No notices available at the moment."}
                    action={activeTab === 'my' ? () => setShowModal(true) : null}
                    actionLabel={activeTab === 'my' ? "Post Notice" : null}
                />
            ) : (
                <div className="space-y-4">
                    {filteredNotices.map((notice) => {
                        const isOwnNotice = notice.createdBy?._id === currentUserId || notice.createdBy === currentUserId;

                        return (
                            <div
                                key={notice._id}
                                className={`card hover:shadow-lg transition-all relative ${notice.isImportant ? 'border-l-4 border-l-orange-500' : ''
                                    } ${notice.createdByRole === 'admin' ? 'bg-gradient-to-r from-white to-blue-50' : ''}`}
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
                                                <div className="flex items-center gap-2 mb-1">
                                                    {notice.createdByRole === 'admin' && (
                                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                                                            👑 ADMIN
                                                        </span>
                                                    )}
                                                    {isOwnNotice && (
                                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">
                                                            ✓ YOUR NOTICE
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="text-lg font-semibold text-secondary-800">{notice.title}</h3>
                                                <p className="text-secondary-600 mt-1 line-clamp-2">
                                                    {notice.content || notice.message}
                                                </p>
                                            </div>
                                            {/* Only show edit/delete for own notices */}
                                            {isOwnNotice && (
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        onClick={() => { setSelectedNotice(notice); setShowDeleteModal(true); }}
                                                        className="p-2 rounded-lg hover:bg-danger-50 text-danger-500"
                                                        title="Delete"
                                                    >
                                                        <FiTrash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 mt-3">
                                            <span className={`badge ${getPriorityBadge(notice.priority)}`}>
                                                {notice.priority}
                                            </span>
                                            <span className="badge bg-gray-100 text-gray-600 flex items-center gap-1">
                                                <FiUsers size={12} />
                                                {notice.createdByRole === 'admin'
                                                    ? (notice.targetAudience === 'all' ? 'All Users' : 'Faculty')
                                                    : 'Students'}
                                            </span>
                                            {notice.createdBy?.name && (
                                                <span className="text-sm text-secondary-500">
                                                    by {notice.createdBy.name}
                                                </span>
                                            )}
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
                        );
                    })}
                </div>
            )}

            {/* Post Notice Modal */}
            <Modal
                isOpen={showModal}
                onClose={handleCloseModal}
                title="Post Notice to Students"
                size="lg"
            >
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-700 flex items-center gap-2">
                        <FiUsers size={16} />
                        This notice will be visible to <strong>students only</strong>
                    </p>
                </div>

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
                            placeholder="Write your notice here..."
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
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={handleCloseModal} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={isSubmitting}>
                            <FiSend size={16} />
                            {isSubmitting ? 'Posting...' : 'Post Notice'}
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

export default FacultyNotices;
