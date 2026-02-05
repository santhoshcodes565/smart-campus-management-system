import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { studentAPI, authAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import { SkeletonCard } from '../../components/common/LoadingSpinner';
import { toast } from 'react-toastify';
import {
    FiUser, FiMail, FiPhone, FiLock, FiSave, FiEye, FiEyeOff, FiShield, FiEdit3
} from 'react-icons/fi';

// Safe value helper
const safe = (value, fallback = '') => value ?? fallback;

const StudentSettings = () => {
    const { user, refreshUser } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');

    // Profile form state
    const [formData, setFormData] = useState({
        phone: '',
        address: '',
        guardianName: '',
        guardianPhone: '',
        bloodGroup: ''
    });

    // Password form state
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await studentAPI.getMyProfile();
            if (response.data.success) {
                const data = response.data.data;
                setProfile(data);
                setFormData({
                    phone: safe(data.userId?.phone),
                    address: safe(data.address),
                    guardianName: safe(data.guardianName),
                    guardianPhone: safe(data.guardianPhone),
                    bloodGroup: safe(data.bloodGroup)
                });
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
            toast.error('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
    };

    const togglePasswordVisibility = (field) => {
        setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
    };

    // Update profile
    const handleUpdateProfile = async (e) => {
        e.preventDefault();

        // Basic validation
        if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
            toast.error('Phone number must be 10 digits');
            return;
        }
        if (formData.guardianPhone && !/^\d{10}$/.test(formData.guardianPhone)) {
            toast.error('Guardian phone must be 10 digits');
            return;
        }

        try {
            setSaving(true);
            const response = await studentAPI.updateMyProfile(formData);
            if (response.data.success) {
                toast.success('Profile updated successfully');
                setProfile(response.data.data);
                if (refreshUser) refreshUser();
            }
        } catch (err) {
            console.error('Error updating profile:', err);
            toast.error(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    // Change password
    const handleChangePassword = async (e) => {
        e.preventDefault();

        // Validation
        if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
            toast.error('All password fields are required');
            return;
        }
        if (passwordData.newPassword.length < 6) {
            toast.error('New password must be at least 6 characters');
            return;
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }
        if (passwordData.currentPassword === passwordData.newPassword) {
            toast.error('New password must be different from current password');
            return;
        }

        try {
            setChangingPassword(true);
            const response = await authAPI.changePassword({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            if (response.data.success) {
                toast.success('Password changed successfully');
                setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                });
            }
        } catch (err) {
            console.error('Error changing password:', err);
            toast.error(err.response?.data?.message || 'Failed to change password');
        } finally {
            setChangingPassword(false);
        }
    };

    const tabs = [
        { id: 'profile', label: 'Personal Info', icon: FiUser },
        { id: 'security', label: 'Security', icon: FiShield }
    ];

    if (loading) {
        return (
            <div className="animate-fade-in p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <Breadcrumb items={[
                { label: 'Dashboard', path: '/student/dashboard' },
                { label: 'Settings', path: '#', isLast: true }
            ]} />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Account Settings</h1>
                    <p className="text-secondary-500 mt-1">Manage your profile and security settings</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-primary-600 text-primary-600'
                                : 'border-transparent text-secondary-500 hover:text-secondary-700'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <form onSubmit={handleUpdateProfile}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Contact Information */}
                        <div className="card">
                            <h3 className="card-title flex items-center gap-2 mb-4">
                                <FiEdit3 className="text-primary-600" />
                                Contact Information
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                                        <input
                                            type="email"
                                            value={safe(profile?.userId?.email, user?.email)}
                                            disabled
                                            className="input pl-10 bg-gray-50 cursor-not-allowed"
                                        />
                                    </div>
                                    <p className="text-xs text-secondary-500 mt-1">Email cannot be changed. Contact admin if needed.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                                        Phone Number
                                    </label>
                                    <div className="relative">
                                        <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            placeholder="Enter 10-digit phone number"
                                            maxLength={10}
                                            className="input pl-10"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                                        Address
                                    </label>
                                    <textarea
                                        name="address"
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        placeholder="Enter your address"
                                        rows={3}
                                        className="input resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                                        Blood Group
                                    </label>
                                    <select
                                        name="bloodGroup"
                                        value={formData.bloodGroup}
                                        onChange={handleInputChange}
                                        className="input"
                                    >
                                        <option value="">Select blood group</option>
                                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                                            <option key={bg} value={bg}>{bg}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Guardian Information */}
                        <div className="card">
                            <h3 className="card-title flex items-center gap-2 mb-4">
                                <FiUser className="text-primary-600" />
                                Guardian Information
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                                        Guardian Name
                                    </label>
                                    <input
                                        type="text"
                                        name="guardianName"
                                        value={formData.guardianName}
                                        onChange={handleInputChange}
                                        placeholder="Enter guardian's name"
                                        className="input"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                                        Guardian Phone
                                    </label>
                                    <div className="relative">
                                        <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                                        <input
                                            type="tel"
                                            name="guardianPhone"
                                            value={formData.guardianPhone}
                                            onChange={handleInputChange}
                                            placeholder="Enter guardian's phone"
                                            maxLength={10}
                                            className="input pl-10"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end mt-6">
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-primary flex items-center gap-2"
                        >
                            <FiSave size={16} />
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="card">
                        <h3 className="card-title flex items-center gap-2 mb-4">
                            <FiLock className="text-primary-600" />
                            Change Password
                        </h3>
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">
                                    Current Password
                                </label>
                                <div className="relative">
                                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                                    <input
                                        type={showPasswords.current ? 'text' : 'password'}
                                        name="currentPassword"
                                        value={passwordData.currentPassword}
                                        onChange={handlePasswordChange}
                                        placeholder="Enter current password"
                                        className="input pl-10 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => togglePasswordVisibility('current')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
                                    >
                                        {showPasswords.current ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">
                                    New Password
                                </label>
                                <div className="relative">
                                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                                    <input
                                        type={showPasswords.new ? 'text' : 'password'}
                                        name="newPassword"
                                        value={passwordData.newPassword}
                                        onChange={handlePasswordChange}
                                        placeholder="Enter new password (min 6 chars)"
                                        className="input pl-10 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => togglePasswordVisibility('new')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
                                    >
                                        {showPasswords.new ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">
                                    Confirm New Password
                                </label>
                                <div className="relative">
                                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                                    <input
                                        type={showPasswords.confirm ? 'text' : 'password'}
                                        name="confirmPassword"
                                        value={passwordData.confirmPassword}
                                        onChange={handlePasswordChange}
                                        placeholder="Confirm new password"
                                        className="input pl-10 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => togglePasswordVisibility('confirm')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
                                    >
                                        {showPasswords.confirm ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={changingPassword}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                <FiShield size={16} />
                                {changingPassword ? 'Changing Password...' : 'Change Password'}
                            </button>
                        </form>
                    </div>

                    {/* Security Tips */}
                    <div className="card bg-primary-50 border-primary-100">
                        <h3 className="card-title flex items-center gap-2 mb-4 text-primary-800">
                            <FiShield className="text-primary-600" />
                            Security Tips
                        </h3>
                        <ul className="space-y-3 text-sm text-primary-700">
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2" />
                                Use a strong password with at least 8 characters
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2" />
                                Include uppercase, lowercase, numbers, and symbols
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2" />
                                Never share your password with anyone
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2" />
                                Change your password regularly
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2" />
                                Log out from shared devices
                            </li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentSettings;
