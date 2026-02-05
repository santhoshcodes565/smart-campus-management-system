import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { facultyAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import { FiSearch, FiFilter, FiUser, FiMail, FiPhone, FiEye } from 'react-icons/fi';

const StudentList = () => {
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState('all');
    const [selectedSection, setSelectedSection] = useState('all');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await facultyAPI.getAllStudents();
            if (response.data.success) {
                setStudents(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching students:', error);
            setStudents([]);
        } finally {
            setLoading(false);
        }
    };

    // Get unique years and sections for filters
    const uniqueYears = [...new Set(students.map(s => s.year).filter(Boolean))].sort();
    const uniqueSections = [...new Set(students.map(s => s.section).filter(Boolean))].sort();

    const filteredStudents = students.filter(student => {
        // Get name from populated userId
        const studentName = student.userId?.name || '';
        const rollNo = student.rollNo || '';

        const matchesSearch =
            studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rollNo.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesYear = selectedYear === 'all' || student.year?.toString() === selectedYear;
        const matchesSection = selectedSection === 'all' || student.section === selectedSection;

        return matchesSearch && matchesYear && matchesSection;
    });

    // Helper function to format class info
    const getClassInfo = (student) => {
        const parts = [];
        if (student.course) parts.push(student.course);
        if (student.year) parts.push(`Year ${student.year}`);
        if (student.section) parts.push(`Section ${student.section}`);
        return parts.length > 0 ? parts.join(' - ') : 'N/A';
    };

    // Helper to get avatar initial safely
    const getInitial = (name) => {
        return name?.charAt(0)?.toUpperCase() || 'S';
    };

    return (
        <div className="animate-fade-in">
            <Breadcrumb items={[{ label: 'Dashboard', path: '/faculty/dashboard' }, { label: 'Student List', path: '/faculty/students', isLast: true }]} />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Student List</h1>
                    <p className="text-secondary-500 mt-1">View students in your department</p>
                </div>
            </div>

            {/* Filters */}
            <div className="card mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                        <input
                            type="text"
                            placeholder="Search by name or roll no..."
                            className="input pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                        <select
                            className="input pl-10 appearance-none"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                        >
                            <option value="all">All Years</option>
                            {uniqueYears.map(year => (
                                <option key={year} value={year}>Year {year}</option>
                            ))}
                        </select>
                    </div>
                    <div className="relative">
                        <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                        <select
                            className="input pl-10 appearance-none"
                            value={selectedSection}
                            onChange={(e) => setSelectedSection(e.target.value)}
                        >
                            <option value="all">All Sections</option>
                            {uniqueSections.map(section => (
                                <option key={section} value={section}>Section {section}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center justify-end text-sm text-secondary-500">
                        Showing {filteredStudents.length} of {students.length} Students
                    </div>
                </div>
            </div>

            {/* Student Table */}
            {loading ? (
                <SkeletonTable rows={5} />
            ) : filteredStudents.length === 0 ? (
                <EmptyState
                    icon={FiUser}
                    title="No students found"
                    description={students.length === 0
                        ? "No students are assigned to your department yet."
                        : "No students match your current search or filter criteria."
                    }
                />
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Roll No</th>
                                <th>Student Name</th>
                                <th>Class</th>
                                <th>Contact Information</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map((student) => (
                                <tr key={student._id}>
                                    <td className="font-medium text-primary-600">{student.rollNo || '-'}</td>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-xs font-bold">
                                                {getInitial(student.userId?.name)}
                                            </div>
                                            <div>
                                                <span className="font-medium text-secondary-800">
                                                    {student.userId?.name || 'Unknown'}
                                                </span>
                                                {student.userId?.email && (
                                                    <p className="text-xs text-secondary-500">{student.userId.email}</p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="badge bg-secondary-100 text-secondary-700">
                                            {getClassInfo(student)}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-xs text-secondary-500">
                                                <FiMail size={12} /> {student.userId?.email || 'N/A'}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-secondary-500">
                                                <FiPhone size={12} /> {student.userId?.phone || 'N/A'}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <button
                                            className="flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm font-medium"
                                            onClick={() => navigate(`/faculty/students/${student._id}`)}
                                        >
                                            <FiEye size={14} />
                                            View Profile
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default StudentList;
