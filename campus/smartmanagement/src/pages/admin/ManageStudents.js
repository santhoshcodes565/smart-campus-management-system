import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal, { ConfirmModal } from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiFilter, FiDownload, FiEye, FiUserX, FiUserCheck, FiKey } from 'react-icons/fi';

const ManageStudents = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
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
        year: 1,
        section: '',
        course: '',
        guardianName: '',
        guardianPhone: '',
        address: '',
        bloodGroup: '',
    });

    const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'];
    const years = [1, 2, 3, 4];
    const sections = ['A', 'B', 'C', 'D'];
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getStudents();
            // Extract array from response - handle both { success, data } and direct array
            const data = response.data?.data || response.data || [];
            setStudents(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching students:', error);
            // Demo data
            setStudents([
                { _id: '1', userId: { name: 'John Doe', username: 'john', status: 'active' }, rollNo: 'CS2021001', department: 'CSE', year: 3, section: 'A', course: 'B.Tech' },
                { _id: '2', userId: { name: 'Jane Smith', username: 'jane', status: 'active' }, rollNo: 'CS2021002', department: 'CSE', year: 3, section: 'A', course: 'B.Tech' },
                { _id: '3', userId: { name: 'Mike Johnson', username: 'mike', status: 'inactive' }, rollNo: 'EC2021001', department: 'ECE', year: 2, section: 'B', course: 'B.Tech' },
                { _id: '4', userId: { name: 'Sarah Williams', username: 'sarah', status: 'active' }, rollNo: 'ME2021001', department: 'MECH', year: 4, section: 'A', course: 'B.Tech' },
                { _id: '5', userId: { name: 'Chris Brown', username: 'chris', status: 'active' }, rollNo: 'EE2021001', department: 'EEE', year: 1, section: 'C', course: 'B.Tech' },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (selectedStudent) {
                await adminAPI.updateStudent(selectedStudent._id, formData);
                toast.success('Student updated successfully');
            } else {
                await adminAPI.createStudent(formData);
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

    const handleEdit = (student) => {
        setSelectedStudent(student);
        setFormData({
            name: student.userId?.name || '',
            username: student.userId?.username || '',
            password: '',
            phone: student.userId?.phone || '',
            rollNo: student.rollNo || '',
            department: student.department || student.userId?.department || '',
            year: student.year || 1,
            section: student.section || '',
            course: student.course || '',
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
        setFormData({
            name: '', username: '', password: '', phone: '', rollNo: '', department: '',
            year: 1, section: '', course: '', guardianName: '', guardianPhone: '', address: '', bloodGroup: ''
        });
    };

    // Filter students - ensure students is always an array
    const filteredStudents = (Array.isArray(students) ? students : []).filter(student => {
        const matchesSearch =
            student.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.rollNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.userId?.username?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = !filterDept || (student.department || student.userId?.department) === filterDept;
        const matchesYear = !filterYear || student.year === parseInt(filterYear);
        return matchesSearch && matchesDept && matchesYear;
    });

    // Pagination
    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    const paginatedStudents = filteredStudents.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="animate-fade-in">
            <Breadcrumb />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Manage Students</h1>
                    <p className="text-secondary-500 mt-1">Total Students Created: <span className="font-semibold text-primary-600">{students.length}</span></p>
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
                            placeholder="Search by name, email, or roll number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input pl-10"
                        />
                    </div>
                    <select
                        value={filterDept}
                        onChange={(e) => setFilterDept(e.target.value)}
                        className="input w-full md:w-40"
                    >
                        <option value="">All Departments</option>
                        {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                    <select
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        className="input w-full md:w-32"
                    >
                        <option value="">All Years</option>
                        {years.map(year => (
                            <option key={year} value={year}>Year {year}</option>
                        ))}
                    </select>
                    <button className="btn-secondary">
                        <FiDownload size={18} />
                        Export
                    </button>
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
                                <th>Student</th>
                                <th>Roll No</th>
                                <th>Department</th>
                                <th>Year / Section</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedStudents.map((student) => (
                                <tr key={student._id}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold">
                                                {student.userId?.name?.charAt(0) || 'S'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-secondary-800">{student.userId?.name}</p>
                                                <p className="text-sm text-secondary-500">{student.userId?.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="font-medium">{student.rollNo}</td>
                                    <td>{student.department || student.userId?.department}</td>
                                    <td>{student.year} / {student.section}</td>
                                    <td>
                                        <span className={`badge ${student.userId?.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                            {student.userId?.status || 'active'}
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
                        <div className="form-group">
                            <label className="label">Department *</label>
                            <select
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                                className="input"
                                required
                            >
                                <option value="">Select Department</option>
                                {departments.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>
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
                        <div className="form-group">
                            <label className="label">Section *</label>
                            <select
                                name="section"
                                value={formData.section}
                                onChange={handleChange}
                                className="input"
                                required
                            >
                                <option value="">Select Section</option>
                                {sections.map(sec => (
                                    <option key={sec} value={sec}>{sec}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="label">Course *</label>
                            <input
                                type="text"
                                name="course"
                                value={formData.course}
                                onChange={handleChange}
                                className="input"
                                placeholder="e.g., B.Tech"
                                required
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
                                <option value="">Select Blood Group</option>
                                {bloodGroups.map(bg => (
                                    <option key={bg} value={bg}>{bg}</option>
                                ))}
                            </select>
                        </div>
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
                    </div>
                    <div className="form-group">
                        <label className="label">Address</label>
                        <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className="input"
                            rows={2}
                        />
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

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete Student"
                message={`Are you sure you want to delete ${selectedStudent?.userId?.name}? This action cannot be undone.`}
                confirmText="Delete"
                isLoading={isSubmitting}
            />

            {/* Reset Password Modal */}
            <Modal
                isOpen={showPasswordModal}
                onClose={() => { setShowPasswordModal(false); setNewPassword(''); setConfirmPassword(''); }}
                title={`Reset Password for ${selectedStudent?.userId?.name}`}
                size="sm"
            >
                <div className="space-y-4">
                    <div className="form-group">
                        <label className="label">New Password *</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="input"
                            placeholder="Enter new password"
                            minLength={6}
                        />
                    </div>
                    <div className="form-group">
                        <label className="label">Confirm Password *</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="input"
                            placeholder="Confirm new password"
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
                            disabled={isSubmitting || !newPassword || !confirmPassword}
                        >
                            {isSubmitting ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ManageStudents;
