import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../../services/api';
import { SkeletonCard } from '../../../components/common/LoadingSpinner';
import { FiUserCheck, FiKey, FiShield, FiSave } from 'react-icons/fi';

const AdminUserPolicies = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [policies, setPolicies] = useState({
        usernameMinLength: 4,
        passwordMinLength: 8,
        requireUppercase: true,
        requireNumber: true,
        requireSpecialChar: false,
        maxLoginAttempts: 5,
        lockDuration: 30,
        forcePasswordChange: true
    });

    useEffect(() => {
        fetchPolicies();
    }, []);

    const fetchPolicies = async () => {
        try {
            const response = await adminAPI.adminSettings.getUserPolicies();
            if (response.data.success) {
                setPolicies(response.data.data);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await adminAPI.adminSettings.updateUserPolicies(policies);
            if (response.data.success) {
                toast.success('User policies saved successfully');
            }
        } catch (error) {
            toast.error('Failed to save policies');
        } finally {
            setSaving(false);
        }
    };

    const ToggleSwitch = ({ checked, onChange, label }) => (
        <label className="flex items-center justify-between cursor-pointer py-2">
            <span className="text-secondary-700">{label}</span>
            <div className="relative">
                <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${checked ? 'bg-primary-600' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`}></div>
                </div>
            </div>
        </label>
    );

    if (loading) return <SkeletonCard />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="card border-l-4 border-l-primary-500">
                <h2 className="text-lg font-semibold text-secondary-800 flex items-center gap-2">
                    <FiUserCheck className="text-primary-600" />
                    User Policies
                </h2>
                <p className="text-secondary-500 text-sm mt-1">
                    Configure username rules, password requirements, and login policies
                </p>
            </div>

            {/* Username Policy */}
            <div className="card">
                <h3 className="font-semibold text-secondary-800 flex items-center gap-2 mb-4">
                    <FiUserCheck className="text-primary-600" />
                    Username Policy
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="label">Minimum Length</label>
                        <input
                            type="number"
                            className="input"
                            value={policies.usernameMinLength}
                            onChange={(e) => setPolicies({ ...policies, usernameMinLength: parseInt(e.target.value) })}
                            min={3}
                            max={20}
                        />
                        <p className="text-xs text-secondary-400 mt-1">Minimum characters required for usernames</p>
                    </div>
                </div>
            </div>

            {/* Password Policy */}
            <div className="card">
                <h3 className="font-semibold text-secondary-800 flex items-center gap-2 mb-4">
                    <FiKey className="text-primary-600" />
                    Password Policy
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="label">Minimum Length</label>
                        <input
                            type="number"
                            className="input"
                            value={policies.passwordMinLength}
                            onChange={(e) => setPolicies({ ...policies, passwordMinLength: parseInt(e.target.value) })}
                            min={6}
                            max={32}
                        />
                    </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                    <p className="text-sm text-secondary-600 mb-3">Password Requirements:</p>
                    <ToggleSwitch
                        label="Require Uppercase Letter"
                        checked={policies.requireUppercase}
                        onChange={(v) => setPolicies({ ...policies, requireUppercase: v })}
                    />
                    <ToggleSwitch
                        label="Require Number"
                        checked={policies.requireNumber}
                        onChange={(v) => setPolicies({ ...policies, requireNumber: v })}
                    />
                    <ToggleSwitch
                        label="Require Special Character"
                        checked={policies.requireSpecialChar}
                        onChange={(v) => setPolicies({ ...policies, requireSpecialChar: v })}
                    />
                </div>
            </div>

            {/* Login Security */}
            <div className="card">
                <h3 className="font-semibold text-secondary-800 flex items-center gap-2 mb-4">
                    <FiShield className="text-primary-600" />
                    Login Security
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="label">Max Login Attempts</label>
                        <input
                            type="number"
                            className="input"
                            value={policies.maxLoginAttempts}
                            onChange={(e) => setPolicies({ ...policies, maxLoginAttempts: parseInt(e.target.value) })}
                            min={3}
                            max={10}
                        />
                        <p className="text-xs text-secondary-400 mt-1">Failed attempts before account lock</p>
                    </div>

                    <div>
                        <label className="label">Lock Duration (minutes)</label>
                        <input
                            type="number"
                            className="input"
                            value={policies.lockDuration}
                            onChange={(e) => setPolicies({ ...policies, lockDuration: parseInt(e.target.value) })}
                            min={5}
                            max={1440}
                        />
                        <p className="text-xs text-secondary-400 mt-1">How long to lock account after max attempts</p>
                    </div>
                </div>

                <div className="border-t pt-4">
                    <ToggleSwitch
                        label="Force Password Change on First Login"
                        checked={policies.forcePasswordChange}
                        onChange={(v) => setPolicies({ ...policies, forcePasswordChange: v })}
                    />
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button onClick={handleSave} className="btn-primary" disabled={saving}>
                    <FiSave size={16} />
                    {saving ? 'Saving...' : 'Save Policies'}
                </button>
            </div>
        </div>
    );
};

export default AdminUserPolicies;
