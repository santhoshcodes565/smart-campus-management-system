import React, { useState, useEffect } from 'react';
import { facultyAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import { toast } from 'react-toastify';
import { FiClock, FiCheck, FiX, FiInfo, FiCalendar, FiUser } from 'react-icons/fi';
import Modal from '../../components/common/Modal';
import { getErrorMessage } from '../../utils/errorNormalizer';
import { getLeaveTypeInfo, getStatusInfo, formatLeaveDate, getDaysBetween } from '../../utils/leaveHelpers';

const LeaveRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showActionModal, setShowActionModal] = useState(false);
    const [actionType, setActionType] = useState('');
    const [remarks, setRemarks] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const response = await facultyAPI.getLeaveRequests();
            if (response.data.success) {
                setRequests(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching leave requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const openActionModal = (request, action) => {
        setSelectedRequest(request);
        setActionType(action);
        setRemarks('');
        setShowActionModal(true);
    };

    const handleAction = async () => {
        if (actionType === 'rejected' && !remarks.trim()) {
            return toast.error('Please provide remarks for rejection');
        }

        setIsSubmitting(true);
        try {
            if (actionType === 'approved') {
                await facultyAPI.approveStudentLeave(selectedRequest._id, { remarks });
                toast.success('Leave approved successfully');
            } else {
                await facultyAPI.rejectStudentLeave(selectedRequest._id, { remarks });
                toast.success('Leave rejected');
            }
            setShowActionModal(false);
            setShowDetailModal(false);
            fetchRequests();
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to update status'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <Breadcrumb items={[{ label: 'Dashboard', path: '/faculty/dashboard' }, { label: 'Leave Requests', path: '/faculty/leaves', isLast: true }]} />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Leave Requests</h1>
                    <p className="text-secondary-500 mt-1">Review and manage student leave applications</p>
                </div>
            </div>

            {/* Requests Table */}
            {loading ? (
                <SkeletonTable rows={5} />
            ) : requests.length === 0 ? (
                <EmptyState
                    icon={FiClock}
                    title="No leave requests"
                    description="There are no pending or past leave requests to display."
                />
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Type</th>
                                <th>Duration</th>
                                <th>Status</th>
                                <th>Applied On</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map((request) => {
                                const typeInfo = getLeaveTypeInfo(request.leaveType);
                                const statusInfo = getStatusInfo(request.status);

                                return (
                                    <tr key={request._id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-xs font-bold">
                                                    {request.applicantId?.name?.charAt(0) || 'S'}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-secondary-800">{request.applicantId?.name || 'Unknown'}</p>
                                                    <p className="text-xs text-secondary-500">{request.applicantId?.email}</p>
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
                                                <p className="font-medium text-secondary-700">
                                                    {formatLeaveDate(request.fromDate)} - {formatLeaveDate(request.toDate)}
                                                </p>
                                                <p className="text-secondary-500">
                                                    {getDaysBetween(request.fromDate, request.toDate)} day(s)
                                                </p>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${statusInfo.color}`}>
                                                {statusInfo.icon} {statusInfo.label}
                                            </span>
                                        </td>
                                        <td className="text-secondary-500 text-sm">
                                            {formatLeaveDate(request.createdAt)}
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => { setSelectedRequest(request); setShowDetailModal(true); }}
                                                    className="btn-icon bg-gray-100 text-secondary-600 hover:bg-gray-200"
                                                >
                                                    <FiInfo size={16} />
                                                </button>
                                                {request.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => openActionModal(request, 'approved')}
                                                            className="btn-icon bg-success-50 text-success-600 hover:bg-success-100"
                                                        >
                                                            <FiCheck size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => openActionModal(request, 'rejected')}
                                                            className="btn-icon bg-danger-50 text-danger-600 hover:bg-danger-100"
                                                        >
                                                            <FiX size={16} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Detail Modal */}
            <Modal
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                title="Leave Application Details"
            >
                {selectedRequest && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-lg">
                                {selectedRequest.applicantId?.name?.charAt(0) || 'S'}
                            </div>
                            <div>
                                <h3 className="font-bold text-secondary-800 text-lg">{selectedRequest.applicantId?.name}</h3>
                                <p className="text-secondary-500 text-sm">{selectedRequest.applicantId?.email}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-secondary-500 uppercase tracking-wider mb-1">Leave Type</p>
                                <p className="font-semibold text-secondary-800">{getLeaveTypeInfo(selectedRequest.leaveType).label}</p>
                            </div>
                            <div>
                                <p className="text-xs text-secondary-500 uppercase tracking-wider mb-1">Status</p>
                                <span className={`badge ${getStatusInfo(selectedRequest.status).color}`}>
                                    {getStatusInfo(selectedRequest.status).label}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs text-secondary-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <FiCalendar size={12} /> From Date
                                </p>
                                <p className="font-semibold text-secondary-800">{formatLeaveDate(selectedRequest.fromDate)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-secondary-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <FiCalendar size={12} /> To Date
                                </p>
                                <p className="font-semibold text-secondary-800">{formatLeaveDate(selectedRequest.toDate)}</p>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs text-secondary-500 uppercase tracking-wider mb-1">Reason</p>
                            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-secondary-700 text-sm italic">
                                "{selectedRequest.reason}"
                            </div>
                        </div>

                        {selectedRequest.remarks && (
                            <div>
                                <p className="text-xs text-secondary-500 uppercase tracking-wider mb-1">Remarks</p>
                                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-secondary-700 text-sm">
                                    {selectedRequest.remarks}
                                </div>
                            </div>
                        )}

                        {selectedRequest.status === 'pending' && (
                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => { setShowDetailModal(false); openActionModal(selectedRequest, 'approved'); }}
                                    className="btn-success flex-1"
                                >
                                    Approve
                                </button>
                                <button
                                    onClick={() => { setShowDetailModal(false); openActionModal(selectedRequest, 'rejected'); }}
                                    className="btn-danger flex-1"
                                >
                                    Reject
                                </button>
                            </div>
                        )}
                        <button
                            onClick={() => setShowDetailModal(false)}
                            className="btn-secondary w-full"
                        >
                            Close
                        </button>
                    </div>
                )}
            </Modal>

            {/* Action Modal with Remarks */}
            <Modal
                isOpen={showActionModal}
                onClose={() => setShowActionModal(false)}
                title={actionType === 'approved' ? 'Approve Leave' : 'Reject Leave'}
            >
                <div className="space-y-4">
                    {selectedRequest && (
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="font-medium">{selectedRequest.applicantId?.name}</p>
                            <p className="text-sm text-secondary-500">
                                {formatLeaveDate(selectedRequest.fromDate)} - {formatLeaveDate(selectedRequest.toDate)}
                            </p>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="label">
                            Remarks {actionType === 'rejected' ? '*' : '(optional)'}
                        </label>
                        <textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            className="input"
                            rows={3}
                            placeholder={actionType === 'approved'
                                ? 'Add optional remarks...'
                                : 'Please provide a reason for rejection...'}
                            required={actionType === 'rejected'}
                        />
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setShowActionModal(false)}
                            className="btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAction}
                            className={actionType === 'approved' ? 'btn-success' : 'btn-danger'}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Processing...' : actionType === 'approved' ? 'Approve' : 'Reject'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default LeaveRequests;
