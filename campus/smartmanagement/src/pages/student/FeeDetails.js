import React, { useState, useEffect, useCallback } from 'react';
import { feeAPI } from '../../services/api';
import { toast } from 'react-toastify';
import {
    FiDollarSign, FiFileText, FiCalendar, FiAlertTriangle,
    FiCheck, FiClock, FiInfo
} from 'react-icons/fi';
import './FeeDetails.css';

/**
 * Student Fee Details - READ ONLY
 * Students can view:
 * - Fee structure breakup
 * - Ledger summary
 * - Payment history
 * - Outstanding balance
 * - Due dates
 * 
 * NO PAYMENT FUNCTIONALITY - Accounting ledger only
 */
const FeeDetails = () => {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);
    const [ledgers, setLedgers] = useState([]);
    const [receipts, setReceipts] = useState([]);
    const [selectedLedger, setSelectedLedger] = useState(null);

    const fetchFeeData = useCallback(async () => {
        try {
            setLoading(true);
            const [summaryRes, ledgerRes, receiptsRes] = await Promise.all([
                feeAPI.student.getSummary(),
                feeAPI.student.getLedger(),
                feeAPI.student.getReceipts()
            ]);

            setSummary(summaryRes.data.data?.summary || null);
            setLedgers(ledgerRes.data.data?.ledgers || []);
            setReceipts(receiptsRes.data.data?.receipts || []);

            // Select the first active ledger by default
            if (ledgerRes.data.data?.ledgers?.length > 0) {
                setSelectedLedger(ledgerRes.data.data.ledgers[0]);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to load fee details');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFeeData();
    }, [fetchFeeData]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const getStatusBadge = (status) => {
        const config = {
            PAID: { class: 'status-paid', icon: <FiCheck />, text: 'Fully Paid' },
            PARTIALLY_PAID: { class: 'status-partial', icon: <FiClock />, text: 'Partially Paid' },
            UNPAID: { class: 'status-unpaid', icon: <FiInfo />, text: 'Unpaid' },
            OVERDUE: { class: 'status-overdue', icon: <FiAlertTriangle />, text: 'Overdue' }
        };
        const s = config[status] || config.UNPAID;
        return (
            <span className={`status-badge ${s.class}`}>
                {s.icon} {s.text}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="fee-details-loading">
                <div className="spinner"></div>
                <p>Loading your fee details...</p>
            </div>
        );
    }

    return (
        <div className="student-fee-details">
            {/* Header */}
            <div className="page-header">
                <h1><FiDollarSign /> My Fee Details</h1>
                <p>View your fee structure, payments, and outstanding balance</p>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="summary-cards">
                    <div className="summary-card total-approved">
                        <div className="card-icon"><FiFileText /></div>
                        <div className="card-content">
                            <span className="label">Total Approved Fee</span>
                            <span className="value">{formatCurrency(summary.totalApproved)}</span>
                        </div>
                    </div>
                    <div className="summary-card total-paid">
                        <div className="card-icon"><FiCheck /></div>
                        <div className="card-content">
                            <span className="label">Total Paid</span>
                            <span className="value">{formatCurrency(summary.totalPaid)}</span>
                        </div>
                    </div>
                    <div className="summary-card outstanding">
                        <div className="card-icon"><FiClock /></div>
                        <div className="card-content">
                            <span className="label">Outstanding Balance</span>
                            <span className="value">{formatCurrency(summary.totalOutstanding)}</span>
                        </div>
                    </div>
                    {summary.totalOverdue > 0 && (
                        <div className="summary-card overdue">
                            <div className="card-icon"><FiAlertTriangle /></div>
                            <div className="card-content">
                                <span className="label">Overdue Amount</span>
                                <span className="value">{formatCurrency(summary.totalOverdue)}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Main Content */}
            <div className="fee-content">
                {/* Ledger Selector */}
                {ledgers.length > 0 && (
                    <div className="ledger-selector">
                        <h3>Select Academic Period</h3>
                        <div className="ledger-tabs">
                            {ledgers.map(ledger => (
                                <button
                                    key={ledger._id}
                                    className={`ledger-tab ${selectedLedger?._id === ledger._id ? 'active' : ''}`}
                                    onClick={() => setSelectedLedger(ledger)}
                                >
                                    <span className="year">{ledger.academicYear}</span>
                                    {ledger.semester && <span className="sem">Sem {ledger.semester}</span>}
                                    {getStatusBadge(ledger.feeStatus)}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Selected Ledger Details */}
                {selectedLedger ? (
                    <div className="ledger-details">
                        {/* Status Banner */}
                        <div className={`status-banner ${selectedLedger.feeStatus?.toLowerCase()}`}>
                            <div className="status-info">
                                {getStatusBadge(selectedLedger.feeStatus)}
                                {selectedLedger.isOverdue && (
                                    <span className="overdue-warning">
                                        <FiAlertTriangle /> {selectedLedger.overdueDays || 0} days overdue
                                    </span>
                                )}
                            </div>
                            {selectedLedger.dueDate && (
                                <div className="due-date">
                                    <FiCalendar />
                                    <span>Due: {new Date(selectedLedger.dueDate).toLocaleDateString()}</span>
                                </div>
                            )}
                        </div>

                        {/* Fee Breakup */}
                        <div className="section fee-breakup">
                            <h3><FiFileText /> Fee Breakup</h3>
                            <div className="breakup-table">
                                <div className="breakup-header">
                                    <span>Fee Head</span>
                                    <span>Amount</span>
                                </div>
                                {selectedLedger.feeHeads?.map((head, idx) => (
                                    <div key={idx} className={`breakup-row ${!head.isApplicable ? 'not-applicable' : ''}`}>
                                        <span className="head-name">
                                            {head.headName}
                                            {head.isOptional && <span className="optional-tag">(Optional)</span>}
                                        </span>
                                        <span className="head-amount">
                                            {head.isApplicable ? formatCurrency(head.amount) : 'N/A'}
                                        </span>
                                    </div>
                                ))}
                                <div className="breakup-row total-row">
                                    <span>Approved Total</span>
                                    <span>{formatCurrency(selectedLedger.approvedTotal)}</span>
                                </div>
                                {selectedLedger.concessionAmount > 0 && (
                                    <div className="breakup-row concession-row">
                                        <span>
                                            Concession
                                            {selectedLedger.concessionReason && (
                                                <span className="concession-reason">({selectedLedger.concessionReason})</span>
                                            )}
                                        </span>
                                        <span>- {formatCurrency(selectedLedger.concessionAmount)}</span>
                                    </div>
                                )}
                                <div className="breakup-row net-row">
                                    <span>Net Payable</span>
                                    <span>{formatCurrency(selectedLedger.netPayable)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Summary */}
                        <div className="section payment-summary">
                            <h3><FiDollarSign /> Payment Summary</h3>
                            <div className="payment-grid">
                                <div className="payment-item">
                                    <span className="label">Net Payable</span>
                                    <span className="value">{formatCurrency(selectedLedger.netPayable)}</span>
                                </div>
                                <div className="payment-item paid">
                                    <span className="label">Amount Paid</span>
                                    <span className="value">{formatCurrency(selectedLedger.totalPaid)}</span>
                                </div>
                                <div className="payment-item outstanding">
                                    <span className="label">Outstanding</span>
                                    <span className="value">{formatCurrency(selectedLedger.outstandingBalance)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Installments */}
                        {selectedLedger.hasInstallments && selectedLedger.installments?.length > 0 && (
                            <div className="section installments">
                                <h3><FiCalendar /> Installment Schedule</h3>
                                <div className="installment-list">
                                    {selectedLedger.installments.map((inst, idx) => (
                                        <div key={idx} className={`installment-item ${inst.status?.toLowerCase()}`}>
                                            <div className="inst-info">
                                                <span className="inst-no">Installment {inst.installmentNo}</span>
                                                <span className="inst-desc">{inst.description}</span>
                                            </div>
                                            <div className="inst-details">
                                                <span className="inst-amount">{formatCurrency(inst.amount)}</span>
                                                <span className="inst-due">Due: {new Date(inst.dueDate).toLocaleDateString()}</span>
                                                <span className={`inst-status ${inst.status?.toLowerCase()}`}>
                                                    {inst.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="no-ledger">
                        <FiInfo />
                        <p>No fee ledger found for your account.</p>
                        <span>Please contact the administration office for assistance.</span>
                    </div>
                )}

                {/* Payment History */}
                <div className="section payment-history">
                    <h3><FiFileText /> Payment History</h3>
                    {receipts.length > 0 ? (
                        <div className="receipts-list">
                            {receipts.map(receipt => (
                                <div key={receipt._id} className="receipt-item">
                                    <div className="receipt-left">
                                        <span className="receipt-number">{receipt.receiptNumber}</span>
                                        <span className="receipt-date">
                                            {new Date(receipt.receiptDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="receipt-right">
                                        <span className="receipt-amount">{formatCurrency(receipt.amount)}</span>
                                        <span className="receipt-mode">{receipt.paymentMode?.replace('_', ' ')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-receipts">
                            <p>No payment receipts found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Info Notice */}
            <div className="info-notice">
                <FiInfo />
                <p>
                    This is a read-only view of your fee records. For any queries or to make a payment,
                    please visit the Finance Office during working hours.
                </p>
            </div>
        </div>
    );
};

export default FeeDetails;
