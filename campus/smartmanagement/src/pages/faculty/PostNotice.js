import React, { useState, useEffect } from 'react';
import { facultyAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import { toast } from 'react-toastify';
import { FiBell, FiSend, FiEye, FiTrash2, FiClock } from 'react-icons/fi';
import Modal, { ConfirmModal } from '../../components/common/Modal';
import { getErrorMessage } from '../../utils/errorNormalizer';

const PostNotice = () => {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [selectedNotice, setSelectedNotice] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        type: 'class',
        priority: 'normal',
        targetAudience: 'students'
    });

    useEffect(() => {
        fetchNotices();
    }, []);

    const fetchNotices = async () => {
        try {
            setLoading(true);
            const response = await facultyAPI.getNotices();
            if (response.data.success) {
                setNotices(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching notices:', error);
            // Fallback demo data
            setNotices([
                { _id: '1', title: 'Internal Assessment - 2', content: 'IA-2 for CS301 will be held on Jan 25th in Room 101.', type: 'class', priority: 'high', createdAt: new Date().toISOString() },
                { _id: '2', title: 'Assignment Submission', content: 'Submit your lab reports by Friday evening.', type: 'class', priority: 'normal', createdAt: new Date(Date.now() - 86400000).toISOString() },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const response = await facultyAPI.postNotice(formData);
            if (response.data.success) {
                toast.success('Notice posted successfully');
                setFormData({ title: '', content: '', type: 'class', priority: 'normal', targetAudience: 'students' });
                fetchNotices();
            }
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to post notice'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <Breadcrumb items={[{ label: 'Dashboard', path: '/faculty/dashboard' }, { label: 'Post Notice', path: '/faculty/notices', isLast: true }]} />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Post Notice</h1>
                    <p className="text-secondary-500 mt-1">Announcements for your students and department</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Notice Form */}
                <div className="lg:col-span-1">
                    <div className="card sticky top-6">
                        <h3 className="card-title mb-4">Create Notice</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="form-group">
                                <label className="label">Title *</label>
                                <input
                                    type="text"
                                    name="title"
                                    className="input"
                                    placeholder="Notice title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="label">Type</label>
                                <select name="type" className="input" value={formData.type} onChange={handleChange}>
                                    <option value="global">Global</option>
                                    <option value="department">Department</option>
                                    <option value="class">Class</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label className="label">Priority</label>
                                    <select name="priority" className="input" value={formData.priority} onChange={handleChange}>
                                        <option value="low">Low</option>
                                        <option value="normal">Normal</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="label">Audience</label>
                                    <select name="targetAudience" className="input" value={formData.targetAudience} onChange={handleChange}>
                                        <option value="all">All</option>
                                        <option value="students">Students</option>
                                        <option value="faculty">Faculty</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="label">Content *</label>
                                <textarea
                                    name="content"
                                    className="input min-h-[150px]"
                                    placeholder="Write your notice here..."
                                    value={formData.content}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn-primary w-full shadow-lg shadow-primary-200"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    'Posting...'
                                ) : (
                                    <>
                                        <FiSend size={18} /> Post Announcement
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Previous Notices */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-bold text-secondary-800 px-1">Recently Posted</h3>
                    {loading ? (
                        [1, 2].map(i => <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-xl" />)
                    ) : notices.length === 0 ? (
                        <div className="card text-center py-12">
                            <FiBell size={32} className="text-secondary-300 mx-auto mb-3" />
                            <p className="text-secondary-500">No notices posted yet.</p>
                        </div>
                    ) : (
                        notices.map((notice) => (
                            <div key={notice._id} className="card hover:border-primary-200 transition-colors group">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className={`badge ${notice.priority === 'high' ? 'badge-danger' :
                                            notice.priority === 'normal' ? 'badge-primary' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {notice.priority}
                                        </span>
                                        <span className="badge bg-secondary-100 text-secondary-600 capitalize">
                                            {notice.type}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-secondary-400 flex items-center gap-1">
                                            <FiClock size={12} /> {new Date(notice.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <h4 className="font-bold text-secondary-800 text-lg mb-2">{notice.title}</h4>
                                <p className="text-secondary-600 text-sm line-clamp-2 md:line-clamp-none">
                                    {notice.content}
                                </p>
                                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="btn-icon bg-gray-50 text-secondary-500 hover:bg-gray-100">
                                        <FiEye size={16} />
                                    </button>
                                    <button className="btn-icon bg-danger-50 text-danger-500 hover:bg-danger-100">
                                        <FiTrash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default PostNotice;
