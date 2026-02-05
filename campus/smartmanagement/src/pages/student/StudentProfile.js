import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { studentAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import { SkeletonStats, SkeletonCard } from '../../components/common/LoadingSpinner';
import { toast } from 'react-toastify';
import {
    FiUser, FiMail, FiPhone, FiCalendar, FiBook, FiHash,
    FiMapPin, FiUsers, FiHeart, FiHome, FiAward, FiEdit
} from 'react-icons/fi';
import { Link } from 'react-router-dom';

// Safe value helper - prevents crashes from undefined data
const safe = (value, fallback = 'N/A') => value ?? fallback;

// Get avatar initial safely
const getInitial = (name) => name?.charAt(0)?.toUpperCase() || 'U';

// Calculate profile completion percentage
const calculateProfileCompletion = (profile) => {
    if (!profile) return 0;
    const fields = [
        profile.userId?.name,
        profile.userId?.email,
        profile.userId?.phone,
        profile.rollNo,
        profile.course,
        profile.year,
        profile.section,
        profile.guardianName,
        profile.guardianPhone,
        profile.address,
        profile.bloodGroup
    ];
    const filled = fields.filter(f => f && f !== '').length;
    return Math.round((filled / fields.length) * 100);
};

const StudentProfile = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await studentAPI.getMyProfile();
            if (response.data.success) {
                setProfile(response.data.data);
            } else {
                setError('Failed to load profile');
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
            setError(err.response?.data?.message || 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    // Format date
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="animate-fade-in p-4">
                <SkeletonStats />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="animate-fade-in">
                <Breadcrumb items={[
                    { label: 'Dashboard', path: '/student/dashboard' },
                    { label: 'My Profile', path: '#', isLast: true }
                ]} />
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <div className="text-6xl mb-4">😕</div>
                    <h2 className="text-xl font-bold text-secondary-800 mb-2">Profile Not Found</h2>
                    <p className="text-secondary-500 mb-6">{error}</p>
                    <button onClick={fetchProfile} className="btn-primary">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const profileCompletion = calculateProfileCompletion(profile);
    const studentName = safe(profile?.userId?.name, user?.name || 'Student');
    const studentEmail = safe(profile?.userId?.email, user?.email);
    const studentPhone = safe(profile?.userId?.phone);

    return (
        <div className="animate-fade-in">
            <Breadcrumb items={[
                { label: 'Dashboard', path: '/student/dashboard' },
                { label: 'My Profile', path: '#', isLast: true }
            ]} />

            {/* Profile Header Card */}
            <div className="card bg-gradient-to-br from-primary-600 to-primary-700 text-white border-none mb-6 overflow-hidden relative">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-4xl font-bold border-4 border-white/30">
                        {getInitial(studentName)}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl md:text-3xl font-bold">{studentName}</h1>
                        <p className="text-primary-100 mt-1">{safe(profile?.rollNo, 'No Roll Number')}</p>
                        <div className="flex flex-wrap gap-4 mt-3">
                            <span className="flex items-center gap-2 text-sm text-primary-100">
                                <FiMail size={14} /> {studentEmail}
                            </span>
                            <span className="flex items-center gap-2 text-sm text-primary-100">
                                <FiPhone size={14} /> {studentPhone}
                            </span>
                        </div>
                    </div>
                    <Link
                        to="/student/settings"
                        className="absolute top-0 right-0 md:static btn bg-white/10 hover:bg-white/20 text-white border-none flex items-center gap-2"
                    >
                        <FiEdit size={16} />
                        Edit Profile
                    </Link>
                </div>
                <FiUser size={200} className="absolute -right-10 -bottom-10 text-white/5" />
            </div>

            {/* Profile Completion */}
            <div className="card mb-6">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <FiAward className="text-primary-600" />
                        <span className="font-medium text-secondary-800">Profile Strength</span>
                    </div>
                    <span className="text-sm font-semibold text-primary-600">{profileCompletion}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${profileCompletion >= 80 ? 'bg-success-500' :
                                profileCompletion >= 50 ? 'bg-warning-500' : 'bg-danger-500'
                            }`}
                        style={{ width: `${profileCompletion}%` }}
                    />
                </div>
                {profileCompletion < 100 && (
                    <p className="text-xs text-secondary-500 mt-2">
                        Complete your profile to unlock all features.
                        <Link to="/student/settings" className="text-primary-600 ml-1 hover:underline">
                            Update now
                        </Link>
                    </p>
                )}
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Academic Information */}
                <div className="card">
                    <h3 className="card-title flex items-center gap-2 mb-4">
                        <FiBook className="text-primary-600" />
                        Academic Information
                    </h3>
                    <div className="space-y-4">
                        <InfoRow icon={FiHash} label="Roll Number" value={safe(profile?.rollNo)} />
                        <InfoRow icon={FiBook} label="Course" value={safe(profile?.course)} />
                        <InfoRow
                            icon={FiUsers}
                            label="Year & Section"
                            value={`Year ${safe(profile?.year, '-')} - Section ${safe(profile?.section, '-')}`}
                        />
                        <InfoRow icon={FiCalendar} label="Semester" value={profile?.semester ? `Semester ${profile.semester}` : 'N/A'} />
                        <InfoRow icon={FiCalendar} label="Batch" value={safe(profile?.batch)} />
                        <InfoRow icon={FiCalendar} label="Admission Date" value={formatDate(profile?.admissionDate)} />
                    </div>
                </div>

                {/* Personal Information */}
                <div className="card">
                    <h3 className="card-title flex items-center gap-2 mb-4">
                        <FiUser className="text-primary-600" />
                        Personal Information
                    </h3>
                    <div className="space-y-4">
                        <InfoRow icon={FiMail} label="Email" value={studentEmail} />
                        <InfoRow icon={FiPhone} label="Phone" value={studentPhone} />
                        <InfoRow icon={FiHeart} label="Blood Group" value={safe(profile?.bloodGroup)} />
                        <InfoRow icon={FiHome} label="Address" value={safe(profile?.address)} />
                    </div>
                </div>

                {/* Guardian Information */}
                <div className="card">
                    <h3 className="card-title flex items-center gap-2 mb-4">
                        <FiUsers className="text-primary-600" />
                        Guardian Information
                    </h3>
                    <div className="space-y-4">
                        <InfoRow icon={FiUser} label="Guardian Name" value={safe(profile?.guardianName)} />
                        <InfoRow icon={FiPhone} label="Guardian Phone" value={safe(profile?.guardianPhone)} />
                    </div>
                </div>

                {/* Department Information */}
                <div className="card">
                    <h3 className="card-title flex items-center gap-2 mb-4">
                        <FiMapPin className="text-primary-600" />
                        Department Information
                    </h3>
                    <div className="space-y-4">
                        <InfoRow
                            icon={FiMapPin}
                            label="Department"
                            value={safe(profile?.departmentId?.name, profile?.userId?.department)}
                        />
                        <InfoRow
                            icon={FiBook}
                            label="Course Program"
                            value={safe(profile?.courseId?.name, profile?.course)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

// Reusable info row component
const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-3">
        <div className="p-2 bg-primary-50 rounded-lg">
            <Icon className="text-primary-600" size={16} />
        </div>
        <div className="flex-1">
            <p className="text-xs text-secondary-500 uppercase tracking-wider">{label}</p>
            <p className="text-secondary-800 font-medium">{value}</p>
        </div>
    </div>
);

export default StudentProfile;
