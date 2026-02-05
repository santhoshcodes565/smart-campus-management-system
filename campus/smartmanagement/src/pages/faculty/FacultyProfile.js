import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { facultyAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import { SkeletonStats, SkeletonCard } from '../../components/common/LoadingSpinner';
import {
    FiUser, FiMail, FiPhone, FiCalendar, FiBook, FiHash,
    FiMapPin, FiAward, FiEdit, FiBriefcase, FiClock
} from 'react-icons/fi';

// Safe value helper - prevents crashes from undefined data
const safe = (value, fallback = 'N/A') => value ?? fallback;

// Get avatar initial safely
const getInitial = (name) => name?.charAt(0)?.toUpperCase() || 'F';

// Format date
const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

// Calculate profile completion percentage
const calculateProfileCompletion = (profile) => {
    if (!profile) return 0;
    const fields = [
        profile.name,
        profile.email,
        profile.phone,
        profile.employeeId,
        profile.designation,
        profile.qualification,
        profile.experience,
        profile.department,
        profile.address
    ];
    const filled = fields.filter(f => f && f !== '' && f !== 0).length;
    return Math.round((filled / fields.length) * 100);
};

const FacultyProfile = () => {
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
            const response = await facultyAPI.getMyProfile();
            if (response.data.success) {
                setProfile(response.data.data);
            } else {
                setError('Failed to load profile');
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
            setError(err.message || 'Failed to load profile');
        } finally {
            setLoading(false);
        }
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
                    { label: 'Dashboard', path: '/faculty/dashboard' },
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

    return (
        <div className="animate-fade-in">
            <Breadcrumb items={[
                { label: 'Dashboard', path: '/faculty/dashboard' },
                { label: 'My Profile', path: '#', isLast: true }
            ]} />

            {/* Profile Header Card */}
            <div className="card bg-gradient-to-br from-primary-600 to-primary-700 text-white border-none mb-6 overflow-hidden relative">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-4xl font-bold border-4 border-white/30">
                        {getInitial(profile?.name)}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl md:text-3xl font-bold">{safe(profile?.name, user?.name || 'Faculty')}</h1>
                        <p className="text-primary-100 mt-1">{safe(profile?.designation)} • {safe(profile?.employeeId)}</p>
                        <div className="flex flex-wrap gap-4 mt-3">
                            <span className="flex items-center gap-2 text-sm text-primary-100">
                                <FiMail size={14} /> {safe(profile?.email)}
                            </span>
                            <span className="flex items-center gap-2 text-sm text-primary-100">
                                <FiPhone size={14} /> {safe(profile?.phone)}
                            </span>
                        </div>
                    </div>
                    <Link
                        to="/faculty/settings"
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
                        Complete your profile for better visibility.
                        <Link to="/faculty/settings" className="text-primary-600 ml-1 hover:underline">
                            Update now
                        </Link>
                    </p>
                )}
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Employment Information */}
                <div className="card">
                    <h3 className="card-title flex items-center gap-2 mb-4">
                        <FiBriefcase className="text-primary-600" />
                        Employment Information
                    </h3>
                    <div className="space-y-4">
                        <InfoRow icon={FiHash} label="Employee ID" value={safe(profile?.employeeId)} />
                        <InfoRow icon={FiAward} label="Designation" value={safe(profile?.designation)} />
                        <InfoRow icon={FiBook} label="Qualification" value={safe(profile?.qualification)} />
                        <InfoRow icon={FiClock} label="Experience" value={profile?.experience ? `${profile.experience} years` : 'N/A'} />
                        <InfoRow icon={FiCalendar} label="Joining Date" value={formatDate(profile?.joiningDate)} />
                    </div>
                </div>

                {/* Personal Information */}
                <div className="card">
                    <h3 className="card-title flex items-center gap-2 mb-4">
                        <FiUser className="text-primary-600" />
                        Personal Information
                    </h3>
                    <div className="space-y-4">
                        <InfoRow icon={FiMail} label="Email" value={safe(profile?.email)} />
                        <InfoRow icon={FiPhone} label="Phone" value={safe(profile?.phone)} />
                        <InfoRow icon={FiMapPin} label="Address" value={safe(profile?.address)} />
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
                            value={safe(profile?.department?.name)}
                        />
                        <InfoRow
                            icon={FiHash}
                            label="Department Code"
                            value={safe(profile?.department?.code)}
                        />
                    </div>
                </div>

                {/* Subjects Handling */}
                <div className="card">
                    <h3 className="card-title flex items-center gap-2 mb-4">
                        <FiBook className="text-primary-600" />
                        Subjects Handling
                    </h3>
                    {profile?.subjects?.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {profile.subjects.map((subject, idx) => (
                                <span
                                    key={subject._id || idx}
                                    className="px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm font-medium"
                                >
                                    {subject.name} {subject.code && `(${subject.code})`}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-secondary-500 text-sm">No subjects assigned yet</p>
                    )}

                    {profile?.classIds?.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <p className="text-xs text-secondary-500 uppercase tracking-wider mb-2">Classes Assigned</p>
                            <div className="flex flex-wrap gap-2">
                                {profile.classIds.map((classId, idx) => (
                                    <span
                                        key={idx}
                                        className="px-3 py-1.5 bg-gray-100 text-secondary-700 rounded-full text-sm"
                                    >
                                        {classId}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
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

export default FacultyProfile;
