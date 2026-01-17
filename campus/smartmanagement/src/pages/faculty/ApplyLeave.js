import React, { useState, useEffect } from 'react';
import { facultyAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import { toast } from 'react-toastify';
import { FiCalendar, FiSend, FiClock, FiCheck, FiX, FiFileText } from 'react-icons/fi';
import { getErrorMessage } from '../../utils/errorNormalizer';
import {
    LEAVE_TYPES,
    validateLeaveDates,
    getDaysBetween,
    formatLeaveDate,
    getLeaveTypeInfo,
    getStatusInfo
} from '../../utils/leaveHelpers';

const ApplyLeave = () => {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        leaveType: 'casual',
        fromDate: '',
        toDate: '',
        reason: ''
    });

    useEffect(() => {
        fetchMyLeaves();
    }, []);

    const fetchMyLeaves = async () => {
        try {
            setLoading(true);
            const response = await facultyAPI.getMyLeaves();
            if (response.data.success) {
                setLeaves(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching leaves:', error);
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

        // Validate dates
        const validation = validateLeaveDates(formData.fromDate, formData.toDate);
        if (!validation.valid) {
            return toast.error(validation.error);
        }

        if (!formData.reason.trim()) {
            return toast.error('Please provide a reason for your leave');
        }

        if (formData.reason.trim().length < 10) {
            return toast.error('Reason must be at least 10 characters');
        }

        setIsSubmitting(true);
        try {
            const response = await facultyAPI.applyLeave(formData);
            if (response.data.success) {
                toast.success('Leave application submitted successfully');
                setFormData({ leaveType: 'casual', fromDate: '', toDate: '', reason: '' });
                fetchMyLeaves();
            }
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to submit leave application'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const getDuration = () => {
        if (formData.fromDate && formData.toDate) {
            const days = getDaysBetween(formData.fromDate, formData.toDate);
            return days > 0 ? `${days} day${days > 1 ? 's' : ''}` : '';
        }
        return '';
    };

    return (
        <div className="animate-fade-in">
            <Breadcrumb items={[
                { label: 'Dashboard', path: '/faculty/dashboard' },
                { label: 'Apply Leave', path: '/faculty/apply-leave', isLast: true }
            ]} />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Apply for Leave</h1>
                    <p className="text-secondary-500 mt-1">Submit your leave request for admin approval</p>
                </div>
            </div>

            {/* Application Form */}
            <div className="card mb-6">
                <h2 className="text-lg font-semibold text-secondary-800 mb-4 flex items-center gap-2">
                    <FiFileText className="text-primary-600" />
                    Leave Application Form
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="form-group">
                            <label className="label">Leave Type *</label>
                            <select
                                name="leaveType"
                                value={formData.leaveType}
                                onChange={handleChange}
                                className="input"
                                required
                            >
                                {LEAVE_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.icon} {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="label">From Date *</label>
                            <input
                                type="date"
                                name="fromDate"
                                value={formData.fromDate}
                                onChange={handleChange}
                                className="input"
                                min={new Date().toISOString().split('T')[0]}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="label">To Date *</label>
                            <input
                                type="date"
                                name="toDate"
                                value={formData.toDate}
                                onChange={handleChange}
                                className="input"
                                min={formData.fromDate || new Date().toISOString().split('T')[0]}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="label">Duration</label>
                            <div className="input bg-gray-50 flex items-center">
                                <FiCalendar className="text-secondary-400 mr-2" />
                                <span className="text-secondary-600">{getDuration() || 'Select dates'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="label">Reason *</label>
                        <textarea
                            name="reason"
                            value={formData.reason}
                            onChange={handleChange}
                            className="input"
                            rows={4}
                            placeholder="Please provide a detailed reason for your leave request..."
                            required
                            minLength={10}
                        />
                        <p className="text-xs text-secondary-400 mt-1">
                            {formData.reason.length}/10 minimum characters
                        </p>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={isSubmitting}
                        >
                            <FiSend size={16} />
                            {isSubmitting ? 'Submitting...' : 'Submit Application'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Leave History */}
            <div className="card">
                <h2 className="text-lg font-semibold text-secondary-800 mb-4 flex items-center gap-2">
                    <FiClock className="text-primary-600" />
                    My Leave History
                </h2>

                {loading ? (
                    <SkeletonTable rows={4} />
                ) : leaves.length === 0 ? (
                    <EmptyState
                        icon={FiCalendar}
                        title="No leave history"
                        description="You haven't applied for any leaves yet."
                    />
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Duration</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    <th>Applied On</th>
                                    <th>Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaves.map((leave) => {
                                    const typeInfo = getLeaveTypeInfo(leave.leaveType);
                                    const statusInfo = getStatusInfo(leave.status);

                                    return (
                                        <tr key={leave._id}>
                                            <td>
                                                <span className={`flex items-center gap-2 ${typeInfo.color}`}>
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
                                            <td className="text-sm text-secondary-600">
                                                {leave.remarks || '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ApplyLeave;
