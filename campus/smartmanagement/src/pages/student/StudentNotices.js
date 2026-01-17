import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { studentAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import {
    FiSearch, FiBell, FiClock, FiCalendar, FiStar,
    FiEye, FiUser, FiUsers, FiBookOpen, FiAlertCircle,
    FiFilter, FiCheckCircle
} from 'react-icons/fi';

const StudentNotices = () => {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'important', 'admin', 'faculty'
    const [selectedNotice, setSelectedNotice] = useState(null);

    useEffect(() => {
        fetchNotices();
    }, []);

    const fetchNotices = async () => {
        try {
            setLoading(true);
            const response = await studentAPI.getNotices();
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

    const markAsRead = async (noticeId) => {
        try {
            await studentAPI.markNoticeAsRead(noticeId);
        } catch (error) {
            // Silently fail - read tracking is optional
            console.log('Could not mark as read:', error);
        }
    };

    const handleViewNotice = (notice) => {
        setSelectedNotice(notice);
        markAsRead(notice._id);
    };

    const getTypeInfo = (type) => {
        const typeMap = {
            general: { icon: '📢', label: 'General' },
            academic: { icon: '📚', label: 'Academic' },
            event: { icon: '📅', label: 'Event' },
            holiday: { icon: '🎉', label: 'Holiday' },
            exam: { icon: '📝', label: 'Exam' },
            urgent: { icon: '⚠️', label: 'Urgent' },
            department: { icon: '🏛️', label: 'Department' },
            class: { icon: '📖', label: 'Class' },
            assignment: { icon: '✏️', label: 'Assignment' },
            global: { icon: '🌐', label: 'Global' },
        };
        return typeMap[type] || { icon: '📢', label: 'Notice' };
    };

    const getPriorityStyle = (priority) => {
        switch (priority) {
            case 'urgent': return 'badge-danger';
            case 'high': return 'badge-warning';
            case 'medium': return 'badge-primary';
            default: return 'bg-gray-100 text-gray-600';
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
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    // Filter and sort notices
    const getFilteredNotices = () => {
        let filtered = notices.filter(notice =>
            notice.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            notice.content?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        switch (activeFilter) {
            case 'important':
                filtered = filtered.filter(n => n.isImportant || n.priority === 'urgent' || n.priority === 'high');
                break;
            case 'admin':
                filtered = filtered.filter(n => n.createdByRole === 'admin');
                break;
            case 'faculty':
                filtered = filtered.filter(n => n.createdByRole === 'faculty');
                break;
            default:
                break;
        }

        // Sort: Important first, then by date
        return filtered.sort((a, b) => {
            if (a.isImportant && !b.isImportant) return -1;
            if (!a.isImportant && b.isImportant) return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    };

    const filteredNotices = getFilteredNotices();
    const importantCount = notices.filter(n => n.isImportant || n.priority === 'urgent' || n.priority === 'high').length;
    const adminNotices = notices.filter(n => n.createdByRole === 'admin');
    const facultyNotices = notices.filter(n => n.createdByRole === 'faculty');

    return (
        <div className="animate-fade-in">
            <Breadcrumb items={[
                { label: 'Dashboard', path: '/student/dashboard' },
                { label: 'Notices', path: '/student/notices', isLast: true }
            ]} />

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-secondary-800">📣 Notice Board</h1>
                <p className="text-secondary-500 mt-1">Stay updated with the latest announcements</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <button
                    onClick={() => setActiveFilter('all')}
                    className={`card text-left transition-all ${activeFilter === 'all'
                            ? 'bg-gradient-to-r from-purple-50 to-purple-100 border-purple-300 shadow-md'
                            : 'hover:shadow-md'
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${activeFilter === 'all' ? 'bg-purple-500 text-white' : 'bg-purple-100 text-purple-500'}`}>
                            <FiBell size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-secondary-500">All</p>
                            <p className="text-xl font-bold text-secondary-800">{notices.length}</p>
                        </div>
                    </div>
                </button>
                <button
                    onClick={() => setActiveFilter('important')}
                    className={`card text-left transition-all ${activeFilter === 'important'
                            ? 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-300 shadow-md'
                            : 'hover:shadow-md'
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${activeFilter === 'important' ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-500'}`}>
                            <FiStar size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-secondary-500">Important</p>
                            <p className="text-xl font-bold text-secondary-800">{importantCount}</p>
                        </div>
                    </div>
                </button>
                <button
                    onClick={() => setActiveFilter('admin')}
                    className={`card text-left transition-all ${activeFilter === 'admin'
                            ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 shadow-md'
                            : 'hover:shadow-md'
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${activeFilter === 'admin' ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-500'}`}>
                            <FiUser size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-secondary-500">Admin</p>
                            <p className="text-xl font-bold text-secondary-800">{adminNotices.length}</p>
                        </div>
                    </div>
                </button>
                <button
                    onClick={() => setActiveFilter('faculty')}
                    className={`card text-left transition-all ${activeFilter === 'faculty'
                            ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-300 shadow-md'
                            : 'hover:shadow-md'
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${activeFilter === 'faculty' ? 'bg-green-500 text-white' : 'bg-green-100 text-green-500'}`}>
                            <FiBookOpen size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-secondary-500">Faculty</p>
                            <p className="text-xl font-bold text-secondary-800">{facultyNotices.length}</p>
                        </div>
                    </div>
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
                    description={searchTerm
                        ? "Try a different search term."
                        : "No notices available at the moment."}
                />
            ) : (
                <div className="space-y-4">
                    {filteredNotices.map((notice) => {
                        const typeInfo = getTypeInfo(notice.type);
                        const isUrgent = notice.priority === 'urgent' || notice.type === 'urgent';

                        return (
                            <div
                                key={notice._id}
                                onClick={() => handleViewNotice(notice)}
                                className={`card cursor-pointer hover:shadow-lg transition-all relative group ${notice.isImportant ? 'border-l-4 border-l-orange-500' : ''
                                    } ${isUrgent ? 'bg-gradient-to-r from-red-50 to-white border-red-200' : ''}
                                ${notice.createdByRole === 'admin' ? 'bg-gradient-to-r from-blue-50/50 to-white' : ''}`}
                            >
                                {/* Important Badge */}
                                {notice.isImportant && (
                                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-semibold">
                                        <FiStar className="fill-orange-500" size={12} />
                                        Important
                                    </div>
                                )}

                                {/* Urgent Badge */}
                                {isUrgent && !notice.isImportant && (
                                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-semibold animate-pulse">
                                        <FiAlertCircle size={12} />
                                        Urgent
                                    </div>
                                )}

                                <div className="flex items-start gap-4">
                                    <div className="text-3xl shrink-0">{typeInfo.icon}</div>
                                    <div className="flex-1 min-w-0 pr-20">
                                        {/* Source Badge */}
                                        <div className="flex items-center gap-2 mb-1">
                                            {notice.createdByRole === 'admin' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                                                    👑 Admin Notice
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">
                                                    👨‍🏫 From Faculty
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="text-lg font-semibold text-secondary-800 group-hover:text-primary-600 transition-colors">
                                            {notice.title}
                                        </h3>
                                        <p className="text-secondary-600 mt-1 line-clamp-2">
                                            {notice.content || notice.message}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-3 mt-3">
                                            <span className={`badge ${getPriorityStyle(notice.priority)}`}>
                                                {notice.priority}
                                            </span>
                                            <span className="badge bg-secondary-100 text-secondary-600">
                                                {typeInfo.label}
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

                                {/* Hover action */}
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="p-2 bg-primary-100 rounded-full text-primary-600">
                                        <FiEye size={18} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Notice Detail Modal */}
            {selectedNotice && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedNotice(null)}>
                    <div
                        className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-auto shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className={`p-6 border-b ${selectedNotice.isImportant
                                ? 'bg-gradient-to-r from-orange-50 to-yellow-50'
                                : selectedNotice.createdByRole === 'admin'
                                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50'
                                    : 'bg-gradient-to-r from-gray-50 to-white'
                            }`}>
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className="text-4xl">{getTypeInfo(selectedNotice.type).icon}</div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            {selectedNotice.isImportant && (
                                                <span className="flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-semibold">
                                                    <FiStar className="fill-orange-500" size={12} />
                                                    Important
                                                </span>
                                            )}
                                            <span className={`badge ${getPriorityStyle(selectedNotice.priority)}`}>
                                                {selectedNotice.priority}
                                            </span>
                                        </div>
                                        <h2 className="text-xl font-bold text-secondary-800">
                                            {selectedNotice.title}
                                        </h2>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedNotice(null)}
                                    className="p-2 hover:bg-gray-100 rounded-lg text-secondary-500"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            <p className="text-secondary-700 whitespace-pre-wrap leading-relaxed">
                                {selectedNotice.content || selectedNotice.message}
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-gray-50 border-t">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex flex-wrap items-center gap-4 text-sm text-secondary-500">
                                    <span className="flex items-center gap-2">
                                        {selectedNotice.createdByRole === 'admin' ? (
                                            <span className="flex items-center gap-1">
                                                <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">👑</span>
                                                <span>Admin</span>
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1">
                                                <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold">👨‍🏫</span>
                                                <span>{selectedNotice.createdBy?.name || 'Faculty'}</span>
                                            </span>
                                        )}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <FiClock size={14} />
                                        {new Date(selectedNotice.createdAt).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                    {selectedNotice.expiresAt && (
                                        <span className="flex items-center gap-1 text-orange-500">
                                            <FiCalendar size={14} />
                                            Expires: {new Date(selectedNotice.expiresAt).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => setSelectedNotice(null)}
                                    className="btn-primary"
                                >
                                    <FiCheckCircle size={16} />
                                    Got it
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentNotices;
