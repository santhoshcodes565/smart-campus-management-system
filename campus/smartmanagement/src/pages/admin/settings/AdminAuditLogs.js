import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../../services/api';
import { SkeletonTable } from '../../../components/common/LoadingSpinner';
import {
    FiActivity,
    FiFilter,
    FiCalendar,
    FiUser,
    FiRefreshCw
} from 'react-icons/fi';

const AdminAuditLogs = () => {
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 });
    const [filters, setFilters] = useState({
        role: '',
        action: '',
        startDate: '',
        endDate: ''
    });

    const actionTypes = [
        'USER_CREATED', 'USER_UPDATED', 'USER_DELETED',
        'PASSWORD_RESET', 'PASSWORD_CHANGED',
        'USER_LOCKED', 'USER_UNLOCKED',
        'LOGIN_SUCCESS', 'LOGIN_FAILED',
        'SETTINGS_UPDATED', 'SYSTEM_CONFIG_UPDATED',
        'ACADEMIC_RULES_UPDATED', 'POLICY_UPDATED',
        'EXAM_CREATED', 'EXAM_PUBLISHED',
        'DATA_EXPORTED'
    ];

    useEffect(() => {
        fetchLogs();
    }, [pagination.page, filters]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await adminAPI.adminSettings.getAuditLogs({
                page: pagination.page,
                limit: pagination.limit,
                ...filters
            });
            if (response.data.success) {
                setLogs(response.data.data.logs);
                setPagination(prev => ({ ...prev, ...response.data.data.pagination }));
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const clearFilters = () => {
        setFilters({ role: '', action: '', startDate: '', endDate: '' });
    };

    const getActionColor = (action) => {
        if (action.includes('LOGIN_SUCCESS') || action.includes('CREATED')) return 'text-green-600 bg-green-50';
        if (action.includes('FAILED') || action.includes('LOCKED') || action.includes('DELETED')) return 'text-red-600 bg-red-50';
        if (action.includes('UPDATED') || action.includes('RESET')) return 'text-blue-600 bg-blue-50';
        return 'text-secondary-600 bg-gray-50';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="card border-l-4 border-l-primary-500">
                <h2 className="text-lg font-semibold text-secondary-800 flex items-center gap-2">
                    <FiActivity className="text-primary-600" />
                    Audit Logs
                </h2>
                <p className="text-secondary-500 text-sm mt-1">
                    Track all administrative actions and user activities
                </p>
            </div>

            {/* Filters */}
            <div className="card">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <h3 className="font-semibold text-secondary-800 flex items-center gap-2">
                        <FiFilter className="text-primary-600" />
                        Filters
                    </h3>
                    <button onClick={clearFilters} className="btn-secondary text-sm">
                        Clear Filters
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <select
                        className="input"
                        value={filters.role}
                        onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                    >
                        <option value="">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="faculty">Faculty</option>
                        <option value="student">Student</option>
                    </select>

                    <select
                        className="input"
                        value={filters.action}
                        onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                    >
                        <option value="">All Actions</option>
                        {actionTypes.map(action => (
                            <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>
                        ))}
                    </select>

                    <div className="relative">
                        <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                        <input
                            type="date"
                            className="input pl-10"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            placeholder="Start Date"
                        />
                    </div>

                    <div className="relative">
                        <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                        <input
                            type="date"
                            className="input pl-10"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            placeholder="End Date"
                        />
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-secondary-800">
                        Activity Log ({pagination.total} entries)
                    </h3>
                    <button onClick={fetchLogs} className="btn-secondary text-sm">
                        <FiRefreshCw size={14} />
                        Refresh
                    </button>
                </div>

                {loading ? (
                    <SkeletonTable rows={10} />
                ) : (
                    <>
                        <div className="table-container max-h-[500px] overflow-y-auto">
                            <table className="table">
                                <thead className="sticky top-0 bg-white">
                                    <tr>
                                        <th>Action</th>
                                        <th>Description</th>
                                        <th>Performed By</th>
                                        <th>Role</th>
                                        <th>IP Address</th>
                                        <th>Date & Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="text-center py-8 text-secondary-500">
                                                No audit logs found
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.map(log => (
                                            <tr key={log._id}>
                                                <td>
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                                                        {log.action.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td className="text-sm max-w-48 truncate" title={log.description}>
                                                    {log.description || '-'}
                                                </td>
                                                <td className="flex items-center gap-2">
                                                    <FiUser className="text-secondary-400" size={14} />
                                                    {log.performedBy}
                                                </td>
                                                <td>
                                                    <span className={`badge ${log.performedByRole === 'admin' ? 'badge-danger' :
                                                            log.performedByRole === 'faculty' ? 'badge-info' :
                                                                'badge-secondary'
                                                        }`}>
                                                        {log.performedByRole}
                                                    </span>
                                                </td>
                                                <td className="text-sm text-secondary-500">
                                                    {log.ipAddress || '-'}
                                                </td>
                                                <td className="text-sm text-secondary-500">
                                                    {new Date(log.createdAt).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination.pages > 1 && (
                            <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                <p className="text-sm text-secondary-500">
                                    Page {pagination.page} of {pagination.pages}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        className="btn-secondary text-sm"
                                        disabled={pagination.page <= 1}
                                        onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                                    >
                                        Previous
                                    </button>
                                    <button
                                        className="btn-secondary text-sm"
                                        disabled={pagination.page >= pagination.pages}
                                        onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminAuditLogs;
