import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import {
    FiSend,
    FiMessageSquare,
    FiUser,
    FiUsers,
    FiClock,
    FiCheckCircle,
    FiAlertCircle,
    FiPlus,
    FiX,
    FiArrowLeft,
    FiRefreshCw,
    FiFlag,
    FiInbox,
    FiFilter,
    FiTrash2,
    FiActivity,
    FiDatabase
} from 'react-icons/fi';
import { getErrorMessage } from '../../utils/errorNormalizer';

// Status configuration
const STATUS_CONFIG = {
    open: { label: 'Open', color: 'badge-warning', icon: FiClock },
    in_review: { label: 'In Review', color: 'badge-info', icon: FiAlertCircle },
    waiting_for_user: { label: 'Awaiting User', color: 'badge-primary', icon: FiMessageSquare },
    resolved: { label: 'Resolved', color: 'badge-success', icon: FiCheckCircle },
    closed: { label: 'Closed', color: 'badge-secondary', icon: FiCheckCircle }
};

const PRIORITY_CONFIG = {
    low: { label: 'Low', color: 'text-green-600 bg-green-100', border: 'border-green-300' },
    medium: { label: 'Medium', color: 'text-yellow-600 bg-yellow-100', border: 'border-yellow-300' },
    high: { label: 'High', color: 'text-red-600 bg-red-100', border: 'border-red-300' }
};

const TYPE_OPTIONS = [
    { value: '', label: 'All Types' },
    { value: 'general', label: 'General' },
    { value: 'academic', label: 'Academic' },
    { value: 'technical', label: 'Technical' },
    { value: 'complaint', label: 'Complaint' },
    { value: 'suggestion', label: 'Suggestion' }
];

