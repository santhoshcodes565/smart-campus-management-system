import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { facultyAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import {
    FiSend,
    FiMessageSquare,
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
    FiMail,
    FiCornerUpRight
} from 'react-icons/fi';
import { getErrorMessage } from '../../utils/errorNormalizer';

// Status configuration
const STATUS_CONFIG = {
    open: { label: 'Open', color: 'badge-warning', icon: FiClock },
    in_review: { label: 'In Review', color: 'badge-info', icon: FiAlertCircle },
    waiting_for_user: { label: 'Awaiting Response', color: 'badge-primary', icon: FiMessageSquare },
    resolved: { label: 'Resolved', color: 'badge-success', icon: FiCheckCircle },
    closed: { label: 'Closed', color: 'badge-secondary', icon: FiCheckCircle }
};

const PRIORITY_CONFIG = {
    low: { label: 'Low', color: 'text-green-600 bg-green-50' },
    medium: { label: 'Medium', color: 'text-yellow-600 bg-yellow-50' },
    high: { label: 'High', color: 'text-red-600 bg-red-50' }
};

const TYPE_OPTIONS = [
    { value: 'general', label: 'General' },
    { value: 'academic', label: 'Academic' },
    { value: 'technical', label: 'Technical' },
    { value: 'complaint', label: 'Complaint' },
    { value: 'suggestion', label: 'Suggestion' }
];

const FacultyFeedback = () => {
    // State
    const [threads, setThreads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('received'); // 'received' or 'sent'
    const [selectedThread, setSelectedThread] = useState(null);
    const [threadDetails, setThreadDetails] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [replyMessage, setReplyMessage] = useState('');
    const [sendingReply, setSendingReply] = useState(false);
    const [lastFetched, setLastFetched] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        message: '',
        type: 'general'
    });

    // Fetch threads
    const fetchThreads = useCallback(async () => {
        try {
            const response = await facultyAPI.feedbackV2.getThreads();
            if (response.data.success) {
                setThreads(response.data.data);
                setLastFetched(new Date());
            }
        } catch (error) {
            console.error('Error fetching threads:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch single thread details
    const fetchThreadDetails = async (threadId) => {
        try {
            const response = await facultyAPI.feedbackV2.getThread(threadId);
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

    // Filter threads by tab
    const filteredThreads = threads.filter(thread => {
        if (activeTab === 'received') {
            // Threads addressed to faculty (from students)
            return thread.targetRole === 'faculty';
        } else {
            // Threads created by faculty (to admin)
            return thread.createdByRole === 'faculty';
        }
    });

    // Handle form changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Create new thread (to admin only)
    const handleCreateThread = async (e) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            toast.error('Please enter a title');
            return;
        }

        if (!formData.message.trim()) {
            toast.error('Please enter a message');
            return;
        }

        setSubmitting(true);
        try {
            const response = await facultyAPI.feedbackV2.createThread({
                title: formData.title.trim(),
                targetRole: 'admin', // Faculty can only send to admin
                message: formData.message.trim(),
                type: formData.type
            });

            if (response.data.success) {
                toast.success('Feedback submitted successfully!');
                setShowCreateModal(false);
                setFormData({
                    title: '',
                    message: '',
                    type: 'general'
                });
                setActiveTab('sent');
                fetchThreads();
            }
        } catch (error) {
            console.error('Error creating thread:', error);
            toast.error(getErrorMessage(error, 'Failed to submit feedback'));
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
            const response = await facultyAPI.feedbackV2.replyToThread(selectedThread, {
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

    // Open thread
    const openThread = (threadId) => {
        setSelectedThread(threadId);
        fetchThreadDetails(threadId);
    };

    // Close thread view
    const closeThreadView = () => {
        setSelectedThread(null);
        setThreadDetails(null);
        setReplyMessage('');
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

    // Render tabs
    const renderTabs = () => (
        <div className="flex border-b mb-4">
            <button
                onClick={() => setActiveTab('received')}
                className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'received'
                    ? 'border-primary-600 text-primary-600 font-medium'
                    : 'border-transparent text-secondary-500 hover:text-secondary-700'
                    }`}
            >
                <FiInbox className="inline mr-2" size={16} />
                Received
                <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 rounded-full">
                    {threads.filter(t => t.targetRole === 'faculty').length}
                </span>
            </button>
            <button
                onClick={() => setActiveTab('sent')}
                className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'sent'
                    ? 'border-primary-600 text-primary-600 font-medium'
                    : 'border-transparent text-secondary-500 hover:text-secondary-700'
                    }`}
            >
                <FiCornerUpRight className="inline mr-2" size={16} />
                Sent to Admin
                <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 rounded-full">
                    {threads.filter(t => t.createdByRole === 'faculty').length}
                </span>
            </button>
        </div>
    );

    // Render thread list
    const renderThreadList = () => (
        <div className="space-y-3">
            {filteredThreads.length === 0 ? (
                <div className="text-center py-12 text-secondary-500">
                    <FiInbox size={48} className="mx-auto mb-3 opacity-40" />
                    <p className="text-lg font-medium">
                        {activeTab === 'received' ? 'No feedback received yet' : 'No feedback sent yet'}
                    </p>
                    {activeTab === 'sent' && (
                        <p className="text-sm mt-1">Click "New Feedback" to send feedback to admin</p>
                    )}
                </div>
            ) : (
                filteredThreads.map((thread) => {
                    const StatusIcon = STATUS_CONFIG[thread.status]?.icon || FiClock;
                    const isReceived = activeTab === 'received';

                    return (
                        <div
                            key={thread._id}
                            onClick={() => openThread(thread._id)}
                            className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${thread.status === 'waiting_for_user' && !isReceived
                                ? 'border-primary-300 bg-primary-50/50'
                                : thread.status === 'open' && isReceived
                                    ? 'border-warning-300 bg-warning-50/50'
                                    : 'border-gray-200 bg-white hover:border-primary-200'
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
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-secondary-500">
                                        {isReceived ? (
                                            <span className="flex items-center gap-1">
                                                <FiMail size={12} /> From {thread.createdBy?.name || 'Student'}
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1">
                                                <FiUsers size={12} /> To Admin
                                            </span>
                                        )}
                                        <span>•</span>
                                        <span>{getRelativeTime(thread.lastMessageAt)}</span>
                                        <span>•</span>
                                        <span>{thread.messageCount} message{thread.messageCount > 1 ? 's' : ''}</span>
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

        const { thread, messages } = threadDetails;
        const canReply = thread.isActive;

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
                            <span className={`badge ${STATUS_CONFIG[thread.status]?.color || 'badge-secondary'}`}>
                                {STATUS_CONFIG[thread.status]?.label}
                            </span>
                            <span>•</span>
                            <span>
                                {thread.createdByRole === 'student'
                                    ? `From ${thread.createdBy?.name || 'Student'}`
                                    : 'To Admin'
                                }
                            </span>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {messages.map((msg) => {
                        const isOwn = msg.senderRole === 'faculty';
                        return (
                            <div key={msg._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] ${isOwn ? 'order-2' : 'order-1'}`}>
                                    <div className={`px-4 py-3 rounded-2xl ${isOwn
                                        ? 'bg-primary-600 text-white rounded-br-md'
                                        : msg.senderRole === 'admin'
                                            ? 'bg-purple-100 border border-purple-200 text-secondary-800 rounded-bl-md'
                                            : 'bg-white border border-gray-200 text-secondary-800 rounded-bl-md'
                                        }`}>
                                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                    </div>
                                    <div className={`flex items-center gap-2 mt-1 text-xs text-secondary-400 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                        <span className={msg.senderRole === 'admin' ? 'text-purple-500 font-medium' : ''}>
                                            {msg.senderRole === 'admin' ? '👑 Admin' : msg.senderId?.name || 'Unknown'}
                                        </span>
                                        <span>•</span>
                                        <span>{getRelativeTime(msg.createdAt)}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Reply Input */}
                {canReply ? (
                    <div className="p-4 border-t bg-white">
                        <div className="flex items-end gap-3">
                            <textarea
                                value={replyMessage}
                                onChange={(e) => setReplyMessage(e.target.value)}
                                placeholder="Type your reply..."
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
                                className="btn-primary h-12 px-4"
                            >
                                {sendingReply ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                ) : (
                                    <FiSend size={18} />
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 border-t bg-gray-100 text-center text-secondary-500">
                        <FiCheckCircle className="inline mr-2" />
                        This thread is {thread.status}. No further replies allowed.
                    </div>
                )}
            </div>
        );
    };

    // Render create modal
    const renderCreateModal = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-semibold text-secondary-800">New Feedback to Admin</h3>
                    <button
                        onClick={() => setShowCreateModal(false)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <FiX size={20} />
                    </button>
                </div>
                <form onSubmit={handleCreateThread} className="p-4 space-y-4">
                    <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                        <FiUsers className="inline mr-2" />
                        This feedback will be sent to the Admin / Management team.
                    </div>

                    {/* Type */}
                    <div className="form-group mb-0">
                        <label className="label">Category</label>
                        <select
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            className="input"
                        >
                            {TYPE_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Title */}
                    <div className="form-group mb-0">
                        <label className="label">Subject *</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            className="input"
                            placeholder="Brief subject of your feedback"
                            maxLength={200}
                            required
                        />
                    </div>

                    {/* Message */}
                    <div className="form-group mb-0">
                        <label className="label">Message *</label>
                        <textarea
                            name="message"
                            value={formData.message}
                            onChange={handleChange}
                            className="input"
                            rows={4}
                            placeholder="Describe your feedback in detail..."
                            maxLength={2000}
                            required
                        />
                    </div>

                    {/* Actions */}
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
                            {submitting ? 'Submitting...' : 'Submit Feedback'}
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
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Feedback</h1>
                    <p className="text-secondary-500 mt-1">
                        View student feedback and communicate with administration
                    </p>
                </div>
                <div className="flex items-center gap-3 mt-4 md:mt-0">
                    {lastFetched && (
                        <span className="text-xs text-secondary-400">
                            Updated {getRelativeTime(lastFetched)}
                        </span>
                    )}
                    <button
                        onClick={() => { fetchThreads(); if (selectedThread) fetchThreadDetails(selectedThread); }}
                        className="btn-secondary"
                        title="Refresh"
                    >
                        <FiRefreshCw size={16} />
                    </button>
                    {!selectedThread && (
                        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                            <FiPlus size={18} />
                            Send to Admin
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="card flex-1 overflow-hidden">
                {loading ? (
                    <SkeletonTable rows={5} />
                ) : selectedThread ? (
                    renderConversation()
                ) : (
                    <>
                        {renderTabs()}
                        {renderThreadList()}
                    </>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && renderCreateModal()}
        </div>
    );
};

export default FacultyFeedback;
