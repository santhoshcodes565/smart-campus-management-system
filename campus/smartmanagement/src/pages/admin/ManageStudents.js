import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal, { ConfirmModal } from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiUserX, FiUserCheck, FiKey, FiLoader } from 'react-icons/fi';

const ManageStudents = () => {
    const [students, setStudents] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [courses, setCourses] = useState([]);
    const [filteredCourses, setFilteredCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingCourses, setLoadingCourses] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const itemsPerPage = 10;

    const [formData, setFormData] = useState({
        name: '',
        username: '',
        password: '',
        phone: '',
        rollNo: '',
        department: '',
        departmentId: '',
        courseId: '',
        batch: '',
        year: 1,
        semester: 1,
        section: '',
        course: '',
        guardianName: '',
        guardianPhone: '',
        address: '',
        bloodGroup: '',
    });

    const years = [1, 2, 3, 4];
    const sections = ['A', 'B', 'C', 'D'];
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

    useEffect(() => {
        fetchStudents();
        fetchDepartments();
        fetchAllCourses();
    }, []);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getStudents();
            const data = response.data?.data || response.data || [];
            setStudents(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching students:', error);
            setStudents([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const response = await adminAPI.getDepartments({ status: 'active' });
            const data = response.data?.data || response.data || [];
            setDepartments(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching departments:', error);
            setDepartments([]);
        }
    };

    const fetchAllCourses = async () => {
        try {
            const response = await adminAPI.getCourses({ status: 'active' });
            const data = response.data?.data || response.data || [];
            setCourses(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching courses:', error);
            setCourses([]);
        }
    };

    // Fetch courses by department - for the modal form
    const fetchCoursesByDepartment = useCallback(async (departmentId) => {
        if (!departmentId) {
            setFilteredCourses([]);
            return;
        }

        try {
            setLoadingCourses(true);
            const response = await adminAPI.getCourses({ departmentId, status: 'active' });
            const data = response.data?.data || response.data || [];
            setFilteredCourses(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching courses by department:', error);
            setFilteredCourses([]);
        } finally {
            setLoadingCourses(false);
        }
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Handle department change in form - fetch courses for that department
    const handleDepartmentChange = (e) => {
        const departmentId = e.target.value;
        const dept = departments.find(d => d._id === departmentId);

        setFormData(prev => ({
            ...prev,
            departmentId,
            department: dept?.code || '',
            courseId: '', // Reset course when department changes
        }));

        if (departmentId) {
            fetchCoursesByDepartment(departmentId);
        } else {
            setFilteredCourses([]);
        }
    };

    // Handle course change - auto-set course name
    const handleCourseChange = (e) => {
        const courseId = e.target.value;
        const course = filteredCourses.find(c => c._id === courseId);

        setFormData(prev => ({
            ...prev,
            courseId,
            course: course?.name || prev.course,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const payload = {
                ...formData,
                year: parseInt(formData.year),
                semester: parseInt(formData.semester),
            };

            if (selectedStudent) {
                await adminAPI.updateStudent(selectedStudent._id, payload);
                toast.success('Student updated successfully');
            } else {
                await adminAPI.createStudent(payload);
                toast.success('Student created successfully');
            }
            fetchStudents();
            handleCloseModal();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Operation failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async (student) => {
        setSelectedStudent(student);

        // Fetch courses for this department if assigned
        const deptId = student.departmentId?._id || '';
        if (deptId) {
            await fetchCoursesByDepartment(deptId);
        }

        setFormData({
            name: student.userId?.name || '',
            username: student.userId?.username || '',
            password: '',
            phone: student.userId?.phone || '',
            rollNo: student.rollNo || '',
            department: student.userId?.department || student.departmentId?.code || '',
            departmentId: student.departmentId?._id || '',
            courseId: student.courseId?._id || '',
            batch: student.batch || '',
            year: student.year || 1,
            semester: student.semester || 1,
            section: student.section || '',
            course: student.course || student.courseId?.name || '',
            guardianName: student.guardianName || '',
            guardianPhone: student.guardianPhone || '',
            address: student.address || '',
            bloodGroup: student.bloodGroup || '',
        });
        setShowModal(true);
    };

    const handleDelete = async () => {
        setIsSubmitting(true);
        try {
            await adminAPI.deleteStudent(selectedStudent._id);
            toast.success('Student deleted successfully');
            fetchStudents();
            setShowDeleteModal(false);
            setSelectedStudent(null);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Delete failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (student) => {
        try {
            await adminAPI.toggleStudentStatus(student._id);
            toast.success(`Student ${student.userId?.status === 'active' ? 'deactivated' : 'activated'} successfully`);
            fetchStudents();
        } catch (error) {
            toast.error('Failed to toggle status');
        }
    };

    const handleResetPassword = async () => {
        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        setIsSubmitting(true);
        try {
            await adminAPI.resetPassword(selectedStudent.userId._id, newPassword);
            toast.success('Password reset successfully');
            setShowPasswordModal(false);
            setNewPassword('');
            setConfirmPassword('');
            setSelectedStudent(null);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Password reset failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedStudent(null);
        setFilteredCourses([]);
        setFormData({
            name: '', username: '', password: '', phone: '', rollNo: '', department: '',
            departmentId: '', courseId: '', batch: '',
            year: 1, semester: 1, section: '', course: '', guardianName: '', guardianPhone: '', address: '', bloodGroup: ''
        });
    };

    // Filter students
    const filteredStudents = (Array.isArray(students) ? students : []).filter(student => {
        const matchesSearch =
            student.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.rollNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.userId?.username?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = !filterDept || student.departmentId?._id === filterDept;
        const matchesYear = !filterYear || student.year === parseInt(filterYear);
        return matchesSearch && matchesDept && matchesYear;
    });

    // Pagination
    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    const paginatedStudents = filteredStudents.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Generate batch options (last 10 years to next 10 years)
    const currentYear = new Date().getFullYear();
    const batchOptions = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
        batchOptions.push(`${i}-${i + 4}`);
    }

    return (
        <div className="animate-fade-in">
            <Breadcrumb />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Manage Students</h1>
                    <p className="text-secondary-500 mt-1">
                        Total Students: <span className="font-semibold text-primary-600">{students.length}</span>
                    </p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary mt-4 md:mt-0">
                    <FiPlus size={18} />
                    Add Student
                </button>
            </div>

            {/* Filters */}
            <div className="card mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, roll no, or username..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input pl-10"
                        />
                    </div>
                    <select
                        value={filterDept}
                        onChange={(e) => setFilterDept(e.target.value)}
                        className="input w-full md:w-48"
                    >
                        <option value="">All Departments</option>
                        {departments.map(dept => (
                            <option key={dept._id} value={dept._id}>{dept.name}</option>
                        ))}
                    </select>
                    <select
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        className="input w-full md:w-36"
                    >
                        <option value="">All Years</option>
                        {years.map(year => (
                            <option key={year} value={year}>Year {year}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <SkeletonTable rows={5} />
            ) : filteredStudents.length === 0 ? (
                <EmptyState
                    title="No students found"
                    description={searchTerm ? `No results for "${searchTerm}"` : "No students have been added yet."}
                    action={() => setShowModal(true)}
                    actionLabel="Add Student"
                />
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Roll No</th>
                                <th>Name</th>
                                <th>Department</th>
                                <th>Course</th>
                                <th>Year / Sem</th>
                                <th>Section</th>
                                <th>Batch</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedStudents.map((student) => (
                                <tr key={student._id}>
                                    <td className="font-semibold text-primary-600">{student.rollNo}</td>
                                    <td>
                                        <div>
                                            <p className="font-medium text-secondary-800">{student.userId?.name}</p>
                                            <p className="text-sm text-secondary-500">@{student.userId?.username}</p>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="badge badge-secondary">
                                            {student.departmentId?.code || student.userId?.department || 'N/A'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="badge badge-primary">
                                            {student.courseId?.code || student.course || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="text-center">
                                        Y{student.year} / S{student.semester}
                                    </td>
                                    <td className="text-center">{student.section}</td>
                                    <td>
                                        {student.batch || <span className="text-secondary-400">-</span>}
                                    </td>
                                    <td>
                                        <span className={`badge ${student.userId?.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                            {student.userId?.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleEdit(student)}
                                                className="p-2 rounded-lg hover:bg-gray-100 text-secondary-600"
                                                title="Edit"
                                            >
                                                <FiEdit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => { setSelectedStudent(student); setShowPasswordModal(true); }}
                                                className="p-2 rounded-lg hover:bg-primary-50 text-primary-500"
                                                title="Reset Password"
                                            >
                                                <FiKey size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(student)}
                                                className={`p-2 rounded-lg hover:bg-gray-100 ${student.userId?.status === 'active' ? 'text-warning-500' : 'text-success-500'
                                                    }`}
                                                title={student.userId?.status === 'active' ? 'Deactivate' : 'Activate'}
                                            >
                                                {student.userId?.status === 'active' ? <FiUserX size={16} /> : <FiUserCheck size={16} />}
                                            </button>
                                            <button
                                                onClick={() => { setSelectedStudent(student); setShowDeleteModal(true); }}
                                                className="p-2 rounded-lg hover:bg-danger-50 text-danger-500"
                                                title="Delete"
                                            >
                                                <FiTrash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredStudents.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
            />

            {/* Add/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={selectedStudent ? 'Edit Student' : 'Add New Student'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="label">Full Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="input"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Username *</label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                className="input"
                                required
                            />
                        </div>
                        {!selectedStudent && (
                            <div className="form-group">
                                <label className="label">Password *</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="input"
                                    required={!selectedStudent}
                                    minLength={6}
                                />
                            </div>
                        )}
                        <div className="form-group">
                            <label className="label">Phone</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="input"
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Roll No *</label>
                            <input
                                type="text"
                                name="rollNo"
                                value={formData.rollNo}
                                onChange={handleChange}
                                className="input"
                                required
                            />
                        </div>
                    </div>

                    {/* Academic Assignment - Department → Course Chain */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                        <p className="text-sm text-secondary-600 font-medium">🎓 Academic Assignment</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Department Selection */}
                            <div className="form-group">
                                <label className="label">Department *</label>
                                <select
                                    name="departmentId"
                                    value={formData.departmentId}
                                    onChange={handleDepartmentChange}
                                    className="input"
                                    required
                                >
                                    <option value="">Select Department</option>
                                    {departments.map(dept => (
                                        <option key={dept._id} value={dept._id}>
                                            {dept.name} ({dept.code})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Course Selection (dependent on department) */}
                            <div className="form-group">
                                <label className="label">
                                    Course
                                    {loadingCourses && <FiLoader className="inline-block ml-2 animate-spin" size={14} />}
                                </label>
                                <select
                                    name="courseId"
                                    value={formData.courseId}
                                    onChange={handleCourseChange}
                                    className={`input ${!formData.departmentId ? 'opacity-50' : ''}`}
                                    disabled={!formData.departmentId || loadingCourses}
                                >
                                    <option value="">
                                        {!formData.departmentId
                                            ? 'Select Department First'
                                            : loadingCourses
                                                ? 'Loading...'
                                                : filteredCourses.length === 0
                                                    ? 'No courses available'
                                                    : 'Select Course'
                                        }
                                    </option>
                                    {filteredCourses.map(course => (
                                        <option key={course._id} value={course._id}>
                                            {course.name} ({course.code})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Batch */}
                            <div className="form-group">
                                <label className="label">Batch</label>
                                <select
                                    name="batch"
                                    value={formData.batch}
                                    onChange={handleChange}
                                    className="input"
                                >
                                    <option value="">Select Batch</option>
                                    {batchOptions.map(batch => (
                                        <option key={batch} value={batch}>{batch}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Year */}
                            <div className="form-group">
                                <label className="label">Year *</label>
                                <select
                                    name="year"
                                    value={formData.year}
                                    onChange={handleChange}
                                    className="input"
                                    required
                                >
                                    {years.map(year => (
                                        <option key={year} value={year}>Year {year}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Semester */}
                            <div className="form-group">
                                <label className="label">Semester</label>
                                <select
                                    name="semester"
                                    value={formData.semester}
                                    onChange={handleChange}
                                    className="input"
                                >
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                                        <option key={sem} value={sem}>Semester {sem}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Section */}
                            <div className="form-group">
                                <label className="label">Section *</label>
                                <select
                                    name="section"
                                    value={formData.section}
                                    onChange={handleChange}
                                    className="input"
                                    required
                                >
                                    <option value="">Section</option>
                                    {sections.map(sec => (
                                        <option key={sec} value={sec}>{sec}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Guardian & Additional Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="label">Guardian Name</label>
                            <input
                                type="text"
                                name="guardianName"
                                value={formData.guardianName}
                                onChange={handleChange}
                                className="input"
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Guardian Phone</label>
                            <input
                                type="tel"
                                name="guardianPhone"
                                value={formData.guardianPhone}
                                onChange={handleChange}
                                className="input"
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Blood Group</label>
                            <select
                                name="bloodGroup"
                                value={formData.bloodGroup}
                                onChange={handleChange}
                                className="input"
                            >
                                <option value="">Select</option>
                                {bloodGroups.map(bg => (
                                    <option key={bg} value={bg}>{bg}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="label">Address</label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                className="input"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={handleCloseModal} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : selectedStudent ? 'Update Student' : 'Add Student'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Password Reset Modal */}
            <Modal
                isOpen={showPasswordModal}
                onClose={() => { setShowPasswordModal(false); setNewPassword(''); setConfirmPassword(''); }}
                title={`Reset Password for ${selectedStudent?.userId?.name}`}
                size="sm"
            >
                <div className="space-y-4">
                    <div className="form-group">
                        <label className="label">New Password</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="input"
                            minLength={6}
                            placeholder="Minimum 6 characters"
                        />
                    </div>
                    <div className="form-group">
                        <label className="label">Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="input"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => { setShowPasswordModal(false); setNewPassword(''); setConfirmPassword(''); }}
                            className="btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleResetPassword}
                            className="btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete Student"
                message={`Are you sure you want to delete "${selectedStudent?.userId?.name}"? This will also delete all associated records (attendance, marks, fees).`}
                confirmText="Delete"
                isLoading={isSubmitting}
            />
        </div>
    );
};

export default ManageStudents;
