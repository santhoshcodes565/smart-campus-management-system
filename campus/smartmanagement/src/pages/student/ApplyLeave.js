import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { studentAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import { FiSend, FiClock, FiCheck, FiX, FiPlus } from 'react-icons/fi';

const ApplyLeave = () => {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        leaveType: 'sick',
        fromDate: '',
        toDate: '',
        reason: '',
    });

    const leaveTypes = [
        { value: 'sick', label: 'Sick Leave' },
        { value: 'personal', label: 'Personal Leave' },
        { value: 'family', label: 'Family Emergency' },
        { value: 'medical', label: 'Medical Appointment' },
        { value: 'other', label: 'Other' },
    ];

    const demoLeaves = [
        { _id: '1', leaveType: 'sick', fromDate: '2024-01-10', toDate: '2024-01-11', reason: 'Fever and cold', status: 'approved', createdAt: '2024-01-09' },
        { _id: '2', leaveType: 'personal', fromDate: '2024-01-15', toDate: '2024-01-15', reason: 'Personal work', status: 'pending', createdAt: '2024-01-13' },
        { _id: '3', leaveType: 'family', fromDate: '2023-12-25', toDate: '2023-12-26', reason: 'Family function', status: 'rejected', createdAt: '2023-12-20' },
    ];

    useEffect(() => {
        fetchLeaves();
    }, []);

    const fetchLeaves = async () => {
        try {
            setLoading(true);
            const response = await studentAPI.getLeaves();
            if (response.data.success) {
                setLeaves(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching leaves:', error);
            setLeaves(demoLeaves);
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

        if (new Date(formData.fromDate) > new Date(formData.toDate)) {
            toast.error('End date cannot be before start date');
            return;
        }

        setSubmitting(true);
        try {
            await studentAPI.applyLeave(formData);
            toast.success('Leave application submitted successfully');
            setShowForm(false);
            setFormData({ leaveType: 'sick', fromDate: '', toDate: '', reason: '' });
            fetchLeaves();
        } catch (error) {
            toast.error('Failed to submit leave application');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'approved': return <FiCheck className="text-success-500" size={16} />;
            case 'rejected': return <FiX className="text-danger-500" size={16} />;
            default: return <FiClock className="text-warning-500" size={16} />;
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved': return 'badge-success';
            case 'rejected': return 'badge-danger';
            default: return 'badge-warning';
        }
    };

    const getDaysCount = (from, to) => {
        const diffTime = Math.abs(new Date(to) - new Date(from));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    };

    return (
        <div className="animate-fade-in">
            <Breadcrumb />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Leave Applications</h1>
                    <p className="text-secondary-500 mt-1">Apply for leave and track your applications</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="btn-primary mt-4 md:mt-0">
                    <FiPlus size={18} />
                    Apply for Leave
                </button>
            </div>

            {/* Leave Form */}
            {showForm && (
                <div className="card mb-6 animate-fade-in">
                    <h3 className="card-title mb-4">New Leave Application</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="form-group mb-0">
                                <label className="label">Leave Type *</label>
                                <select
                                    name="leaveType"
                                    value={formData.leaveType}
                                    onChange={handleChange}
                                    className="input"
                                    required
                                >
                                    {leaveTypes.map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group mb-0">
                                <label className="label">From Date *</label>
                                <input
                                    type="date"
                                    name="fromDate"
                                    value={formData.fromDate}
                                    onChange={handleChange}
                                    className="input"
                                    required
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div className="form-group mb-0">
                                <label className="label">To Date *</label>
                                <input
                                    type="date"
                                    name="toDate"
                                    value={formData.toDate}
                                    onChange={handleChange}
                                    className="input"
                                    required
                                    min={formData.fromDate || new Date().toISOString().split('T')[0]}
                                />
                            </div>
                        </div>
                        <div className="form-group mb-0">
                            <label className="label">Reason *</label>
                            <textarea
                                name="reason"
                                value={formData.reason}
                                onChange={handleChange}
                                className="input"
                                rows={3}
                                placeholder="Explain the reason for your leave..."
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                                Cancel
                            </button>
                            <button type="submit" className="btn-primary" disabled={submitting}>
                                <FiSend size={16} />
                                {submitting ? 'Submitting...' : 'Submit Application'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Leave History */}
            <div className="card">
                <h3 className="card-title mb-4">Leave History</h3>

                {loading ? (
                    <SkeletonTable rows={3} />
                ) : leaves.length === 0 ? (
                    <div className="text-center py-8 text-secondary-500">
                        <FiClock size={32} className="mx-auto mb-2 opacity-50" />
                        <p>No leave applications found</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {leaves.map((leave) => (
                            <div
                                key={leave._id}
                                className={`p-4 rounded-lg border ${leave.status === 'approved' ? 'border-success-200 bg-success-50/30' :
                                        leave.status === 'rejected' ? 'border-danger-200 bg-danger-50/30' :
                                            'border-warning-200 bg-warning-50/30'
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${leave.status === 'approved' ? 'bg-success-100' :
                                                leave.status === 'rejected' ? 'bg-danger-100' : 'bg-warning-100'
                                            }`}>
                                            {getStatusIcon(leave.status)}
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-secondary-800">
                                                {leaveTypes.find(t => t.value === leave.leaveType)?.label || leave.leaveType}
                                            </h4>
                                            <p className="text-sm text-secondary-600 mt-1">{leave.reason}</p>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-secondary-500">
                                                <span>
                                                    {new Date(leave.fromDate).toLocaleDateString()} - {new Date(leave.toDate).toLocaleDateString()}
                                                </span>
                                                <span>({getDaysCount(leave.fromDate, leave.toDate)} day{getDaysCount(leave.fromDate, leave.toDate) > 1 ? 's' : ''})</span>
                                                <span>Applied: {new Date(leave.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`badge ${getStatusBadge(leave.status)}`}>
                                        {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ApplyLeave;
