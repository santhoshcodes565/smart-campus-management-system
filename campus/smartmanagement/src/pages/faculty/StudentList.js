import React, { useState, useEffect } from 'react';
import { facultyAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import { FiSearch, FiFilter, FiUser, FiMail, FiPhone, FiBook } from 'react-icons/fi';

const StudentList = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClass, setSelectedClass] = useState('all');
    const [classes, setClasses] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [studentsRes, classesRes] = await Promise.all([
                facultyAPI.getAllStudents(),
                facultyAPI.getClasses()
            ]);

            if (studentsRes.data.success) {
                setStudents(studentsRes.data.data);
            }
            if (classesRes.data.success) {
                setClasses(classesRes.data.data);
            }
        } catch (error) {
            console.error('Error fetching students:', error);
            // Fallback for demo
            setStudents([
                { _id: '1', name: 'John Doe', rollNo: 'CS2021001', academic: { class: 'CSE-3-A', year: 3, section: 'A' }, user: { email: 'john@example.com', phone: '9876543210' } },
                { _id: '2', name: 'Jane Smith', rollNo: 'CS2021002', academic: { class: 'CSE-3-A', year: 3, section: 'A' }, user: { email: 'jane@example.com', phone: '9876543211' } },
                { _id: '3', name: 'Mike Johnson', rollNo: 'CS2021003', academic: { class: 'CSE-3-B', year: 3, section: 'B' }, user: { email: 'mike@example.com', phone: '9876543212' } },
            ]);
            setClasses(['CSE-3-A', 'CSE-3-B', 'CSE-2-A']);
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(student => {
        const matchesSearch =
            student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.rollNo?.toLowerCase().includes(searchTerm.toLowerCase());

        // Handle class filtering - class can be object or string
        let matchesClass = selectedClass === 'all';
        if (!matchesClass) {
            const studentClass = student.academic?.class;
            if (typeof studentClass === 'object') {
                matchesClass = studentClass?._id === selectedClass || studentClass?.name === selectedClass;
            } else {
                matchesClass = studentClass === selectedClass;
            }
        }

        return matchesSearch && matchesClass;
    });

    return (
        <div className="animate-fade-in">
            <Breadcrumb items={[{ label: 'Dashboard', path: '/faculty/dashboard' }, { label: 'Student List', path: '/faculty/students', isLast: true }]} />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Student List</h1>
                    <p className="text-secondary-500 mt-1">View and manage students in your classes</p>
                </div>
            </div>

            {/* Filters */}
            <div className="card mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                        >
                            <option value="all">All Classes</option>
                            {classes.map(c => (
                                <option key={c._id || c} value={c._id || c}>
                                    {typeof c === 'object' ? `${c.name || c.department} - Year ${c.year} ${c.section || ''}` : c}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center justify-end text-sm text-secondary-500">
                        Showing {filteredStudents.length} Students
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
                    description="No students match your current search or filter criteria."
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
                                    <td className="font-medium text-primary-600">{student.rollNo}</td>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-xs font-bold">
                                                {student.name.charAt(0)}
                                            </div>
                                            <span className="font-medium text-secondary-800">{student.name}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="badge bg-secondary-100 text-secondary-700">
                                            {typeof student.academic?.class === 'object'
                                                ? (student.academic.class.name || `${student.academic.class.department}-${student.academic.class.year}${student.academic.class.section || ''}`)
                                                : (student.academic?.class || 'N/A')
                                            }
                                        </span>
                                    </td>
                                    <td>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-xs text-secondary-500">
                                                <FiMail size={12} /> {student.user?.email}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-secondary-500">
                                                <FiPhone size={12} /> {student.user?.phone || 'N/A'}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
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