const AdminFeedback = () => {
    // State
    const [threads, setThreads] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedThread, setSelectedThread] = useState(null);
    const [threadDetails, setThreadDetails] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [replyMessage, setReplyMessage] = useState('');
    const [sendingReply, setSendingReply] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [showAudit, setShowAudit] = useState(false);
    const [migrating, setMigrating] = useState(false);
    const [lastFetched, setLastFetched] = useState(null);

    const [filters, setFilters] = useState({
        status: '',
        priority: '',
        type: '',
        createdByRole: '',
        search: ''
    });

    const [formData, setFormData] = useState({
        targetRole: 'faculty',
        targetUserId: '',
        title: '',
        message: '',
        type: 'general',
        priority: 'medium'
    });

    const [facultyList, setFacultyList] = useState([]);

    // Fetch threads
    const fetchThreads = useCallback(async () => {
        try {
            const params = {};
            if (filters.status) params.status = filters.status;
            if (filters.priority) params.priority = filters.priority;
            if (filters.type) params.type = filters.type;
            if (filters.createdByRole) params.createdByRole = filters.createdByRole;
            if (filters.search) params.search = filters.search;

            const response = await adminAPI.feedbackV2.getThreads(params);
            if (response.data.success) {
                setThreads(response.data.data);
                setStats(response.data.stats || {});
                setLastFetched(new Date());
            }
        } catch (error) {
            console.error('Error fetching threads:', error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    // Fetch faculty list
    const fetchFacultyList = async () => {
        try {
            const response = await adminAPI.getFaculty();
            if (response.data.success) {
                setFacultyList(response.data.data.map(f => ({
                    _id: f.userId?._id || f._id,
                    name: f.userId?.name || f.name || 'Unknown'
                })));
            }
        } catch (error) {
            console.error('Error fetching faculty:', error);
        }
    };

    // Fetch single thread details
    const fetchThreadDetails = async (threadId) => {
        try {
            const response = await adminAPI.feedbackV2.getThread(threadId);
            if (response.data.success) {
                setThreadDetails(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching thread:', error);
            toast.error('Failed to load conversation');
        }
    };

    // Initial load
    useEffect(() => {
        fetchThreads();
        fetchFacultyList();
    }, [fetchThreads]);

    // Auto-refresh every 15 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchThreads();
            if (selectedThread) {
                fetchThreadDetails(selectedThread);
            }
        }, 15000);

        return () => clearInterval(interval);
    }, [selectedThread, fetchThreads]);

    // Handle filter change
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    // Clear filters
    const clearFilters = () => {
        setFilters({
            status: '',
            priority: '',
            type: '',
            createdByRole: '',
            search: ''
        });
    };

    // Handle form changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            if (name === 'targetRole' && value === 'admin') {
                return { ...prev, [name]: value, targetUserId: '' };
            }
            return { ...prev, [name]: value };
        });
    };

    // Create new thread
    const handleCreateThread = async (e) => {
        e.preventDefault();

        if (!formData.title.trim() || !formData.message.trim()) {
            toast.error('Please fill all required fields');
            return;
        }

        if (formData.targetRole === 'faculty' && !formData.targetUserId) {
            toast.error('Please select a faculty member');
            return;
        }

        setSubmitting(true);
        try {
            const response = await adminAPI.feedbackV2.createThread({
                title: formData.title.trim(),
                targetRole: formData.targetRole,
                targetUserId: formData.targetRole === 'faculty' ? formData.targetUserId : null,
                type: formData.type,
                priority: formData.priority,
                message: formData.message.trim()
            });

            if (response.data.success) {
                toast.success('Thread created successfully!');
                setShowCreateModal(false);
                setFormData({
                    targetRole: 'faculty',
                    targetUserId: '',
                    title: '',
                    message: '',
                    type: 'general',
                    priority: 'medium'
                });
                fetchThreads();
            }
        } catch (error) {
            console.error('Error creating thread:', error);
            toast.error(getErrorMessage(error, 'Failed to create thread'));
        } finally {
            setSubmitting(false);
        }
    };

    // Send reply
    const handleSendReply = async () => {
        if (!replyMessage.trim()) {
            toast.error('Please enter a message');
            return;
        }

        setSendingReply(true);
        try {
            const response = await adminAPI.feedbackV2.replyToThread(selectedThread, {
                message: replyMessage.trim()
            });

            if (response.data.success) {
                toast.success('Reply sent!');
                setReplyMessage('');
                fetchThreadDetails(selectedThread);
                fetchThreads();
            }
        } catch (error) {
            console.error('Error sending reply:', error);
            toast.error(getErrorMessage(error, 'Failed to send reply'));
        } finally {
            setSendingReply(false);
        }
    };

    // Update status
    const handleStatusChange = async (newStatus) => {
        try {
            const response = await adminAPI.feedbackV2.updateStatus(selectedThread, newStatus);
            if (response.data.success) {
                toast.success(`Status updated to ${STATUS_CONFIG[newStatus]?.label}`);
                fetchThreadDetails(selectedThread);
                fetchThreads();
            }
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Failed to update status');
        }
    };

    // Update priority
    const handlePriorityChange = async (newPriority) => {
        try {
            const response = await adminAPI.feedbackV2.updatePriority(selectedThread, newPriority);
            if (response.data.success) {
                toast.success(`Priority updated to ${PRIORITY_CONFIG[newPriority]?.label}`);
                fetchThreadDetails(selectedThread);
                fetchThreads();
            }
        } catch (error) {
            console.error('Error updating priority:', error);
            toast.error('Failed to update priority');
        }
    };

    // Soft delete
    const handleSoftDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this thread? This action can be undone by an administrator.')) {
            return;
        }

        try {
            const response = await adminAPI.feedbackV2.softDelete(selectedThread);
            if (response.data.success) {
                toast.success('Thread deleted');
                closeThreadView();
                fetchThreads();
            }
        } catch (error) {
            console.error('Error deleting thread:', error);
            toast.error('Failed to delete thread');
        }
    };

    // Migrate V1
    const handleMigrateV1 = async () => {
        if (!window.confirm('This will migrate all V1 feedback to V2 threads. Continue?')) {
            return;
        }

        setMigrating(true);
        try {
            const response = await adminAPI.feedbackV2.migrateV1();
            if (response.data.success) {
                toast.success(response.data.message);
                fetchThreads();
            }
        } catch (error) {
            console.error('Error migrating:', error);
            toast.error('Migration failed');
        } finally {
            setMigrating(false);
        }
    };

    // Open thread
    const openThread = (threadId) => {
        setSelectedThread(threadId);
        setShowAudit(false);
        fetchThreadDetails(threadId);
    };

    // Close thread view
    const closeThreadView = () => {
        setSelectedThread(null);
        setThreadDetails(null);
        setReplyMessage('');
        setShowAudit(false);
    };

    // Get relative time
    const getRelativeTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    // Render stats cards
    const renderStats = () => (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                const Icon = config.icon;
                return (
                    <div
                        key={key}
                        onClick={() => setFilters(prev => ({ ...prev, status: prev.status === key ? '' : key }))}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${filters.status === key
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Icon size={16} className="text-secondary-500" />
                            <span className="text-sm font-medium text-secondary-700">{config.label}</span>
                        </div>
                        <p className="text-2xl font-bold text-secondary-800 mt-1">{stats[key] || 0}</p>
                    </div>
                );
            })}
        </div>
    );

    // Render filters
    const renderFilters = () => (
        <div className={`mb-4 p-4 bg-gray-50 rounded-lg border ${showFilters ? 'block' : 'hidden'}`}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className="label text-xs">Priority</label>
                    <select
                        name="priority"
                        value={filters.priority}
                        onChange={handleFilterChange}
                        className="input"
                    >
                        <option value="">All Priorities</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>
                <div>
                    <label className="label text-xs">Type</label>
                    <select
                        name="type"
                        value={filters.type}
                        onChange={handleFilterChange}
                        className="input"
                    >
                        {TYPE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="label text-xs">From Role</label>
                    <select
                        name="createdByRole"
                        value={filters.createdByRole}
                        onChange={handleFilterChange}
                        className="input"
                    >
                        <option value="">All Roles</option>
                        <option value="student">Student</option>
                        <option value="faculty">Faculty</option>
                    </select>
                </div>
                <div>
                    <label className="label text-xs">Search</label>
                    <input
                        type="text"
                        name="search"
                        value={filters.search}
                        onChange={handleFilterChange}
                        placeholder="Search title..."
                        className="input"
                    />
                </div>
            </div>
            <div className="flex justify-end mt-3">
                <button onClick={clearFilters} className="btn-secondary text-sm">
                    Clear Filters
                </button>
            </div>
        </div>
    );

    // Render thread list
    const renderThreadList = () => (
        <div className="space-y-3">
            {threads.length === 0 ? (
                <div className="text-center py-12 text-secondary-500">
                    <FiInbox size={48} className="mx-auto mb-3 opacity-40" />
                    <p className="text-lg font-medium">No feedback threads found</p>
                    <p className="text-sm mt-1">Try adjusting your filters</p>
                </div>
            ) : (
                threads.map((thread) => {
                    const StatusIcon = STATUS_CONFIG[thread.status]?.icon || FiClock;
                    return (
                        <div
                            key={thread._id}
                            onClick={() => openThread(thread._id)}
                            className={`p-4 rounded-lg border-l-4 cursor-pointer transition-all hover:shadow-md bg-white ${PRIORITY_CONFIG[thread.priority]?.border || 'border-gray-300'
                                }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <StatusIcon size={16} className={
                                            thread.status === 'resolved' ? 'text-success-500' :
                                                thread.status === 'waiting_for_user' ? 'text-primary-500' :
                                                    thread.status === 'in_review' ? 'text-info-500' :
                                                        'text-warning-500'
                                        } />
                                        <h4 className="font-semibold text-secondary-800 truncate">
                                            {thread.title}
                                        </h4>
                                        {thread.migratedFromV1 && (
                                            <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-600 rounded">V1</span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-secondary-500">
                                        <span className={`px-2 py-0.5 rounded ${thread.createdByRole === 'student'
                                            ? 'bg-blue-50 text-blue-600'
                                            : 'bg-green-50 text-green-600'
                                            }`}>
                                            {thread.createdByRole}
                                        </span>
                                        <span>{thread.createdBy?.name || 'Unknown'}</span>
                                        <span>→</span>
                                        <span>{thread.targetRole === 'admin' ? 'Admin' : thread.targetUserId?.name || 'Faculty'}</span>
                                        <span>•</span>
                                        <span>{getRelativeTime(thread.lastMessageAt)}</span>
                                        <span>•</span>
                                        <span>{thread.messageCount} msg</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className={`badge ${STATUS_CONFIG[thread.status]?.color || 'badge-secondary'}`}>
                                        {STATUS_CONFIG[thread.status]?.label || thread.status}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_CONFIG[thread.priority]?.color}`}>
                                        <FiFlag size={10} className="inline mr-1" />
                                        {PRIORITY_CONFIG[thread.priority]?.label}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );

    // Render conversation view
    const renderConversation = () => {
        if (!threadDetails) {
            return (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
            );
        }

        const { thread, messages, auditLog } = threadDetails;

        return (
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b bg-gray-50">
                    <button
                        onClick={closeThreadView}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        <FiArrowLeft size={20} />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-secondary-800 truncate">{thread.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-secondary-500">
                            <span className={`px-2 py-0.5 rounded text-xs ${thread.createdByRole === 'student' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                                }`}>
                                {thread.createdByRole}
                            </span>
                            <span>{thread.createdBy?.name}</span>
                            <span>→</span>
                            <span>{thread.targetRole === 'admin' ? 'Admin' : thread.targetUserId?.name}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowAudit(!showAudit)}
                            className={`btn-secondary text-sm ${showAudit ? 'bg-gray-200' : ''}`}
                            title="View Audit Log"
                        >
                            <FiActivity size={16} />
                        </button>
                        <button
                            onClick={handleSoftDelete}
                            className="btn-secondary text-sm text-red-600 hover:text-red-700"
                            title="Delete Thread"
                        >
                            <FiTrash2 size={16} />
                        </button>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-4 p-3 border-b bg-white">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-secondary-500">Status:</span>
                        <select
                            value={thread.status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className="input py-1 text-sm"
                        >
                            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                <option key={key} value={key}>{config.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-secondary-500">Priority:</span>
                        <select
                            value={thread.priority}
                            onChange={(e) => handlePriorityChange(e.target.value)}
                            className={`input py-1 text-sm ${PRIORITY_CONFIG[thread.priority]?.color}`}
                        >
                            {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                                <option key={key} value={key}>{config.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1"></div>
                    <span className="text-xs text-secondary-400">
                        Type: <span className="font-medium text-secondary-600">{thread.type}</span>
                    </span>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Messages */}
                    <div className={`flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 ${showAudit ? 'w-2/3' : 'w-full'}`}>
                        {messages.map((msg) => {
                            const isAdmin = msg.senderRole === 'admin';
                            return (
                                <div key={msg._id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%]`}>
                                        <div className={`px-4 py-3 rounded-2xl ${isAdmin
                                            ? 'bg-purple-600 text-white rounded-br-md'
                                            : msg.senderRole === 'faculty'
                                                ? 'bg-green-100 border border-green-200 text-secondary-800 rounded-bl-md'
                                                : 'bg-white border border-gray-200 text-secondary-800 rounded-bl-md'
                                            }`}>
                                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                        </div>
                                        <div className={`flex items-center gap-2 mt-1 text-xs text-secondary-400 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                            <span className={isAdmin ? 'text-purple-500 font-medium' : ''}>
                                                {isAdmin ? '👑 Admin' : `${msg.senderRole}: ${msg.senderId?.name || 'Unknown'}`}
                                            </span>
                                            <span>•</span>
                                            <span>{getRelativeTime(msg.createdAt)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Audit Panel */}
                    {showAudit && (
                        <div className="w-1/3 border-l bg-white overflow-y-auto p-4">
                            <h4 className="font-semibold text-secondary-800 mb-3 flex items-center gap-2">
                                <FiActivity size={16} /> Audit Trail
                            </h4>
                            <div className="space-y-3">
                                {auditLog?.length === 0 ? (
                                    <p className="text-sm text-secondary-500">No audit entries</p>
                                ) : (
                                    auditLog?.map((entry) => (
                                        <div key={entry._id} className="text-xs border-l-2 border-gray-200 pl-3 py-1">
                                            <p className="font-medium text-secondary-700">
                                                {entry.action.replace('_', ' ').toUpperCase()}
                                            </p>
                                            <p className="text-secondary-500">
                                                {entry.performedBy?.name || 'System'} ({entry.performedByRole})
                                            </p>
                                            {entry.previousValue && entry.newValue && (
                                                <p className="text-secondary-400">
                                                    {entry.previousValue} → {entry.newValue}
                                                </p>
                                            )}
                                            <p className="text-secondary-400">{getRelativeTime(entry.createdAt)}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Reply Input */}
                <div className="p-4 border-t bg-white">
                    <div className="flex items-end gap-3">
                        <textarea
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            placeholder="Type your reply as Admin..."
                            className="input flex-1 resize-none"
                            rows={2}
                            maxLength={2000}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendReply();
                                }
                            }}
                        />
                        <button
                            onClick={handleSendReply}
                            disabled={sendingReply || !replyMessage.trim()}
                            className="btn-primary h-12 px-4 bg-purple-600 hover:bg-purple-700"
                        >
                            {sendingReply ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <FiSend size={18} />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Render create modal
    const renderCreateModal = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-semibold text-secondary-800">Create Feedback Thread</h3>
                    <button
                        onClick={() => setShowCreateModal(false)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <FiX size={20} />
                    </button>
                </div>
                <form onSubmit={handleCreateThread} className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group mb-0">
                            <label className="label">Send To *</label>
                            <select
                                name="targetRole"
                                value={formData.targetRole}
                                onChange={handleChange}
                                className="input"
                            >
                                <option value="faculty">Faculty</option>
                                <option value="admin">Admin (Internal)</option>
                            </select>
                        </div>
                        <div className="form-group mb-0">
                            <label className="label">Priority</label>
                            <select
                                name="priority"
                                value={formData.priority}
                                onChange={handleChange}
                                className="input"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    </div>

                    {formData.targetRole === 'faculty' && (
                        <div className="form-group mb-0">
                            <label className="label">Select Faculty *</label>
                            <select
                                name="targetUserId"
                                value={formData.targetUserId}
                                onChange={handleChange}
                                className="input"
                                required
                            >
                                <option value="">-- Select Faculty --</option>
                                {facultyList.map((f) => (
                                    <option key={f._id} value={f._id}>{f.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="form-group mb-0">
                        <label className="label">Type</label>
                        <select
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            className="input"
                        >
                            {TYPE_OPTIONS.filter(o => o.value).map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group mb-0">
                        <label className="label">Subject *</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            className="input"
                            placeholder="Brief subject"
                            maxLength={200}
                            required
                        />
                    </div>

                    <div className="form-group mb-0">
                        <label className="label">Message *</label>
                        <textarea
                            name="message"
                            value={formData.message}
                            onChange={handleChange}
                            className="input"
                            rows={4}
                            placeholder="Describe in detail..."
                            maxLength={2000}
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowCreateModal(false)}
                            className="btn-secondary"
                        >
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={submitting}>
                            <FiSend size={16} />
                            {submitting ? 'Creating...' : 'Create Thread'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return (
        <div className="animate-fade-in h-full flex flex-col">
            <Breadcrumb />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Feedback Management</h1>
                    <p className="text-secondary-500 mt-1">
                        Manage all feedback threads from students and faculty
                    </p>
                </div>
                <div className="flex items-center gap-3 mt-4 md:mt-0">
                    {lastFetched && (
                        <span className="text-xs text-secondary-400">
                            Updated {getRelativeTime(lastFetched)}
                        </span>
                    )}
                    <button
                        onClick={handleMigrateV1}
                        disabled={migrating}
                        className="btn-secondary text-sm"
                        title="Migrate V1 Feedback"
                    >
                        <FiDatabase size={16} />
                        {migrating ? 'Migrating...' : 'Migrate V1'}
                    </button>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`btn-secondary ${showFilters ? 'bg-gray-200' : ''}`}
                    >
                        <FiFilter size={16} />
                    </button>
                    <button
                        onClick={() => { fetchThreads(); if (selectedThread) fetchThreadDetails(selectedThread); }}
                        className="btn-secondary"
                    >
                        <FiRefreshCw size={16} />
                    </button>
                    {!selectedThread && (
                        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                            <FiPlus size={18} />
                            New Thread
                        </button>
                    )}
                </div>
            </div>

            {/* Stats */}
            {!selectedThread && renderStats()}

            {/* Filters */}
            {!selectedThread && renderFilters()}

            {/* Content */}
            <div className="card flex-1 overflow-hidden">
                {loading ? (
                    <SkeletonTable rows={5} />
                ) : selectedThread ? (
                    renderConversation()
                ) : (
                    renderThreadList()
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && renderCreateModal()}
        </div>
    );
};

export default AdminFeedback;
