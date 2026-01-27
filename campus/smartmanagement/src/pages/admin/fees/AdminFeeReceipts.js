import React, { useState, useEffect, useCallback } from 'react';
import { feeAPI } from '../../../services/api';
import { toast } from 'react-toastify';
import {
    FiSearch, FiEye, FiRotateCcw, FiCheck, FiX,
    FiFilter, FiCalendar, FiDownload, FiDollarSign
} from 'react-icons/fi';
import './AdminFeeReceipts.css';

const AdminFeeReceipts = () => {
    const [loading, setLoading] = useState(true);
    const [receipts, setReceipts] = useState([]);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        paymentMode: '',
        receiptType: '',
        isReversed: '',
        search: ''
    });
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [showViewModal, setShowViewModal] = useState(false);
    const [showReverseModal, setShowReverseModal] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [reverseReason, setReverseReason] = useState('');
    const [todaySummary, setTodaySummary] = useState(null);

    const fetchReceipts = useCallback(async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: 20,
                ...filters
            };
            const response = await feeAPI.receipts.getAll(params);
            setReceipts(response.data.data || []);
            setPagination(response.data.pagination || { page: 1, pages: 1, total: 0 });
        } catch (error) {
            toast.error(error.message || 'Failed to load receipts');
        } finally {
            setLoading(false);
        }
    }, [filters, pagination.page]);

    const fetchTodaySummary = useCallback(async () => {
        try {
            const response = await feeAPI.receipts.getToday();
            setTodaySummary(response.data.data?.summary || null);
        } catch (error) {
            console.error('Failed to load today summary:', error);
        }
    }, []);

    useEffect(() => {
        fetchReceipts();
    }, [fetchReceipts]);

    useEffect(() => {
        fetchTodaySummary();
    }, [fetchTodaySummary]);

    const handleViewReceipt = async (receipt) => {
        try {
            const response = await feeAPI.receipts.get(receipt._id);
            setSelectedReceipt(response.data.data);
            setShowViewModal(true);
        } catch (error) {
            toast.error('Failed to load receipt details');
        }
    };

    const handleReverseReceipt = async () => {
        if (!reverseReason.trim()) {
            toast.error('Reason is required for reversal');
            return;
        }

        try {
            const result = await feeAPI.receipts.reverse(selectedReceipt._id, reverseReason);
            toast.success(`Receipt reversed. New receipt: ${result.data.data.reversalReceipt.receiptNumber}`);
            setShowReverseModal(false);
            setReverseReason('');
            fetchReceipts();
        } catch (error) {
            toast.error(error.message || 'Failed to reverse receipt');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const getReceiptTypeStyle = (type, isReversed) => {
        if (isReversed) return 'type-reversed';
        return type === 'PAYMENT' ? 'type-payment' : 'type-reversal';
    };

    return (
        <div className="admin-fee-receipts">
            {/* Header */}
            <div className="page-header">
                <div className="header-title">
                    <h1>Fee Receipts</h1>
                    <p>Transaction history and receipt management</p>
                </div>
            </div>

            {/* Today's Summary */}
            {todaySummary && (
                <div className="today-summary">
                    <div className="summary-item">
                        <FiDollarSign />
                        <div>
                            <span className="label">Today's Collection</span>
                            <span className="value">{formatCurrency(todaySummary.totalAmount)}</span>
                        </div>
                    </div>
                    <div className="summary-item">
                        <FiCheck />
                        <div>
                            <span className="label">Receipts Issued</span>
                            <span className="value">{todaySummary.totalReceipts}</span>
                        </div>
                    </div>
                    {todaySummary.byMode && Object.entries(todaySummary.byMode).map(([mode, data]) => (
                        <div key={mode} className="summary-item mode-item">
                            <div>
                                <span className="label">{mode.replace('_', ' ')}</span>
                                <span className="value">{formatCurrency(data.amount)} ({data.count})</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="filters-bar">
                <div className="search-box">
                    <FiSearch />
                    <input
                        type="text"
                        placeholder="Search receipt number or student..."
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    />
                </div>
                <div className="date-filter">
                    <FiCalendar />
                    <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                        placeholder="From"
                    />
                    <span>to</span>
                    <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                        placeholder="To"
                    />
                </div>
                <select
                    value={filters.paymentMode}
                    onChange={(e) => setFilters(prev => ({ ...prev, paymentMode: e.target.value }))}
                >
                    <option value="">All Modes</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="DD">DD</option>
                </select>
                <select
                    value={filters.receiptType}
                    onChange={(e) => setFilters(prev => ({ ...prev, receiptType: e.target.value }))}
                >
                    <option value="">All Types</option>
                    <option value="PAYMENT">Payment</option>
                    <option value="REVERSAL">Reversal</option>
                </select>
            </div>

            {/* Receipts Table */}
            {loading ? (
                <div className="loading-state">Loading...</div>
            ) : receipts.length === 0 ? (
                <div className="empty-state">
                    <p>No receipts found</p>
                </div>
            ) : (
                <div className="receipts-table-container">
                    <table className="receipts-table">
                        <thead>
                            <tr>
                                <th>Receipt No</th>
                                <th>Date</th>
                                <th>Student</th>
                                <th>Amount</th>
                                <th>Mode</th>
                                <th>Type</th>
                                <th>Reference</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {receipts.map(receipt => (
                                <tr key={receipt._id} className={receipt.isReversed ? 'row-reversed' : ''}>
                                    <td>
                                        <span className="receipt-number">{receipt.receiptNumber}</span>
                                    </td>
                                    <td>{new Date(receipt.receiptDate).toLocaleDateString()}</td>
                                    <td className="student-cell">
                                        <span className="name">
                                            {receipt.studentId?.userId?.name || receipt.studentSnapshot?.name}
                                        </span>
                                        <span className="roll">
                                            {receipt.studentSnapshot?.rollNo}
                                        </span>
                                    </td>
                                    <td className={`amount-cell ${receipt.receiptType === 'REVERSAL' ? 'reversal' : ''}`}>
                                        {receipt.receiptType === 'REVERSAL' && '-'}
                                        {formatCurrency(receipt.amount)}
                                    </td>
                                    <td>
                                        <span className="payment-mode">{receipt.paymentMode?.replace('_', ' ')}</span>
                                    </td>
                                    <td>
                                        <span className={`type-badge ${getReceiptTypeStyle(receipt.receiptType, receipt.isReversed)}`}>
                                            {receipt.isReversed ? 'REVERSED' : receipt.receiptType}
                                        </span>
                                    </td>
                                    <td className="ref-cell">{receipt.referenceNumber || '-'}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button onClick={() => handleViewReceipt(receipt)} title="View">
                                                <FiEye />
                                            </button>
                                            {receipt.receiptType === 'PAYMENT' && !receipt.isReversed && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedReceipt(receipt);
                                                        setShowReverseModal(true);
                                                    }}
                                                    title="Reverse"
                                                    className="reverse-btn"
                                                >
                                                    <FiRotateCcw />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="pagination">
                    {Array.from({ length: pagination.pages }, (_, i) => (
                        <button
                            key={i + 1}
                            className={pagination.page === i + 1 ? 'active' : ''}
                            onClick={() => setPagination(prev => ({ ...prev, page: i + 1 }))}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
            )}

            {/* View Modal */}
            {showViewModal && selectedReceipt && (
                <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Receipt Details</h2>
                            <button className="close-btn" onClick={() => setShowViewModal(false)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="receipt-details">
                            <div className="receipt-header-info">
                                <div className="receipt-number-large">{selectedReceipt.receiptNumber}</div>
                                <span className={`type-badge ${getReceiptTypeStyle(selectedReceipt.receiptType, selectedReceipt.isReversed)}`}>
                                    {selectedReceipt.isReversed ? 'REVERSED' : selectedReceipt.receiptType}
                                </span>
                            </div>

                            <div className="detail-grid">
                                <div>
                                    <label>Date</label>
                                    <span>{new Date(selectedReceipt.receiptDate).toLocaleDateString()}</span>
                                </div>
                                <div>
                                    <label>Amount</label>
                                    <span className="amount">{formatCurrency(selectedReceipt.amount)}</span>
                                </div>
                                <div>
                                    <label>Student</label>
                                    <span>{selectedReceipt.studentSnapshot?.name}</span>
                                </div>
                                <div>
                                    <label>Roll No</label>
                                    <span>{selectedReceipt.studentSnapshot?.rollNo}</span>
                                </div>
                                <div>
                                    <label>Payment Mode</label>
                                    <span>{selectedReceipt.paymentMode?.replace('_', ' ')}</span>
                                </div>
                                <div>
                                    <label>Reference</label>
                                    <span>{selectedReceipt.referenceNumber || '-'}</span>
                                </div>
                                <div>
                                    <label>Created By</label>
                                    <span>{selectedReceipt.createdByName}</span>
                                </div>
                                <div>
                                    <label>Created At</label>
                                    <span>{new Date(selectedReceipt.createdAt).toLocaleString()}</span>
                                </div>
                            </div>

                            {selectedReceipt.balanceSnapshot && (
                                <div className="balance-snapshot">
                                    <h4>Balance Update</h4>
                                    <div className="snapshot-row">
                                        <span>Previous Balance:</span>
                                        <span>{formatCurrency(selectedReceipt.balanceSnapshot.previousBalance)}</span>
                                    </div>
                                    <div className="snapshot-row">
                                        <span>New Balance:</span>
                                        <span>{formatCurrency(selectedReceipt.balanceSnapshot.newBalance)}</span>
                                    </div>
                                </div>
                            )}

                            {selectedReceipt.remarks && (
                                <div className="remarks-section">
                                    <label>Remarks</label>
                                    <p>{selectedReceipt.remarks}</p>
                                </div>
                            )}

                            {selectedReceipt.isReversed && (
                                <div className="reversal-info">
                                    <h4>Reversal Information</h4>
                                    <p>Reversed by receipt: {selectedReceipt.reversedByReceiptNumber}</p>
                                    <p>Reason: {selectedReceipt.reversalReason}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Reverse Modal */}
            {showReverseModal && selectedReceipt && (
                <div className="modal-overlay" onClick={() => setShowReverseModal(false)}>
                    <div className="modal-content reverse-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header warning">
                            <h2><FiRotateCcw /> Reverse Receipt</h2>
                            <button className="close-btn" onClick={() => setShowReverseModal(false)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="reverse-content">
                            <div className="warning-banner">
                                <strong>⚠️ Warning:</strong> This action cannot be undone. A reversal receipt will be created and the original receipt will be marked as reversed.
                            </div>
                            <div className="receipt-summary">
                                <p><strong>Receipt:</strong> {selectedReceipt.receiptNumber}</p>
                                <p><strong>Amount:</strong> {formatCurrency(selectedReceipt.amount)}</p>
                                <p><strong>Student:</strong> {selectedReceipt.studentSnapshot?.name}</p>
                            </div>
                            <div className="form-group">
                                <label>Reason for Reversal *</label>
                                <textarea
                                    value={reverseReason}
                                    onChange={e => setReverseReason(e.target.value)}
                                    rows={3}
                                    placeholder="Enter the reason for reversing this receipt..."
                                    required
                                />
                            </div>
                            <div className="modal-actions">
                                <button className="btn-secondary" onClick={() => {
                                    setShowReverseModal(false);
                                    setReverseReason('');
                                }}>
                                    Cancel
                                </button>
                                <button className="btn-danger" onClick={handleReverseReceipt}>
                                    <FiRotateCcw /> Confirm Reversal
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminFeeReceipts;
