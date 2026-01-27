import React, { useState, useEffect, useCallback } from 'react';
import { feeAPI, adminAPI } from '../../../services/api';
import { toast } from 'react-toastify';
import {
    FiDollarSign,
    FiTrendingUp,
    FiAlertTriangle,
    FiClock,
    FiUsers,
    FiFileText,
    FiDownload,
    FiRefreshCw,
    FiArrowRight,
    FiCalendar
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import './AdminFeeDashboard.css';

const AdminFeeDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState(null);
    const [filters, setFilters] = useState({
        academicYear: '',
        semester: ''
    });
    const [academicYears, setAcademicYears] = useState([]);

    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true);
            const params = {};
            if (filters.academicYear) params.academicYear = filters.academicYear;
            if (filters.semester) params.semester = filters.semester;

            const response = await feeAPI.dashboard.get(params);
            setDashboardData(response.data.data);
        } catch (error) {
            toast.error(error.message || 'Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    const fetchAcademicYears = useCallback(async () => {
        try {
            const response = await feeAPI.ledgers.getAcademicYears();
            setAcademicYears(response.data.data || []);
        } catch (error) {
            console.error('Failed to load academic years:', error);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
        fetchAcademicYears();
    }, [fetchDashboardData, fetchAcademicYears]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'PAID': return 'status-paid';
            case 'PARTIALLY_PAID': return 'status-partial';
            case 'UNPAID': return 'status-unpaid';
            case 'OVERDUE': return 'status-overdue';
            default: return '';
        }
    };

    const getAgingColor = (bucket) => {
        switch (bucket) {
            case 'CURRENT': return 'aging-current';
            case '1-30_DAYS': return 'aging-30';
            case '31-60_DAYS': return 'aging-60';
            case '60+_DAYS': return 'aging-critical';
            default: return '';
        }
    };

    if (loading) {
        return (
            <div className="fee-dashboard-loading">
                <div className="spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    const { kpis, agingReport, recentReceipts } = dashboardData || {};

    return (
        <div className="admin-fee-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div className="header-title">
                    <h1>Fee Management Dashboard</h1>
                    <p>Institutional Fees Accounting & Ledger System</p>
                </div>
                <div className="header-actions">
                    <button
                        className="btn-refresh"
                        onClick={fetchDashboardData}
                    >
                        <FiRefreshCw />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="dashboard-filters">
                <div className="filter-group">
                    <label>Academic Year</label>
                    <select
                        value={filters.academicYear}
                        onChange={(e) => setFilters(prev => ({ ...prev, academicYear: e.target.value }))}
                    >
                        <option value="">All Years</option>
                        {academicYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Semester</label>
                    <select
                        value={filters.semester}
                        onChange={(e) => setFilters(prev => ({ ...prev, semester: e.target.value }))}
                    >
                        <option value="">All Semesters</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                            <option key={sem} value={sem}>Semester {sem}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="kpi-grid">
                <div className="kpi-card kpi-approved">
                    <div className="kpi-icon">
                        <FiFileText />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Total Approved Fees</span>
                        <span className="kpi-value">{formatCurrency(kpis?.totalApproved)}</span>
                        <span className="kpi-sub">{kpis?.ledgerCount || 0} students</span>
                    </div>
                </div>

                <div className="kpi-card kpi-received">
                    <div className="kpi-icon">
                        <FiTrendingUp />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Total Received</span>
                        <span className="kpi-value">{formatCurrency(kpis?.totalReceived)}</span>
                        <span className="kpi-sub">{kpis?.collectionRate}% collection rate</span>
                    </div>
                </div>

                <div className="kpi-card kpi-outstanding">
                    <div className="kpi-icon">
                        <FiDollarSign />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Outstanding Balance</span>
                        <span className="kpi-value">{formatCurrency(kpis?.totalOutstanding)}</span>
                        <span className="kpi-sub">{kpis?.unpaidCount + kpis?.partialCount || 0} pending</span>
                    </div>
                </div>

                <div className="kpi-card kpi-overdue">
                    <div className="kpi-icon">
                        <FiAlertTriangle />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Overdue Amount</span>
                        <span className="kpi-value">{formatCurrency(kpis?.overdueAmount)}</span>
                        <span className="kpi-sub">{kpis?.overdueCount || 0} defaulters</span>
                    </div>
                </div>
            </div>

            {/* Status Cards */}
            <div className="status-cards">
                <div className="status-card status-paid">
                    <span className="status-count">{kpis?.paidCount || 0}</span>
                    <span className="status-label">Fully Paid</span>
                </div>
                <div className="status-card status-partial">
                    <span className="status-count">{kpis?.partialCount || 0}</span>
                    <span className="status-label">Partially Paid</span>
                </div>
                <div className="status-card status-unpaid">
                    <span className="status-count">{kpis?.unpaidCount || 0}</span>
                    <span className="status-label">Unpaid</span>
                </div>
                <div className="status-card status-overdue">
                    <span className="status-count">{kpis?.overdueCount || 0}</span>
                    <span className="status-label">Overdue</span>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="dashboard-content">
                {/* Aging Report */}
                <div className="dashboard-card aging-card">
                    <div className="card-header">
                        <h3><FiClock /> Aging Report</h3>
                        <button
                            className="btn-link"
                            onClick={() => navigate('/admin/fees/reports/aging')}
                        >
                            View Details <FiArrowRight />
                        </button>
                    </div>
                    <div className="aging-buckets">
                        {agingReport?.map((bucket, index) => (
                            <div
                                key={bucket.bucket}
                                className={`aging-bucket ${getAgingColor(bucket.bucket)}`}
                            >
                                <span className="bucket-label">
                                    {bucket.bucket === 'CURRENT' ? 'Current' : bucket.bucket.replace('_', ' ')}
                                </span>
                                <span className="bucket-amount">{formatCurrency(bucket.totalAmount)}</span>
                                <span className="bucket-count">{bucket.count} students</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Receipts */}
                <div className="dashboard-card receipts-card">
                    <div className="card-header">
                        <h3><FiFileText /> Recent Receipts</h3>
                        <button
                            className="btn-link"
                            onClick={() => navigate('/admin/fees/receipts')}
                        >
                            View All <FiArrowRight />
                        </button>
                    </div>
                    <div className="receipts-list">
                        {recentReceipts?.length > 0 ? (
                            recentReceipts.map(receipt => (
                                <div key={receipt._id} className="receipt-item">
                                    <div className="receipt-info">
                                        <span className="receipt-number">{receipt.receiptNumber}</span>
                                        <span className="receipt-student">
                                            {receipt.studentId?.userId?.name || receipt.studentSnapshot?.name}
                                        </span>
                                    </div>
                                    <div className="receipt-details">
                                        <span className="receipt-amount">{formatCurrency(receipt.amount)}</span>
                                        <span className="receipt-date">
                                            {new Date(receipt.receiptDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-data">No recent receipts</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
                <h3>Quick Actions</h3>
                <div className="actions-grid">
                    <button
                        className="action-btn"
                        onClick={() => navigate('/admin/fees/structures')}
                    >
                        <FiFileText />
                        <span>Fee Structures</span>
                    </button>
                    <button
                        className="action-btn"
                        onClick={() => navigate('/admin/fees/ledgers')}
                    >
                        <FiUsers />
                        <span>Student Ledgers</span>
                    </button>
                    <button
                        className="action-btn"
                        onClick={() => navigate('/admin/fees/receipts')}
                    >
                        <FiDollarSign />
                        <span>Record Receipt</span>
                    </button>
                    <button
                        className="action-btn"
                        onClick={() => navigate('/admin/fees/reports/defaulters')}
                    >
                        <FiAlertTriangle />
                        <span>Defaulters List</span>
                    </button>
                    <button
                        className="action-btn"
                        onClick={() => navigate('/admin/fees/reports')}
                    >
                        <FiDownload />
                        <span>Export Reports</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminFeeDashboard;
