import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { facultyAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import { SkeletonStats } from '../../components/common/LoadingSpinner';
import { toast } from 'react-toastify';
import {
    FiUser, FiMail, FiPhone, FiCalendar, FiBook, FiHash,
    FiMapPin, FiArrowLeft, FiUsers, FiHeart, FiHome
} from 'react-icons/fi';

const StudentProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (id) {
            fetchStudent();
        }
    }, [id]);

    const fetchStudent = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await facultyAPI.getStudentProfile(id);
            if (response.data.success) {
                setStudent(response.data.data);
            } else {
                setError('Failed to load student profile');
            }
        } catch (err) {
            console.error('Error fetching student:', err);
            setError(err.response?.data?.message || 'Failed to load student profile');
            toast.error('Failed to load student profile');
        } finally {
            setLoading(false);
        }
    };

    // Helper function to get avatar initial safely
    const getInitial = (name) => {
        return name?.charAt(0)?.toUpperCase() || 'S';
    };

    // Helper function to format class info
    const getClassInfo = () => {
        if (!student) return 'N/A';
        const parts = [];
        if (student.course) parts.push(student.course);
        if (student.year) parts.push(`Year ${student.year}`);
        if (student.section) parts.push(`Section ${student.section}`);
        return parts.length > 0 ? parts.join(' - ') : 'N/A';
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
            <div className="animate-fade-in p-8">
                <SkeletonStats />
            </div>
        );
    }

    if (error || !student) {
        return (
            <div className="animate-fade-in">
                <Breadcrumb items={[
                    { label: 'Dashboard', path: '/faculty/dashboard' },
                    { label: 'Students', path: '/faculty/students' },
                    { label: 'Profile', path: '#', isLast: true }
                ]} />
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <div className="text-6xl mb-4">😕</div>
                    <h2 className="text-xl font-bold text-secondary-800 mb-2">Student Not Found</h2>
                    <p className="text-secondary-500 mb-6">{error || 'The requested student profile could not be found.'}</p>
                    <button
                        onClick={() => navigate('/faculty/students')}
                        className="btn-primary flex items-center gap-2"
                    >
                        <FiArrowLeft size={16} />
                        Back to Student List
                    </button>
                </div>
            </div>
        );
    }

    // Get student name and email from populated user data
    const studentName = student.userId?.name || 'Unknown Student';
    const studentEmail = student.userId?.email || 'N/A';
    const studentPhone = student.userId?.phone || 'N/A';

    return (
        <div className="animate-fade-in">
            <Breadcrumb items={[
                { label: 'Dashboard', path: '/faculty/dashboard' },
                { label: 'Students', path: '/faculty/students' },
                { label: studentName, path: '#', isLast: true }
            ]} />

            {/* Header */}
            <div className="card bg-gradient-to-br from-primary-600 to-primary-700 text-white border-none mb-6 overflow-hidden relative">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-4xl font-bold">
                        {getInitial(studentName)}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl md:text-3xl font-bold">{studentName}</h1>
                        <p className="text-primary-100 mt-1">{student.rollNo || 'No Roll Number'}</p>
                        <div className="flex flex-wrap gap-4 mt-3">
                            <span className="flex items-center gap-2 text-sm text-primary-100">
                                <FiMail size={14} /> {studentEmail}
                            </span>
                            <span className="flex items-center gap-2 text-sm text-primary-100">
                                <FiPhone size={14} /> {studentPhone}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/faculty/students')}
                        className="absolute top-0 right-0 md:static btn bg-white/10 hover:bg-white/20 text-white border-none flex items-center gap-2"
                    >
                        <FiArrowLeft size={16} />
                        Back
                    </button>
                </div>
                <FiUser size={200} className="absolute -right-10 -bottom-10 text-white/5" />
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
                        <InfoRow icon={FiHash} label="Roll Number" value={student.rollNo || 'N/A'} />
                        <InfoRow icon={FiBook} label="Course" value={student.course || 'N/A'} />
                        <InfoRow icon={FiUsers} label="Year & Section" value={`Year ${student.year || '-'} - Section ${student.section || '-'}`} />
                        <InfoRow icon={FiCalendar} label="Semester" value={student.semester ? `Semester ${student.semester}` : 'N/A'} />
                        <InfoRow icon={FiCalendar} label="Batch" value={student.batch || 'N/A'} />
                        <InfoRow icon={FiCalendar} label="Admission Date" value={formatDate(student.admissionDate)} />
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
                        <InfoRow icon={FiHeart} label="Blood Group" value={student.bloodGroup || 'N/A'} />
                        <InfoRow icon={FiHome} label="Address" value={student.address || 'N/A'} />
                    </div>
                </div>

                {/* Guardian Information */}
                <div className="card">
                    <h3 className="card-title flex items-center gap-2 mb-4">
                        <FiUsers className="text-primary-600" />
                        Guardian Information
                    </h3>
                    <div className="space-y-4">
                        <InfoRow icon={FiUser} label="Guardian Name" value={student.guardianName || 'N/A'} />
                        <InfoRow icon={FiPhone} label="Guardian Phone" value={student.guardianPhone || 'N/A'} />
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
                            value={student.departmentId?.name || student.userId?.department || 'N/A'}
                        />
                        <InfoRow
                            icon={FiBook}
                            label="Course Program"
                            value={student.courseId?.name || student.course || 'N/A'}
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
