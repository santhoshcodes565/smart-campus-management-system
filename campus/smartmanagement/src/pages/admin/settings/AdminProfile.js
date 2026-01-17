import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../../services/api';
import { SkeletonCard } from '../../../components/common/LoadingSpinner';
import {
    FiUser,
    FiMail,
    FiPhone,
    FiShield,
    FiCalendar,
    FiClock,
    FiSave,
    FiLock
} from 'react-icons/fi';
import { getErrorMessage } from '../../../utils/errorNormalizer';

const AdminProfile = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState({
        username: '',
        name: '',
        email: '',
        phone: '',
        role: '',
        createdAt: '',
        lastLogin: ''
    });
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswordForm, setShowPasswordForm] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await adminAPI.adminSettings.getProfile();
            if (response.data.success) {
                setProfile(response.data.data);
            }
        } catch (error) {
            toast.error('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const response = await adminAPI.adminSettings.updateProfile({
                name: profile.name,
                email: profile.email,
                phone: profile.phone
            });
            if (response.data.success) {
                toast.success('Profile updated successfully');
            }
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to update profile'));
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            return toast.error('Passwords do not match');
        }

        if (passwordForm.newPassword.length < 6) {
            return toast.error('Password must be at least 6 characters');
        }

        setSaving(true);
        try {
            const response = await adminAPI.adminSettings.changePassword({
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            });
            if (response.data.success) {
                toast.success('Password changed successfully');
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setShowPasswordForm(false);
            }
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to change password'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <SkeletonCard />;

    return (
        <div className="space-y-6">
            {/* Profile Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl p-6 text-white">
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold">
                        {profile.name?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{profile.name}</h1>
                        <p className="text-primary-100">@{profile.username}</p>
                        <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-white/20 rounded-full text-sm">
                            <FiShield size={14} />
                            {profile.role?.toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Profile Form */}
            <div className="card">
                <h2 className="text-lg font-semibold text-secondary-800 mb-4 flex items-center gap-2">
                    <FiUser className="text-primary-600" />
                    Profile Information
                </h2>

                <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label">Username</label>
                            <input
                                type="text"
                                className="input bg-gray-100"
                                value={profile.username}
                                disabled
                            />
                            <p className="text-xs text-secondary-400 mt-1">Username cannot be changed</p>
                        </div>

                        <div>
                            <label className="label">Full Name</label>
                            <input
                                type="text"
                                className="input"
                                value={profile.name}
                                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="label flex items-center gap-1">
                                <FiMail size={14} /> Email
                            </label>
                            <input
                                type="email"
                                className="input"
                                value={profile.email || ''}
                                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                placeholder="admin@campus.edu"
                            />
                        </div>

                        <div>
                            <label className="label flex items-center gap-1">
                                <FiPhone size={14} /> Phone
                            </label>
                            <input
                                type="text"
                                className="input"
                                value={profile.phone || ''}
                                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                placeholder="+91 9876543210"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                        <div className="flex items-center gap-3 text-sm text-secondary-600">
                            <FiCalendar className="text-primary-500" />
                            <span>Account Created: {new Date(profile.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-secondary-600">
                            <FiClock className="text-primary-500" />
                            <span>Last Login: {profile.lastLogin ? new Date(profile.lastLogin).toLocaleString() : 'Never'}</span>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="submit" className="btn-primary" disabled={saving}>
                            <FiSave size={16} />
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setShowPasswordForm(!showPasswordForm)}
                        >
                            <FiLock size={16} />
                            Change Password
                        </button>
                    </div>
                </form>
            </div>

            {/* Change Password Form */}
            {showPasswordForm && (
                <div className="card border-primary-200 bg-primary-50/30">
                    <h2 className="text-lg font-semibold text-secondary-800 mb-4 flex items-center gap-2">
                        <FiLock className="text-primary-600" />
                        Change Password
                    </h2>

                    <form onSubmit={handlePasswordChange} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="label">Current Password</label>
                                <input
                                    type="password"
                                    className="input"
                                    value={passwordForm.currentPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">New Password</label>
                                <input
                                    type="password"
                                    className="input"
                                    value={passwordForm.newPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div>
                                <label className="label">Confirm Password</label>
                                <input
                                    type="password"
                                    className="input"
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button type="submit" className="btn-primary" disabled={saving}>
                                {saving ? 'Changing...' : 'Update Password'}
                            </button>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setShowPasswordForm(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default AdminProfile;
