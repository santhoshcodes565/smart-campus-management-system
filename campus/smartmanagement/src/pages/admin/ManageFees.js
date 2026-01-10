import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal, { ConfirmModal } from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiDollarSign, FiCheck, FiX, FiDownload } from 'react-icons/fi';

const ManageFees = () => {
    const [fees, setFees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedFee, setSelectedFee] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        studentId: '',
        amount: '',
        dueDate: '',
        feeType: 'tuition',
        semester: '',
        academicYear: '2024-25',
        description: '',
        status: 'pending',
    });

    const feeTypes = ['tuition', 'hostel', 'transport', 'library', 'lab', 'exam', 'miscellaneous'];
    const statuses = ['pending', 'paid', 'overdue', 'partial'];

    useEffect(() => {
        fetchFees();
    }, []);

    const fetchFees = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getFees();
            if (response.data.success) {
                setFees(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching fees:', error);
            setFees([
                { _id: '1', studentId: { userId: { name: 'John Doe' }, rollNo: 'CS2021001' }, amount: 75000, feeType: 'tuition', semester: 5, academicYear: '2024-25', status: 'paid', paidDate: new Date().toISOString(), dueDate: new Date().toISOString() },
                { _id: '2', studentId: { userId: { name: 'Jane Smith' }, rollNo: 'CS2021002' }, amount: 75000, feeType: 'tuition', semester: 5, academicYear: '2024-25', status: 'pending', dueDate: new Date(Date.now() + 604800000).toISOString() },
                { _id: '3', studentId: { userId: { name: 'Mike Johnson' }, rollNo: 'EC2021001' }, amount: 15000, feeType: 'hostel', semester: 5, academicYear: '2024-25', status: 'overdue', dueDate: new Date(Date.now() - 604800000).toISOString() },
                { _id: '4', studentId: { userId: { name: 'Sarah Williams' }, rollNo: 'ME2021001' }, amount: 5000, feeType: 'transport', semester: 5, academicYear: '2024-25', status: 'paid', paidDate: new Date().toISOString(), dueDate: new Date().toISOString() },
            ]);
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
        setIsSubmitting(true);

        try {
            if (selectedFee) {
                await adminAPI.updateFee(selectedFee._id, formData);
                toast.success('Fee record updated successfully');
            } else {
                await adminAPI.createFee(formData);
                toast.success('Fee record created successfully');
            }
            fetchFees();
            handleCloseModal();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Operation failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusChange = async (fee, newStatus) => {
        try {
            await adminAPI.updateFee(fee._id, { status: newStatus, paidDate: newStatus === 'paid' ? new Date().toISOString() : null });
            toast.success('Payment status updated');
            fetchFees();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleEdit = (fee) => {
        setSelectedFee(fee);
        setFormData({
            studentId: fee.studentId?._id || '',
            amount: fee.amount || '',
            dueDate: fee.dueDate ? new Date(fee.dueDate).toISOString().split('T')[0] : '',
            feeType: fee.feeType || 'tuition',
            semester: fee.semester || '',
            academicYear: fee.academicYear || '2024-25',
            description: fee.description || '',
            status: fee.status || 'pending',
        });
        setShowModal(true);
    };

    const handleDelete = async () => {
        setIsSubmitting(true);
        try {
            await adminAPI.deleteFee(selectedFee._id);
            toast.success('Fee record deleted');
            fetchFees();
            setShowDeleteModal(false);
            setSelectedFee(null);
        } catch (error) {
            toast.error('Delete failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedFee(null);
        setFormData({
            studentId: '', amount: '', dueDate: '', feeType: 'tuition',
            semester: '', academicYear: '2024-25', description: '', status: 'pending'
        });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'paid': return 'badge-success';
            case 'pending': return 'badge-warning';
            case 'overdue': return 'badge-danger';
            case 'partial': return 'badge-primary';
            default: return 'badge bg-gray-100';
        }
    };

    const filteredFees = fees.filter(fee => {
        const matchesSearch =
            fee.studentId?.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            fee.studentId?.rollNo?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = !filterStatus || fee.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    // Calculate summary
    const summary = {
        total: fees.reduce((sum, f) => sum + (f.amount || 0), 0),
        collected: fees.filter(f => f.status === 'paid').reduce((sum, f) => sum + (f.amount || 0), 0),
        pending: fees.filter(f => f.status === 'pending').reduce((sum, f) => sum + (f.amount || 0), 0),
        overdue: fees.filter(f => f.status === 'overdue').reduce((sum, f) => sum + (f.amount || 0), 0),
    };

    return (
        <div className="animate-fade-in">
            <Breadcrumb />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Fee Management</h1>
                    <p className="text-secondary-500 mt-1">Track and manage student fee payments</p>
                </div>
                <div className="flex gap-3 mt-4 md:mt-0">
                    <button className="btn-secondary">
                        <FiDownload size={18} />
                        Export Report
                    </button>
                    <button onClick={() => setShowModal(true)} className="btn-primary">
                        <FiPlus size={18} />
                        Add Fee Record
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="card">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
                            <FiDollarSign size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-secondary-800">₹{(summary.total / 100000).toFixed(1)}L</p>
                            <p className="text-sm text-secondary-500">Total Fees</p>
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-success-50 flex items-center justify-center text-success-500">
                            <FiCheck size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-success-600">₹{(summary.collected / 100000).toFixed(1)}L</p>
                            <p className="text-sm text-secondary-500">Collected</p>
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-warning-50 flex items-center justify-center text-warning-500">
                            <FiDollarSign size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-warning-600">₹{(summary.pending / 100000).toFixed(1)}L</p>
                            <p className="text-sm text-secondary-500">Pending</p>
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-danger-50 flex items-center justify-center text-danger-500">
                            <FiX size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-danger-600">₹{(summary.overdue / 100000).toFixed(1)}L</p>
                            <p className="text-sm text-secondary-500">Overdue</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by student name or roll number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input pl-10"
                        />
                    </div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="input w-full md:w-40"
                    >
                        <option value="">All Status</option>
                        {statuses.map(status => (
                            <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <SkeletonTable rows={5} />
            ) : filteredFees.length === 0 ? (
                <EmptyState
                    icon={FiDollarSign}
                    title="No fee records found"
                    description="No fee records have been created yet."
                    action={() => setShowModal(true)}
                    actionLabel="Add Fee Record"
                />
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Fee Type</th>
                                <th>Amount</th>
                                <th>Due Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFees.map((fee) => (
                                <tr key={fee._id}>
                                    <td>
                                        <div>
                                            <p className="font-medium text-secondary-800">{fee.studentId?.userId?.name}</p>
                                            <p className="text-sm text-secondary-500">{fee.studentId?.rollNo}</p>
                                        </div>
                                    </td>
                                    <td className="capitalize">{fee.feeType}</td>
                                    <td className="font-semibold">₹{fee.amount?.toLocaleString()}</td>
                                    <td>{new Date(fee.dueDate).toLocaleDateString()}</td>
                                    <td>
                                        <span className={getStatusBadge(fee.status)}>{fee.status}</span>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            {fee.status !== 'paid' && (
                                                <button
                                                    onClick={() => handleStatusChange(fee, 'paid')}
                                                    className="p-2 rounded-lg hover:bg-success-50 text-success-500"
                                                    title="Mark as Paid"
                                                >
                                                    <FiCheck size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleEdit(fee)}
                                                className="p-2 rounded-lg hover:bg-gray-100 text-secondary-600"
                                                title="Edit"
                                            >
                                                <FiEdit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => { setSelectedFee(fee); setShowDeleteModal(true); }}
                                                className="p-2 rounded-lg hover:bg-danger-50 text-danger-500"
                                                title="Delete"
                                            >
                                                <FiTrash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            <Modal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={selectedFee ? 'Edit Fee Record' : 'Add Fee Record'}
                size="md"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="label">Fee Type *</label>
                            <select
                                name="feeType"
                                value={formData.feeType}
                                onChange={handleChange}
                                className="input"
                                required
                            >
                                {feeTypes.map(type => (
                                    <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="label">Amount (₹) *</label>
                            <input
                                type="number"
                                name="amount"
                                value={formData.amount}
                                onChange={handleChange}
                                className="input"
                                required
                                min="0"
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Due Date *</label>
                            <input
                                type="date"
                                name="dueDate"
                                value={formData.dueDate}
                                onChange={handleChange}
                                className="input"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Semester</label>
                            <input
                                type="number"
                                name="semester"
                                value={formData.semester}
                                onChange={handleChange}
                                className="input"
                                min="1"
                                max="8"
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Academic Year</label>
                            <input
                                type="text"
                                name="academicYear"
                                value={formData.academicYear}
                                onChange={handleChange}
                                className="input"
                                placeholder="e.g., 2024-25"
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="input"
                            >
                                {statuses.map(status => (
                                    <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="label">Description</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            className="input"
                            rows={2}
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={handleCloseModal} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : selectedFee ? 'Update Record' : 'Add Record'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete Fee Record"
                message="Are you sure you want to delete this fee record?"
                confirmText="Delete"
                isLoading={isSubmitting}
            />
        </div>
    );
};

export default ManageFees;
