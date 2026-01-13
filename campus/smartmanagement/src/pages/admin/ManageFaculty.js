import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal, { ConfirmModal } from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiKey, FiLoader } from 'react-icons/fi';

const ManageFaculty = () => {
    const [faculty, setFaculty] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [filteredSubjects, setFilteredSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingSubjects, setLoadingSubjects] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedFaculty, setSelectedFaculty] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const itemsPerPage = 10;

    const [formData, setFormData] = useState({
        name: '',
        username: '',
        password: '',
        phone: '',
        employeeId: '',
        department: '',
        departmentId: '',
        designation: '',
        subjectIds: [],
        classIds: [],
        subjects: [], // Legacy field
        qualification: '',
        experience: '',
    });

    const designations = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Lab Assistant'];

    useEffect(() => {
        fetchFaculty();
        fetchDepartments();
        fetchAllSubjects();
    }, []);

    const fetchFaculty = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getFaculty();
            const data = response.data?.data || response.data || [];
            setFaculty(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching faculty:', error);
            setFaculty([]);
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

    const fetchAllSubjects = async () => {
        try {
            const response = await adminAPI.getSubjects({ status: 'active' });
            const data = response.data?.data || response.data || [];
            setSubjects(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching subjects:', error);
            setSubjects([]);
        }
    };

    // Fetch subjects by department for the form
    const fetchSubjectsByDepartment = useCallback(async (departmentId) => {
        if (!departmentId) {
            setFilteredSubjects([]);
            return;
        }

        try {
            setLoadingSubjects(true);
            // Get courses for this department first, then get subjects for those courses
            const coursesRes = await adminAPI.getCourses({ departmentId, status: 'active' });
            const courses = coursesRes.data?.data || coursesRes.data || [];

            // Gather all subjects from all courses
            let allSubjects = [];
            for (const course of courses) {
                const subjectsRes = await adminAPI.getSubjects({ courseId: course._id, status: 'active' });
                const subjs = subjectsRes.data?.data || subjectsRes.data || [];
                allSubjects = [...allSubjects, ...subjs];
            }

            // Remove duplicates by _id
            const uniqueSubjects = allSubjects.filter((subj, idx, self) =>
                idx === self.findIndex(s => s._id === subj._id)
            );
            setFilteredSubjects(uniqueSubjects);
        } catch (error) {
            console.error('Error fetching subjects:', error);
            setFilteredSubjects([]);
        } finally {
            setLoadingSubjects(false);
        }
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Handle department change - fetch subjects for that department
    const handleDepartmentChange = (e) => {
        const departmentId = e.target.value;
        const dept = departments.find(d => d._id === departmentId);

        setFormData(prev => ({
            ...prev,
            departmentId,
            department: dept?.code || '',
            subjectIds: [], // Reset subjects when department changes
        }));

        if (departmentId) {
            fetchSubjectsByDepartment(departmentId);
        } else {
            setFilteredSubjects([]);
        }
    };

    // Handle multi-select for subjects
    const handleSubjectIdsChange = (e) => {
        const selected = Array.from(e.target.selectedOptions, option => option.value);
        setFormData(prev => ({ ...prev, subjectIds: selected }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const payload = {
                ...formData,
                experience: parseInt(formData.experience) || 0,
            };

            if (selectedFaculty) {
                await adminAPI.updateFaculty(selectedFaculty._id, payload);
                toast.success('Faculty updated successfully');
            } else {
                await adminAPI.createFaculty(payload);
                toast.success('Faculty created successfully');
            }
            fetchFaculty();
            handleCloseModal();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Operation failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async (member) => {
        setSelectedFaculty(member);

        // Fetch subjects for this department if assigned
        const deptId = member.departmentId?._id || '';
        if (deptId) {
            await fetchSubjectsByDepartment(deptId);
        }

        setFormData({
            name: member.userId?.name || '',
            username: member.userId?.username || '',
            password: '',
            phone: member.userId?.phone || '',
            employeeId: member.employeeId || '',
            department: member.userId?.department || member.departmentId?.code || '',
            departmentId: member.departmentId?._id || '',
            designation: member.designation || '',
            subjectIds: member.subjectIds?.map(s => s._id || s) || [],
            classIds: member.classIds || [],
            subjects: member.subjects || [],
            qualification: member.qualification || '',
            experience: member.experience || '',
        });
        setShowModal(true);
    };

    const handleDelete = async () => {
        setIsSubmitting(true);
        try {
            await adminAPI.deleteFaculty(selectedFaculty._id);
            toast.success('Faculty deleted successfully');
            fetchFaculty();
            setShowDeleteModal(false);
            setSelectedFaculty(null);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Delete failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedFaculty(null);
        setFilteredSubjects([]);
        setFormData({
            name: '', username: '', password: '', phone: '', employeeId: '', department: '',
            departmentId: '', designation: '', subjectIds: [], classIds: [], subjects: [],
            qualification: '', experience: ''
        });
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
            await adminAPI.resetPassword(selectedFaculty.userId._id, newPassword);
            toast.success('Password reset successfully');
            setShowPasswordModal(false);
            setNewPassword('');
            setConfirmPassword('');
            setSelectedFaculty(null);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Password reset failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter faculty
    const filteredFaculty = (Array.isArray(faculty) ? faculty : []).filter(member => {
        const matchesSearch =
            member.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.userId?.username?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = !filterDept || member.departmentId?._id === filterDept;
        return matchesSearch && matchesDept;
    });

    const totalPages = Math.ceil(filteredFaculty.length / itemsPerPage);
    const paginatedFaculty = filteredFaculty.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="animate-fade-in">
            <Breadcrumb />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Manage Faculty</h1>
                    <p className="text-secondary-500 mt-1">Total Faculty: <span className="font-semibold text-primary-600">{faculty.length}</span></p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary mt-4 md:mt-0">
                    <FiPlus size={18} />
                    Add Faculty
                </button>
            </div>

            {/* Filters */}
            <div className="card mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name or employee ID..."
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
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <SkeletonTable rows={5} />
            ) : filteredFaculty.length === 0 ? (
                <EmptyState
                    title="No faculty found"
                    description={searchTerm ? `No results for "${searchTerm}"` : "No faculty members have been added yet."}
                    action={() => setShowModal(true)}
                    actionLabel="Add Faculty"
                />
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Faculty</th>
                                <th>Employee ID</th>
                                <th>Department</th>
                                <th>Designation</th>
                                <th>Subjects</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedFaculty.map((member) => (
                                <tr key={member._id}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-success-50 flex items-center justify-center text-success-600 font-semibold">
                                                {member.userId?.name?.charAt(0) || 'F'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-secondary-800">{member.userId?.name}</p>
                                                <p className="text-sm text-secondary-500">@{member.userId?.username}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="font-semibold text-primary-600">{member.employeeId}</td>
                                    <td>
                                        <span className="badge badge-secondary">
                                            {member.departmentId?.code || member.userId?.department || 'N/A'}
                                        </span>
                                    </td>
                                    <td>{member.designation}</td>
                                    <td>
                                        <div className="flex flex-wrap gap-1">
                                            {member.subjectIds?.slice(0, 2).map((subj, i) => (
                                                <span key={i} className="badge badge-primary text-xs">
                                                    {typeof subj === 'object' ? subj.code : subj}
                                                </span>
                                            ))}
                                            {member.subjectIds?.length > 2 && (
                                                <span className="badge text-xs bg-gray-100">+{member.subjectIds.length - 2}</span>
                                            )}
                                            {(!member.subjectIds || member.subjectIds.length === 0) && (
                                                <span className="text-secondary-400 text-sm">-</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge ${member.userId?.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                            {member.userId?.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleEdit(member)}
                                                className="p-2 rounded-lg hover:bg-gray-100 text-secondary-600"
                                                title="Edit"
                                            >
                                                <FiEdit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => { setSelectedFaculty(member); setShowPasswordModal(true); }}
                                                className="p-2 rounded-lg hover:bg-primary-50 text-primary-500"
                                                title="Reset Password"
                                            >
                                                <FiKey size={16} />
                                            </button>
                                            <button
                                                onClick={() => { setSelectedFaculty(member); setShowDeleteModal(true); }}
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
                totalItems={filteredFaculty.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
            />

            {/* Add/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={selectedFaculty ? 'Edit Faculty' : 'Add New Faculty'}
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
                        {!selectedFaculty && (
                            <div className="form-group">
                                <label className="label">Password *</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="input"
                                    required={!selectedFaculty}
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
                            <label className="label">Employee ID *</label>
                            <input
                                type="text"
                                name="employeeId"
                                value={formData.employeeId}
                                onChange={handleChange}
                                className="input"
                                required
                            />
                        </div>
                    </div>

                    {/* Academic Assignment */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                        <p className="text-sm text-secondary-600 font-medium">🎓 Academic Assignment</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Department */}
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

                            {/* Designation */}
                            <div className="form-group">
                                <label className="label">Designation *</label>
                                <select
                                    name="designation"
                                    value={formData.designation}
                                    onChange={handleChange}
                                    className="input"
                                    required
                                >
                                    <option value="">Select Designation</option>
                                    {designations.map(des => (
                                        <option key={des} value={des}>{des}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Subject Assignment */}
                        <div className="form-group">
                            <label className="label">
                                Assigned Subjects
                                {loadingSubjects && <FiLoader className="inline-block ml-2 animate-spin" size={14} />}
                            </label>
                            <select
                                multiple
                                name="subjectIds"
                                value={formData.subjectIds}
                                onChange={handleSubjectIdsChange}
                                className={`input h-32 ${!formData.departmentId ? 'opacity-50' : ''}`}
                                disabled={!formData.departmentId || loadingSubjects}
                            >
                                {filteredSubjects.length === 0 && formData.departmentId && !loadingSubjects ? (
                                    <option disabled>No subjects found for this department</option>
                                ) : (
                                    filteredSubjects.map(subj => (
                                        <option key={subj._id} value={subj._id}>
                                            {subj.name} ({subj.code})
                                        </option>
                                    ))
                                )}
                            </select>
                            <p className="text-xs text-secondary-500 mt-1">
                                {!formData.departmentId
                                    ? 'Select department first to see available subjects'
                                    : 'Hold Ctrl/Cmd to select multiple subjects'
                                }
                            </p>
                        </div>
                    </div>

                    {/* Additional Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="label">Qualification</label>
                            <input
                                type="text"
                                name="qualification"
                                value={formData.qualification}
                                onChange={handleChange}
                                className="input"
                                placeholder="e.g., Ph.D, M.Tech"
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Experience (years)</label>
                            <input
                                type="number"
                                name="experience"
                                value={formData.experience}
                                onChange={handleChange}
                                className="input"
                                min="0"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={handleCloseModal} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : selectedFaculty ? 'Update Faculty' : 'Add Faculty'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete Faculty"
                message={`Are you sure you want to delete ${selectedFaculty?.userId?.name}? This action cannot be undone.`}
                confirmText="Delete"
                isLoading={isSubmitting}
            />

            {/* Reset Password Modal */}
            <Modal
                isOpen={showPasswordModal}
                onClose={() => { setShowPasswordModal(false); setNewPassword(''); setConfirmPassword(''); }}
                title={`Reset Password for ${selectedFaculty?.userId?.name}`}
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

export default ManageFaculty;
