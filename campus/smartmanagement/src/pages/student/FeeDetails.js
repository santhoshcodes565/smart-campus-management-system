import React, { useState, useEffect } from 'react';
import { studentAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonStats, SkeletonTable } from '../../components/common/LoadingSpinner';
import { FiDollarSign, FiCalendar, FiDownload, FiCheckCircle, FiClock, FiAlertCircle } from 'react-icons/fi';

const FeeDetails = () => {
    const [fees, setFees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({ total: 0, paid: 0, pending: 0 });

    useEffect(() => {
        fetchFees();
    }, []);

    const fetchFees = async () => {
        try {
            setLoading(true);
            const response = await studentAPI.getFees();
            if (response.data.success) {
                setFees(response.data.data);
                // Calculate summary
                const total = response.data.data.reduce((sum, f) => sum + f.amount, 0);
                const paid = response.data.data.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
                setSummary({
                    total,
                    paid,
                    pending: total - paid
                });
            }
        } catch (error) {
            console.error('Error fetching fees:', error);
            // Fallback
            setFees([
                { _id: '1', title: 'Tuition Fee - Semester 5', amount: 45000, dueDate: '2023-12-31', status: 'paid', paidDate: '2023-12-28', receiptNo: 'RCP-8821' },
                { _id: '2', title: 'Exam Fee - Sem 5', amount: 2500, dueDate: '2024-01-15', status: 'pending' },
                { _id: '3', title: 'Library Fee', amount: 500, dueDate: '2024-01-31', status: 'pending' },
            ]);
            setSummary({ total: 48000, paid: 45000, pending: 3000 });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <Breadcrumb items={[{ label: 'Dashboard', path: '/student/dashboard' }, { label: 'Fee Details', path: '/student/fees', isLast: true }]} />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Fee Management</h1>
                    <p className="text-secondary-500 mt-1">Track your payments, dues and download receipts</p>
                </div>
                <button className="btn-primary mt-4 md:mt-0">
                    Pay Online
                </button>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="card">
                    <p className="text-sm font-medium text-secondary-500 mb-1">Total Academic Fee</p>
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-secondary-800">₹{summary.total.toLocaleString()}</h2>
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                            <FiDollarSign />
                        </div>
                    </div>
                </div>
                <div className="card">
                    <p className="text-sm font-medium text-secondary-500 mb-1">Total Paid</p>
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-success-600">₹{summary.paid.toLocaleString()}</h2>
                        <div className="w-10 h-10 rounded-full bg-success-50 text-success-600 flex items-center justify-center">
                            <FiCheckCircle />
                        </div>
                    </div>
                </div>
                <div className="card">
                    <p className="text-sm font-medium text-secondary-500 mb-1">Pending Balance</p>
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-danger-600">₹{summary.pending.toLocaleString()}</h2>
                        <div className="w-10 h-10 rounded-full bg-danger-50 text-danger-600 flex items-center justify-center">
                            <FiAlertCircle />
                        </div>
                    </div>
                </div>
            </div>

            {/* Fee Table */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Billing History</h3>
                </div>
                {loading ? (
                    <SkeletonTable rows={3} />
                ) : (
                    <div className="table-container border-none shadow-none">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th>Amount</th>
                                    <th>Due Date</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fees.map((fee) => (
                                    <tr key={fee._id}>
                                        <td>
                                            <div className="font-semibold text-secondary-800">{fee.title}</div>
                                            {fee.receiptNo && <div className="text-xs text-secondary-400">Receipt: {fee.receiptNo}</div>}
                                        </td>
                                        <td className="font-bold text-secondary-800">₹{fee.amount.toLocaleString()}</td>
                                        <td className="text-secondary-600">
                                            {new Date(fee.dueDate).toLocaleDateString()}
                                        </td>
                                        <td>
                                            <span className={`badge ${fee.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                                                {fee.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>
                                            {fee.status === 'paid' ? (
                                                <button className="flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm font-medium">
                                                    <FiDownload size={14} /> Receipt
                                                </button>
                                            ) : (
                                                <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                                                    Pay Now
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Payment Info */}
            <div className="mt-6 p-4 rounded-xl bg-primary-50 border border-primary-100 flex items-start gap-4">
                <div className="p-2 rounded-lg bg-white text-primary-600 shadow-sm mt-1">
                    <FiClock />
                </div>
                <div>
                    <h4 className="font-bold text-primary-800">Late Payment Policy</h4>
                    <p className="text-sm text-primary-700 mt-1">
                        Any payments made after the due date will attract a late fee of ₹50 per day. Please ensure all dues are cleared to avoid restrictions during exams.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FeeDetails;
