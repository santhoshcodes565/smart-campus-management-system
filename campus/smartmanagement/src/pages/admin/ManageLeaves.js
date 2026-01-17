import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonTable, SkeletonCard } from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import { toast } from 'react-toastify';
import {
    FiCalendar, FiCheck, FiX, FiClock, FiUser, FiUsers,
    FiTrendingUp, FiFileText, FiFilter, FiBarChart2
} from 'react-icons/fi';
import { getErrorMessage } from '../../utils/errorNormalizer';
import {
    formatLeaveDate,
    getDaysBetween,
    getLeaveTypeInfo,
    getStatusInfo
} from '../../utils/leaveHelpers';

const ManageLeaves = () => {
    const [activeTab, setActiveTab] = useState('faculty');
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [stats, setStats] = useState(null);
    const [analytics, setAnalytics] = useState(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState(null);
    const [action, setAction] = useState('');
    const [remarks, setRemarks] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (activeTab === 'faculty') {
            fetchFacultyLeaves();
        } else if (activeTab === 'analytics') {
            fetchAnalytics();
        }
    }, [activeTab, statusFilter]);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchFacultyLeaves = async () => {
        try {
            setLoading(true);
            const params = {};
            if (statusFilter) params.status = statusFilter;
            const response = await adminAPI.getFacultyLeaves(params);
            if (response.data.success) {
                setLeaves(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching leaves:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await adminAPI.getLeaveStats();
            if (response.data.success) {
                setStats(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getLeaveAnalytics();
            if (response.data.success) {
                setAnalytics(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const openActionModal = (leave, actionType) => {
        setSelectedLeave(leave);
        setAction(actionType);
        setRemarks('');
        setShowModal(true);
    };

    const handleAction = async () => {
        if (action === 'reject' && !remarks.trim()) {
            return toast.error('Please provide remarks for rejection');
        }

        setIsSubmitting(true);
        try {
            if (action === 'approve') {
                await adminAPI.approveFacultyLeave(selectedLeave._id, { remarks });
                toast.success('Leave approved successfully');
            } else {
                await adminAPI.rejectFacultyLeave(selectedLeave._id, { remarks });
                toast.success('Leave rejected');
            }
            setShowModal(false);
            fetchFacultyLeaves();
            fetchStats();
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to process leave'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const tabs = [
        { id: 'faculty', label: 'Faculty Leaves', icon: FiUser },
        { id: 'analytics', label: 'Analytics', icon: FiBarChart2 }
    ];

    return (
        <div className="animate-fade-in">
            <Breadcrumb items={[
                { label: 'Dashboard', path: '/admin/dashboard' },
                { label: 'Leave Management', path: '/admin/leaves', isLast: true }
            ]} />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Leave Management</h1>
                    <p className="text-secondary-500 mt-1">Manage faculty leave requests and view analytics</p>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="card bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-yellow-500 rounded-lg text-white">
                                <FiClock size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-yellow-600">Pending Faculty</p>
                                <p className="text-2xl font-bold text-yellow-700">{stats.pendingFacultyLeaves}</p>
                            </div>
                        </div>
                    </div>
                    <div className="card bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-500 rounded-lg text-white">
                                <FiUsers size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-blue-600">Pending Students</p>
                                <p className="text-2xl font-bold text-blue-700">{stats.pendingStudentLeaves}</p>
                            </div>
                        </div>
                    </div>
                    <div className="card bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-green-500 rounded-lg text-white">
                                <FiCheck size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-green-600">Total Approved</p>
                                <p className="text-2xl font-bold text-green-700">{stats.totalApproved}</p>
                            </div>
                        </div>
                    </div>
                    <div className="card bg-gradient-to-r from-red-50 to-red-100 border-red-200">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-red-500 rounded-lg text-white">
                                <FiX size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-red-600">Total Rejected</p>
                                <p className="text-2xl font-bold text-red-700">{stats.totalRejected}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-primary-500 text-primary-600 font-medium'
                                : 'border-transparent text-secondary-500 hover:text-secondary-700'
                            }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Faculty Leaves Tab */}
            {activeTab === 'faculty' && (
                <div className="card">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <h2 className="text-lg font-semibold text-secondary-800 flex items-center gap-2">
                            <FiUser className="text-primary-600" />
                            Faculty Leave Requests
                        </h2>
                        <div className="flex gap-2">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="input w-40"
                            >
                                <option value="">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <SkeletonTable rows={5} />
                    ) : leaves.length === 0 ? (
                        <EmptyState
                            icon={FiCalendar}
                            title="No leave requests"
                            description="There are no faculty leave requests to display."
                        />
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Faculty</th>
                                        <th>Type</th>
                                        <th>Duration</th>
                                        <th>Reason</th>
                                        <th>Status</th>
                                        <th>Applied On</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaves.map((leave) => {
                                        const typeInfo = getLeaveTypeInfo(leave.leaveType);
                                        const statusInfo = getStatusInfo(leave.status);

                                        return (
                                            <tr key={leave._id}>
                                                <td>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-xs font-bold">
                                                            {leave.applicantId?.name?.charAt(0) || 'F'}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-secondary-800">
                                                                {leave.applicantId?.name || 'Unknown'}
                                                            </p>
                                                            <p className="text-xs text-secondary-500">
                                                                {leave.applicantId?.department || '-'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`flex items-center gap-1 ${typeInfo.color}`}>
                                                        <span>{typeInfo.icon}</span>
                                                        {typeInfo.label}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="text-sm">
                                                        <p className="font-medium">
                                                            {formatLeaveDate(leave.fromDate)} - {formatLeaveDate(leave.toDate)}
                                                        </p>
                                                        <p className="text-secondary-500">
                                                            {getDaysBetween(leave.fromDate, leave.toDate)} day(s)
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="max-w-xs truncate">{leave.reason}</td>
                                                <td>
                                                    <span className={`badge ${statusInfo.color}`}>
                                                        {statusInfo.icon} {statusInfo.label}
                                                    </span>
                                                </td>
                                                <td className="text-sm text-secondary-500">
                                                    {formatLeaveDate(leave.createdAt)}
                                                </td>
                                                <td>
                                                    {leave.status === 'pending' ? (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => openActionModal(leave, 'approve')}
                                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                                                title="Approve"
                                                            >
                                                                <FiCheck size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => openActionModal(leave, 'reject')}
                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                                title="Reject"
                                                            >
                                                                <FiX size={16} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-secondary-400">
                                                            {leave.remarks || '-'}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
                <div className="space-y-6">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <SkeletonCard />
                            <SkeletonCard />
                        </div>
                    ) : analytics ? (
                        <>
                            {/* Overview Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="card text-center">
                                    <p className="text-3xl font-bold text-primary-600">{analytics.overview.total}</p>
                                    <p className="text-secondary-500">Total Leaves</p>
                                </div>
                                <div className="card text-center">
                                    <p className="text-3xl font-bold text-green-600">{analytics.overview.approved}</p>
                                    <p className="text-secondary-500">Approved</p>
                                </div>
                                <div className="card text-center">
                                    <p className="text-3xl font-bold text-red-600">{analytics.overview.rejected}</p>
                                    <p className="text-secondary-500">Rejected</p>
                                </div>
                                <div className="card text-center">
                                    <p className="text-3xl font-bold text-yellow-600">{analytics.overview.pending}</p>
                                    <p className="text-secondary-500">Pending</p>
                                </div>
                            </div>

                            {/* Role Breakdown */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="card">
                                    <h3 className="font-semibold text-secondary-800 mb-4">By Role</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                            <span className="flex items-center gap-2">
                                                <FiUsers className="text-blue-500" />
                                                Students
                                            </span>
                                            <span className="font-bold text-blue-600">{analytics.byRole.student}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                                            <span className="flex items-center gap-2">
                                                <FiUser className="text-purple-500" />
                                                Faculty
                                            </span>
                                            <span className="font-bold text-purple-600">{analytics.byRole.faculty}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="card">
                                    <h3 className="font-semibold text-secondary-800 mb-4">By Type</h3>
                                    <div className="space-y-2">
                                        {analytics.byType?.map((type) => {
                                            const typeInfo = getLeaveTypeInfo(type._id);
                                            return (
                                                <div key={type._id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                                    <span className="flex items-center gap-2">
                                                        <span>{typeInfo.icon}</span>
                                                        {typeInfo.label}
                                                    </span>
                                                    <span className="font-medium">{type.count}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Approval Rate */}
                            <div className="card">
                                <h3 className="font-semibold text-secondary-800 mb-4">Approval Rate</h3>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-green-500 rounded-full"
                                            style={{ width: `${analytics.overview.approvalRate}%` }}
                                        />
                                    </div>
                                    <span className="text-lg font-bold text-secondary-800">
                                        {analytics.overview.approvalRate}%
                                    </span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <EmptyState
                            icon={FiBarChart2}
                            title="No analytics data"
                            description="Analytics data will appear once there are leave requests."
                        />
                    )}
                </div>
            )}

            {/* Action Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={action === 'approve' ? 'Approve Leave' : 'Reject Leave'}
            >
                <div className="space-y-4">
                    {selectedLeave && (
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="font-medium">{selectedLeave.applicantId?.name}</p>
                            <p className="text-sm text-secondary-500">
                                {formatLeaveDate(selectedLeave.fromDate)} - {formatLeaveDate(selectedLeave.toDate)}
                            </p>
                            <p className="text-sm mt-2">{selectedLeave.reason}</p>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="label">
                            Remarks {action === 'reject' ? '*' : '(optional)'}
                        </label>
                        <textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            className="input"
                            rows={3}
                            placeholder={action === 'approve'
                                ? 'Add optional remarks...'
                                : 'Please provide a reason for rejection...'}
                            required={action === 'reject'}
                        />
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setShowModal(false)}
                            className="btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAction}
                            className={action === 'approve' ? 'btn-success' : 'btn-danger'}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Processing...' : action === 'approve' ? 'Approve' : 'Reject'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ManageLeaves;
