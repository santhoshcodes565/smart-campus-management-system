import React, { useState, useEffect } from 'react';
import { facultyAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import { toast } from 'react-toastify';
import { FiClock, FiCheck, FiX, FiInfo, FiCalendar, FiUser } from 'react-icons/fi';
import Modal from '../../components/common/Modal';

const LeaveRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const response = await facultyAPI.getLeaveRequests();
            if (response.data.success) {
                setRequests(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching leave requests:', error);
            // Fallback demo data
            setRequests([
                { _id: '1', studentId: { name: 'John Doe', rollNo: 'CS2021001' }, leaveType: 'Medical', fromDate: '2024-01-20', toDate: '2024-01-22', reason: 'Fever and cold. Doctor advised rest.', status: 'pending', createdAt: new Date().toISOString() },
                { _id: '2', studentId: { name: 'Jane Smith', rollNo: 'CS2021002' }, leaveType: 'Personal', fromDate: '2024-01-18', toDate: '2024-01-18', reason: 'Family function at home.', status: 'pending', createdAt: new Date(Date.now() - 86400000).toISOString() },
                { _id: '3', studentId: { name: 'Mike Johnson', rollNo: 'CS2021003' }, leaveType: 'Other', fromDate: '2024-01-15', toDate: '2024-01-16', reason: 'Attending regional hackathon.', status: 'approved', createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            setIsSubmitting(true);
            const response = await facultyAPI.updateLeaveStatus(id, status);
            if (response.data.success) {
                toast.success(`Leave request ${status} successfully`);
                fetchRequests();
                setShowDetailModal(false);
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update status');
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
                            {requests.map((request) => (
                                <tr key={request._id}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-xs font-bold">
                                                {request.studentId?.name?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-secondary-800">{request.studentId?.name}</p>
                                                <p className="text-xs text-secondary-500">{request.studentId?.rollNo}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge ${request.leaveType === 'Medical' ? 'bg-danger-50 text-danger-600' :
                                                request.leaveType === 'Personal' ? 'bg-warning-50 text-warning-600' : 'bg-blue-50 text-blue-600'
                                            }`}>
                                            {request.leaveType}
                                        </span>
                                    </td>
                                    <td>
                                        <p className="text-sm font-medium text-secondary-700">
                                            {new Date(request.fromDate).toLocaleDateString()} - {new Date(request.toDate).toLocaleDateString()}
                                        </p>
                                    </td>
                                    <td>
                                        <span className={`badge ${request.status === 'pending' ? 'badge-warning' :
                                                request.status === 'approved' ? 'badge-success' : 'badge-danger'
                                            }`}>
                                            {request.status}
                                        </span>
                                    </td>
                                    <td className="text-secondary-500 text-sm">
                                        {new Date(request.createdAt).toLocaleDateString()}
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
                                                        onClick={() => handleStatusUpdate(request._id, 'approved')}
                                                        className="btn-icon bg-success-50 text-success-600 hover:bg-success-100"
                                                        disabled={isSubmitting}
                                                    >
                                                        <FiCheck size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusUpdate(request._id, 'rejected')}
                                                        className="btn-icon bg-danger-50 text-danger-600 hover:bg-danger-100"
                                                        disabled={isSubmitting}
                                                    >
                                                        <FiX size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
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
                                {selectedRequest.studentId?.name?.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold text-secondary-800 text-lg">{selectedRequest.studentId?.name}</h3>
                                <p className="text-secondary-500 text-sm">Roll No: {selectedRequest.studentId?.rollNo}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-secondary-500 uppercase tracking-wider mb-1">Leave Type</p>
                                <p className="font-semibold text-secondary-800">{selectedRequest.leaveType}</p>
                            </div>
                            <div>
                                <p className="text-xs text-secondary-500 uppercase tracking-wider mb-1">Status</p>
                                <span className={`badge ${selectedRequest.status === 'pending' ? 'badge-warning' :
                                        selectedRequest.status === 'approved' ? 'badge-success' : 'badge-danger'
                                    }`}>
                                    {selectedRequest.status}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs text-secondary-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <FiCalendar size={12} /> From Date
                                </p>
                                <p className="font-semibold text-secondary-800">{new Date(selectedRequest.fromDate).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <p className="text-xs text-secondary-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <FiCalendar size={12} /> To Date
                                </p>
                                <p className="font-semibold text-secondary-800">{new Date(selectedRequest.toDate).toLocaleDateString()}</p>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs text-secondary-500 uppercase tracking-wider mb-1">Reason</p>
                            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-secondary-700 text-sm italic">
                                "{selectedRequest.reason}"
                            </div>
                        </div>

                        {selectedRequest.status === 'pending' && (
                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => handleStatusUpdate(selectedRequest._id, 'approved')}
                                    className="btn-success flex-1"
                                    disabled={isSubmitting}
                                >
                                    Approve Request
                                </button>
                                <button
                                    onClick={() => handleStatusUpdate(selectedRequest._id, 'rejected')}
                                    className="btn-danger flex-1"
                                    disabled={isSubmitting}
                                >
                                    Reject Request
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
        </div>
    );
};

export default LeaveRequests;
