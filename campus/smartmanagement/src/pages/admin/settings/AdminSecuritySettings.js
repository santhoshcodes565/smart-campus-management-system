import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../../services/api';
import { SkeletonCard } from '../../../components/common/LoadingSpinner';
import {
    FiShield,
    FiKey,
    FiLock,
    FiUnlock,
    FiSearch,
    FiClock,
    FiUser,
    FiRefreshCw
} from 'react-icons/fi';
import { getErrorMessage } from '../../../utils/errorNormalizer';

const AdminSecuritySettings = () => {
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [loginHistory, setLoginHistory] = useState([]);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [showResetModal, setShowResetModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchData();
    }, [roleFilter, search]);

    const fetchData = async () => {
        try {
            const [usersRes, historyRes] = await Promise.all([
                adminAPI.adminSettings.getUsers({ role: roleFilter, search }),
                adminAPI.adminSettings.getLoginHistory({ limit: 20 })
            ]);

            if (usersRes.data.success) setUsers(usersRes.data.data);
            if (historyRes.data.success) setLoginHistory(historyRes.data.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleForceReset = async () => {
        if (!selectedUser || !newPassword) return;

        if (newPassword.length < 6) {
            return toast.error('Password must be at least 6 characters');
        }

        setProcessing(true);
        try {
            const response = await adminAPI.adminSettings.forcePasswordReset({
                userId: selectedUser._id,
                newPassword
            });
            if (response.data.success) {
                toast.success('Password reset successfully');
                setShowResetModal(false);
                setSelectedUser(null);
                setNewPassword('');
            }
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to reset password'));
        } finally {
            setProcessing(false);
        }
    };

    const handleLockUnlock = async (user) => {
        const lock = user.isActive;

        if (!window.confirm(`${lock ? 'Lock' : 'Unlock'} ${user.name}'s account?`)) return;

        try {
            const response = await adminAPI.adminSettings.lockUnlockUser(user._id, lock);
            if (response.data.success) {
                toast.success(`User ${lock ? 'locked' : 'unlocked'} successfully`);
                fetchData();
            }
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to update user'));
        }
    };

    const openResetModal = (user) => {
        setSelectedUser(user);
        setNewPassword('');
        setShowResetModal(true);
    };

    if (loading) return <SkeletonCard />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="card border-l-4 border-l-primary-500">
                <h2 className="text-lg font-semibold text-secondary-800 flex items-center gap-2">
                    <FiShield className="text-primary-600" />
                    Security Settings
                </h2>
                <p className="text-secondary-500 text-sm mt-1">
                    Manage user passwords, account locks, and monitor login activity
                </p>
            </div>

            {/* User Management */}
            <div className="card">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <h3 className="font-semibold text-secondary-800">User Security Management</h3>
                    <div className="flex gap-2">
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                className="input pl-10 w-48"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <select
                            className="input w-36"
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                        >
                            <option value="all">All Roles</option>
                            <option value="faculty">Faculty</option>
                            <option value="student">Student</option>
                        </select>
                    </div>
                </div>

                <div className="table-container max-h-96 overflow-y-auto">
                    <table className="table">
                        <thead className="sticky top-0 bg-white">
                            <tr>
                                <th>User</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Last Login</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-8 text-secondary-500">
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                users.map(user => (
                                    <tr key={user._id}>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium">
                                                    {user.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{user.name}</p>
                                                    <p className="text-xs text-secondary-500">@{user.username}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${user.role === 'faculty' ? 'badge-info' : 'badge-secondary'}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                                                {user.isActive ? 'Active' : 'Locked'}
                                            </span>
                                        </td>
                                        <td className="text-sm text-secondary-500">
                                            {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                                        </td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => openResetModal(user)}
                                                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                                                    title="Reset Password"
                                                >
                                                    <FiKey size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleLockUnlock(user)}
                                                    className={`p-2 rounded-lg ${user.isActive
                                                        ? 'text-red-600 hover:bg-red-50'
                                                        : 'text-green-600 hover:bg-green-50'
                                                        }`}
                                                    title={user.isActive ? 'Lock Account' : 'Unlock Account'}
                                                >
                                                    {user.isActive ? <FiLock size={16} /> : <FiUnlock size={16} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Login History */}
            <div className="card">
                <h3 className="font-semibold text-secondary-800 flex items-center gap-2 mb-4">
                    <FiClock className="text-primary-600" />
                    Recent Login Activity
                </h3>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {loginHistory.length === 0 ? (
                        <p className="text-center py-4 text-secondary-500">No login history available</p>
                    ) : (
                        loginHistory.map(log => (
                            <div key={log._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <FiUser className={log.action === 'LOGIN_SUCCESS' ? 'text-green-500' : 'text-red-500'} />
                                    <div>
                                        <p className="font-medium">{log.user}</p>
                                        <p className="text-xs text-secondary-500">@{log.username} • {log.role}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`badge ${log.action === 'LOGIN_SUCCESS' ? 'badge-success' : 'badge-danger'}`}>
                                        {log.action === 'LOGIN_SUCCESS' ? 'Success' : 'Failed'}
                                    </span>
                                    <p className="text-xs text-secondary-500 mt-1">
                                        {new Date(log.time).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Password Reset Modal */}
            {showResetModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-semibold text-secondary-800 mb-4 flex items-center gap-2">
                            <FiKey className="text-primary-600" />
                            Reset Password
                        </h3>

                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-secondary-600">Resetting password for:</p>
                            <p className="font-medium">{selectedUser?.name} (@{selectedUser?.username})</p>
                        </div>

                        <div className="mb-4">
                            <label className="label">New Password</label>
                            <input
                                type="password"
                                className="input"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                minLength={6}
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleForceReset}
                                className="btn-primary flex-1"
                                disabled={processing || !newPassword}
                            >
                                <FiRefreshCw size={16} />
                                {processing ? 'Resetting...' : 'Reset Password'}
                            </button>
                            <button
                                onClick={() => setShowResetModal(false)}
                                className="btn-secondary flex-1"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSecuritySettings;
