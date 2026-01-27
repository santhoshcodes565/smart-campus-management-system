import React, { useState, useEffect, useCallback } from 'react';
import { feeAPI, adminAPI } from '../../../services/api';
import { toast } from 'react-toastify';
import {
    FiPlus, FiSearch, FiEye, FiDollarSign, FiUser,
    FiFilter, FiDownload, FiAlertTriangle, FiCheck, FiX
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import './AdminFeeLedgers.css';

const AdminFeeLedgers = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [ledgers, setLedgers] = useState([]);
    const [filters, setFilters] = useState({
        academicYear: '',
        semester: '',
        feeStatus: '',
        isOverdue: '',
        search: ''
    });
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [selectedLedger, setSelectedLedger] = useState(null);
    const [academicYears, setAcademicYears] = useState([]);
    const [structures, setStructures] = useState([]);
    const [students, setStudents] = useState([]);

    // Assignment form
    const [assignForm, setAssignForm] = useState({
        studentId: '',
        feeStructureId: '',
        semester: '',
        dueDate: '',
        concessionAmount: 0,
        concessionReason: ''
    });

    // Receipt form
    const [receiptForm, setReceiptForm] = useState({
        amount: '',
        paymentMode: 'CASH',
        referenceNumber: '',
        remarks: ''
    });

    const fetchLedgers = useCallback(async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: 15,
                ...filters
            };
            const response = await feeAPI.ledgers.getAll(params);
            setLedgers(response.data.data || []);
            setPagination(response.data.pagination || { page: 1, pages: 1, total: 0 });
        } catch (error) {
            toast.error(error.message || 'Failed to load ledgers');
        } finally {
            setLoading(false);
        }
    }, [filters, pagination.page]);

    const fetchMasterData = useCallback(async () => {
        try {
            const [yearsRes, structRes, studentsRes] = await Promise.all([
                feeAPI.ledgers.getAcademicYears(),
                feeAPI.structures.getAll({ status: 'active', limit: 100 }),
                adminAPI.getStudents()
            ]);
            setAcademicYears(yearsRes.data.data || []);
            setStructures(structRes.data.data || []);
            setStudents(studentsRes.data.data || studentsRes.data || []);
        } catch (error) {
            console.error('Failed to load master data:', error);
        }
    }, []);

    useEffect(() => {
        fetchLedgers();
    }, [fetchLedgers]);

    useEffect(() => {
        fetchMasterData();
    }, [fetchMasterData]);

    const handleAssignSubmit = async (e) => {
        e.preventDefault();
        try {
            await feeAPI.ledgers.create(assignForm);
            toast.success('Fee ledger created successfully');
            setShowAssignModal(false);
            fetchLedgers();
        } catch (error) {
            toast.error(error.message || 'Failed to create ledger');
        }
    };

    const handleRecordReceipt = async (e) => {
        e.preventDefault();
        try {
            const data = {
                ledgerId: selectedLedger._id,
                ...receiptForm,
                amount: parseFloat(receiptForm.amount)
            };
            const result = await feeAPI.receipts.create(data);
            toast.success(`Receipt ${result.data.data.receipt.receiptNumber} created`);
            setShowReceiptModal(false);
            fetchLedgers();
        } catch (error) {
            toast.error(error.message || 'Failed to record receipt');
        }
    };

    const openReceiptModal = (ledger) => {
        setSelectedLedger(ledger);
        setReceiptForm({
            amount: '',
            paymentMode: 'CASH',
            referenceNumber: '',
            remarks: ''
        });
        setShowReceiptModal(true);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const getStatusBadge = (status) => {
        const colors = {
            PAID: 'status-paid',
            PARTIALLY_PAID: 'status-partial',
            UNPAID: 'status-unpaid',
            OVERDUE: 'status-overdue'
        };
        return <span className={`status-badge ${colors[status] || ''}`}>{status?.replace('_', ' ')}</span>;
    };

    return (
        <div className="admin-fee-ledgers">
            {/* Header */}
            <div className="page-header">
                <div className="header-title">
                    <h1>Student Fee Ledgers</h1>
                    <p>Manage student fee assignments and payments</p>
                </div>
                <button className="btn-primary" onClick={() => setShowAssignModal(true)}>
                    <FiPlus /> Assign Fee
                </button>
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <div className="search-box">
                    <FiSearch />
                    <input
                        type="text"
                        placeholder="Search by student name or roll no..."
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    />
                </div>
                <select
                    value={filters.feeStatus}
                    onChange={(e) => setFilters(prev => ({ ...prev, feeStatus: e.target.value }))}
                >
                    <option value="">All Status</option>
                    <option value="PAID">Paid</option>
                    <option value="PARTIALLY_PAID">Partially Paid</option>
                    <option value="UNPAID">Unpaid</option>
                    <option value="OVERDUE">Overdue</option>
                </select>
                <select
                    value={filters.academicYear}
                    onChange={(e) => setFilters(prev => ({ ...prev, academicYear: e.target.value }))}
                >
                    <option value="">All Years</option>
                    {academicYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
                <select
                    value={filters.isOverdue}
                    onChange={(e) => setFilters(prev => ({ ...prev, isOverdue: e.target.value }))}
                >
                    <option value="">All</option>
                    <option value="true">Overdue Only</option>
                </select>
            </div>

            {/* Ledgers Table */}
            {loading ? (
                <div className="loading-state">Loading...</div>
            ) : ledgers.length === 0 ? (
                <div className="empty-state">
                    <p>No ledgers found</p>
                </div>
            ) : (
                <div className="ledgers-table-container">
                    <table className="ledgers-table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Year/Sem</th>
                                <th>Net Payable</th>
                                <th>Paid</th>
                                <th>Outstanding</th>
                                <th>Due Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ledgers.map(ledger => (
                                <tr key={ledger._id} className={ledger.isOverdue ? 'row-overdue' : ''}>
                                    <td className="student-cell">
                                        <div className="student-info">
                                            <span className="name">{ledger.studentId?.userId?.name || 'Unknown'}</span>
                                            <span className="roll">{ledger.studentId?.rollNo || ''}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="year-sem">
                                            {ledger.academicYear}
                                            {ledger.semester && ` / Sem ${ledger.semester}`}
                                        </span>
                                    </td>
                                    <td className="amount-cell">{formatCurrency(ledger.netPayable)}</td>
                                    <td className="amount-cell paid">{formatCurrency(ledger.totalPaid)}</td>
                                    <td className="amount-cell outstanding">{formatCurrency(ledger.outstandingBalance)}</td>
                                    <td>
                                        {ledger.dueDate ? new Date(ledger.dueDate).toLocaleDateString() : '-'}
                                        {ledger.isOverdue && <FiAlertTriangle className="overdue-icon" />}
                                    </td>
                                    <td>{getStatusBadge(ledger.feeStatus)}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                title="View Details"
                                                onClick={() => navigate(`/admin/fees/ledgers/${ledger._id}`)}
                                            >
                                                <FiEye />
                                            </button>
                                            {ledger.feeStatus !== 'PAID' && (
                                                <button
                                                    title="Record Receipt"
                                                    className="receipt-btn"
                                                    onClick={() => openReceiptModal(ledger)}
                                                >
                                                    <FiDollarSign />
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

            {/* Assign Fee Modal */}
            {showAssignModal && (
                <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Assign Fee to Student</h2>
                            <button className="close-btn" onClick={() => setShowAssignModal(false)}>
                                <FiX />
                            </button>
                        </div>
                        <form onSubmit={handleAssignSubmit}>
                            <div className="form-group">
                                <label>Student *</label>
                                <select
                                    value={assignForm.studentId}
                                    onChange={e => setAssignForm(prev => ({ ...prev, studentId: e.target.value }))}
                                    required
                                >
                                    <option value="">Select Student</option>
                                    {students.map(s => (
                                        <option key={s._id} value={s._id}>
                                            {s.userId?.name || s.name} ({s.rollNo})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Fee Structure *</label>
                                <select
                                    value={assignForm.feeStructureId}
                                    onChange={e => setAssignForm(prev => ({ ...prev, feeStructureId: e.target.value }))}
                                    required
                                >
                                    <option value="">Select Structure</option>
                                    {structures.map(s => (
                                        <option key={s._id} value={s._id}>
                                            {s.name} ({s.code}) - {formatCurrency(s.approvedTotal)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Semester</label>
                                    <select
                                        value={assignForm.semester}
                                        onChange={e => setAssignForm(prev => ({ ...prev, semester: e.target.value }))}
                                    >
                                        <option value="">Select</option>
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                                            <option key={s} value={s}>Semester {s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Due Date *</label>
                                    <input
                                        type="date"
                                        value={assignForm.dueDate}
                                        onChange={e => setAssignForm(prev => ({ ...prev, dueDate: e.target.value }))}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Concession Amount</label>
                                    <input
                                        type="number"
                                        value={assignForm.concessionAmount}
                                        onChange={e => setAssignForm(prev => ({ ...prev, concessionAmount: e.target.value }))}
                                        min="0"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Concession Reason</label>
                                    <input
                                        type="text"
                                        value={assignForm.concessionReason}
                                        onChange={e => setAssignForm(prev => ({ ...prev, concessionReason: e.target.value }))}
                                        placeholder="e.g., Merit scholarship"
                                    />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowAssignModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    Assign Fee
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Record Receipt Modal */}
            {showReceiptModal && selectedLedger && (
                <div className="modal-overlay" onClick={() => setShowReceiptModal(false)}>
                    <div className="modal-content receipt-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Record Payment Receipt</h2>
                            <button className="close-btn" onClick={() => setShowReceiptModal(false)}>
                                <FiX />
                            </button>
                        </div>
                        <div className="receipt-info-banner">
                            <div>
                                <strong>{selectedLedger.studentId?.userId?.name}</strong>
                                <span>{selectedLedger.studentId?.rollNo}</span>
                            </div>
                            <div className="outstanding-info">
                                <span>Outstanding:</span>
                                <strong>{formatCurrency(selectedLedger.outstandingBalance)}</strong>
                            </div>
                        </div>
                        <form onSubmit={handleRecordReceipt}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Amount *</label>
                                    <input
                                        type="number"
                                        value={receiptForm.amount}
                                        onChange={e => setReceiptForm(prev => ({ ...prev, amount: e.target.value }))}
                                        required
                                        min="1"
                                        max={selectedLedger.outstandingBalance}
                                        placeholder="Enter amount"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Payment Mode *</label>
                                    <select
                                        value={receiptForm.paymentMode}
                                        onChange={e => setReceiptForm(prev => ({ ...prev, paymentMode: e.target.value }))}
                                        required
                                    >
                                        <option value="CASH">Cash</option>
                                        <option value="BANK_TRANSFER">Bank Transfer</option>
                                        <option value="CHEQUE">Cheque</option>
                                        <option value="DD">Demand Draft</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Reference Number</label>
                                <input
                                    type="text"
                                    value={receiptForm.referenceNumber}
                                    onChange={e => setReceiptForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                                    placeholder="Cheque/DD/Transaction number"
                                />
                            </div>
                            <div className="form-group">
                                <label>Remarks</label>
                                <textarea
                                    value={receiptForm.remarks}
                                    onChange={e => setReceiptForm(prev => ({ ...prev, remarks: e.target.value }))}
                                    rows={2}
                                    placeholder="Any additional notes"
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowReceiptModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    <FiCheck /> Record Receipt
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminFeeLedgers;
