import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal, { ConfirmModal } from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiToggleLeft, FiToggleRight } from 'react-icons/fi';

const ManageCourses = () => {
    const [courses, setCourses] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const itemsPerPage = 10;

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        departmentId: '',
        duration: 4,
        durationType: 'year',
        description: ''
    });

    useEffect(() => {
        fetchCourses();
        fetchDepartments();
    }, []);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getCourses();
            const data = response.data?.data || response.data || [];
            setCourses(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching courses:', error);
            setCourses([]);
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
            const payload = {
                ...formData,
                duration: parseInt(formData.duration)
            };

            if (selectedCourse) {
                await adminAPI.updateCourse(selectedCourse._id, payload);
                toast.success('Course updated successfully');
            } else {
                await adminAPI.createCourse(payload);
                toast.success('Course created successfully');
            }
            fetchCourses();
            handleCloseModal();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Operation failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (course) => {
        setSelectedCourse(course);
        setFormData({
            name: course.name || '',
            code: course.code || '',
            departmentId: course.departmentId?._id || '',
            duration: course.duration || 4,
            durationType: course.durationType || 'year',
            description: course.description || ''
        });
        setShowModal(true);
    };

    const handleDelete = async () => {
        setIsSubmitting(true);
        try {
            await adminAPI.deleteCourse(selectedCourse._id);
            toast.success('Course deleted successfully');
            fetchCourses();
            setShowDeleteModal(false);
            setSelectedCourse(null);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Delete failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (course) => {
        try {
            await adminAPI.toggleCourseStatus(course._id);
            toast.success(`Course ${course.status === 'active' ? 'deactivated' : 'activated'} successfully`);
            fetchCourses();
        } catch (error) {
            toast.error('Failed to toggle status');
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedCourse(null);
        setFormData({
            name: '', code: '', departmentId: '', duration: 4, durationType: 'year', description: ''
        });
    };

    // Filter courses
    const filteredCourses = courses.filter(course => {
        const matchesSearch =
            course.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            course.code?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = !filterDepartment || course.departmentId?._id === filterDepartment;
        const matchesStatus = !filterStatus || course.status === filterStatus;
        return matchesSearch && matchesDept && matchesStatus;
    });

    // Pagination
    const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);
    const paginatedCourses = filteredCourses.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="animate-fade-in">
            <Breadcrumb />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Manage Courses</h1>
                    <p className="text-secondary-500 mt-1">
                        Total Courses: <span className="font-semibold text-primary-600">{courses.length}</span>
                    </p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary mt-4 md:mt-0">
                    <FiPlus size={18} />
                    Add Course
                </button>
            </div>

            {/* Filters */}
            <div className="card mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name or code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input pl-10"
                        />
                    </div>
                    <select
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                        className="input w-full md:w-48"
                    >
                        <option value="">All Departments</option>
                        {departments.map(dept => (
                            <option key={dept._id} value={dept._id}>{dept.name}</option>
                        ))}
                    </select>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="input w-full md:w-40"
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <SkeletonTable rows={5} />
            ) : filteredCourses.length === 0 ? (
                <EmptyState
                    title="No courses found"
                    description={searchTerm ? `No results for "${searchTerm}"` : "No courses have been added yet."}
                    action={() => setShowModal(true)}
                    actionLabel="Add Course"
                />
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Course Name</th>
                                <th>Department</th>
                                <th>Duration</th>
                                <th>Total Semesters</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedCourses.map((course) => (
                                <tr key={course._id}>
                                    <td className="font-semibold text-primary-600">{course.code}</td>
                                    <td>
                                        <div>
                                            <p className="font-medium text-secondary-800">{course.name}</p>
                                            {course.description && (
                                                <p className="text-sm text-secondary-500 truncate max-w-xs">{course.description}</p>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="badge badge-primary">
                                            {course.departmentId?.name || 'N/A'}
                                        </span>
                                    </td>
                                    <td>
                                        {course.duration} {course.durationType === 'year' ? 'Year(s)' : 'Semester(s)'}
                                    </td>
                                    <td className="text-center font-medium">{course.totalSemesters}</td>
                                    <td>
                                        <span className={`badge ${course.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                            {course.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleEdit(course)}
                                                className="p-2 rounded-lg hover:bg-gray-100 text-secondary-600"
                                                title="Edit"
                                            >
                                                <FiEdit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(course)}
                                                className={`p-2 rounded-lg hover:bg-gray-100 ${course.status === 'active' ? 'text-warning-500' : 'text-success-500'}`}
                                                title={course.status === 'active' ? 'Deactivate' : 'Activate'}
                                            >
                                                {course.status === 'active' ? <FiToggleRight size={18} /> : <FiToggleLeft size={18} />}
                                            </button>
                                            <button
                                                onClick={() => { setSelectedCourse(course); setShowDeleteModal(true); }}
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
                totalItems={filteredCourses.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
            />

            {/* Add/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={selectedCourse ? 'Edit Course' : 'Add New Course'}
                size="md"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="label">Course Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="input"
                                placeholder="e.g., Bachelor of Technology"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Course Code *</label>
                            <input
                                type="text"
                                name="code"
                                value={formData.code}
                                onChange={handleChange}
                                className="input"
                                placeholder="e.g., BTECH-CSE"
                                required
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="label">Department *</label>
                        <select
                            name="departmentId"
                            value={formData.departmentId}
                            onChange={handleChange}
                            className="input"
                            required
                        >
                            <option value="">Select Department</option>
                            {departments.map(dept => (
                                <option key={dept._id} value={dept._id}>{dept.name} ({dept.code})</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="label">Duration *</label>
                            <input
                                type="number"
                                name="duration"
                                value={formData.duration}
                                onChange={handleChange}
                                className="input"
                                min={1}
                                max={6}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Duration Type *</label>
                            <select
                                name="durationType"
                                value={formData.durationType}
                                onChange={handleChange}
                                className="input"
                                required
                            >
                                <option value="year">Years</option>
                                <option value="semester">Semesters</option>
                            </select>
                        </div>
                    </div>
                    <div className="bg-primary-50 rounded-lg p-3 text-sm text-primary-700">
                        <strong>Total Semesters:</strong>{' '}
                        {formData.durationType === 'year'
                            ? parseInt(formData.duration || 0) * 2
                            : parseInt(formData.duration || 0)
                        }
                    </div>
                    <div className="form-group">
                        <label className="label">Description</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            className="input"
                            rows={3}
                            placeholder="Brief description of the course..."
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={handleCloseModal} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : selectedCourse ? 'Update Course' : 'Add Course'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete Course"
                message={`Are you sure you want to delete "${selectedCourse?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                isLoading={isSubmitting}
            />
        </div>
    );
};

export default ManageCourses;
