import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal, { ConfirmModal } from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiToggleLeft, FiToggleRight, FiAlertTriangle } from 'react-icons/fi';

const ManageDepartments = () => {
    const [departments, setDepartments] = useState([]);
    const [faculty, setFaculty] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDependencyModal, setShowDependencyModal] = useState(false);
    const [dependencies, setDependencies] = useState(null);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const itemsPerPage = 10;

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        headOfDepartment: ''
    });

    useEffect(() => {
        fetchDepartments();
        fetchFaculty();
    }, []);

    const fetchDepartments = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getDepartments();
            const data = response.data?.data || response.data || [];
            setDepartments(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching departments:', error);
            setDepartments([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchFaculty = async () => {
        try {
            const response = await adminAPI.getFaculty();
            const data = response.data?.data || response.data || [];
            setFaculty(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching faculty:', error);
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
                headOfDepartment: formData.headOfDepartment || null
            };

            if (selectedDepartment) {
                await adminAPI.updateDepartment(selectedDepartment._id, payload);
                toast.success('Department updated successfully');
            } else {
                await adminAPI.createDepartment(payload);
                toast.success('Department created successfully');
            }
            fetchDepartments();
            handleCloseModal();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Operation failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (department) => {
        setSelectedDepartment(department);
        setFormData({
            name: department.name || '',
            code: department.code || '',
            description: department.description || '',
            headOfDepartment: department.headOfDepartment?._id || ''
        });
        setShowModal(true);
    };

    const handleDelete = async () => {
        setIsSubmitting(true);
        try {
            await adminAPI.deleteDepartment(selectedDepartment._id);
            toast.success('Department deleted successfully');
            fetchDepartments();
            setShowDeleteModal(false);
            setSelectedDepartment(null);
        } catch (error) {
            // Check for 409 Conflict (dependency error)
            if (error.response?.status === 409) {
                setDependencies(error.response.data.dependencies);
                setShowDeleteModal(false);
                setShowDependencyModal(true);
            } else {
                toast.error(error.response?.data?.error || 'Delete failed');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeactivate = async () => {
        setIsSubmitting(true);
        try {
            await adminAPI.deactivateDepartment(selectedDepartment._id);
            toast.success('Department deactivated successfully. All linked data remains intact.');
            fetchDepartments();
            setShowDependencyModal(false);
            setSelectedDepartment(null);
            setDependencies(null);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Deactivation failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (department) => {
        try {
            await adminAPI.toggleDepartmentStatus(department._id);
            toast.success(`Department ${department.status === 'active' ? 'deactivated' : 'activated'} successfully`);
            fetchDepartments();
        } catch (error) {
            toast.error('Failed to toggle status');
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedDepartment(null);
        setFormData({ name: '', code: '', description: '', headOfDepartment: '' });
    };

    // Filter departments
    const filteredDepartments = departments.filter(dept => {
        const matchesSearch =
            dept.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            dept.code?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = !filterStatus || dept.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    // Pagination
    const totalPages = Math.ceil(filteredDepartments.length / itemsPerPage);
    const paginatedDepartments = filteredDepartments.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="animate-fade-in">
            <Breadcrumb />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Manage Departments</h1>
                    <p className="text-secondary-500 mt-1">
                        Total Departments: <span className="font-semibold text-primary-600">{departments.length}</span>
                    </p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary mt-4 md:mt-0">
                    <FiPlus size={18} />
                    Add Department
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
            ) : filteredDepartments.length === 0 ? (
                <EmptyState
                    title="No departments found"
                    description={searchTerm ? `No results for "${searchTerm}"` : "No departments have been added yet."}
                    action={() => setShowModal(true)}
                    actionLabel="Add Department"
                />
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Department Name</th>
                                <th>Head of Department</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedDepartments.map((dept) => (
                                <tr key={dept._id}>
                                    <td className="font-semibold text-primary-600">{dept.code}</td>
                                    <td>
                                        <div>
                                            <p className="font-medium text-secondary-800">{dept.name}</p>
                                            {dept.description && (
                                                <p className="text-sm text-secondary-500 truncate max-w-xs">{dept.description}</p>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        {dept.headOfDepartment?.userId?.name || (
                                            <span className="text-secondary-400 italic">Not Assigned</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`badge ${dept.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                            {dept.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleEdit(dept)}
                                                className="p-2 rounded-lg hover:bg-gray-100 text-secondary-600"
                                                title="Edit"
                                            >
                                                <FiEdit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(dept)}
                                                className={`p-2 rounded-lg hover:bg-gray-100 ${dept.status === 'active' ? 'text-warning-500' : 'text-success-500'}`}
                                                title={dept.status === 'active' ? 'Deactivate' : 'Activate'}
                                            >
                                                {dept.status === 'active' ? <FiToggleRight size={18} /> : <FiToggleLeft size={18} />}
                                            </button>
                                            <button
                                                onClick={() => { setSelectedDepartment(dept); setShowDeleteModal(true); }}
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
                totalItems={filteredDepartments.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
            />

            {/* Add/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={selectedDepartment ? 'Edit Department' : 'Add New Department'}
                size="md"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="label">Department Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="input"
                                placeholder="e.g., Computer Science"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Department Code *</label>
                            <input
                                type="text"
                                name="code"
                                value={formData.code}
                                onChange={handleChange}
                                className="input"
                                placeholder="e.g., CSE"
                                required
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="label">Head of Department</label>
                        <select
                            name="headOfDepartment"
                            value={formData.headOfDepartment}
                            onChange={handleChange}
                            className="input"
                        >
                            <option value="">Select HOD (Optional)</option>
                            {faculty.map(f => (
                                <option key={f._id} value={f._id}>
                                    {f.userId?.name} ({f.designation})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="label">Description</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            className="input"
                            rows={3}
                            placeholder="Brief description of the department..."
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={handleCloseModal} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : selectedDepartment ? 'Update Department' : 'Add Department'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete Department"
                message={`Are you sure you want to delete "${selectedDepartment?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                isLoading={isSubmitting}
            />

            {/* Dependency Warning Modal */}
            <Modal
                isOpen={showDependencyModal}
                onClose={() => { setShowDependencyModal(false); setDependencies(null); setSelectedDepartment(null); }}
                title="Cannot Delete Department"
                size="md"
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
                        <FiAlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
                        <div>
                            <p className="font-medium text-amber-800">This department has linked data</p>
                            <p className="text-sm text-amber-700 mt-1">
                                Deleting this department would orphan the linked data. Consider deactivating instead.
                            </p>
                        </div>
                    </div>

                    {dependencies && (
                        <div className="grid grid-cols-2 gap-3">
                            {dependencies.courses > 0 && (
                                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                                    <p className="text-2xl font-bold text-blue-600">{dependencies.courses}</p>
                                    <p className="text-sm text-blue-700">Course(s)</p>
                                </div>
                            )}
                            {dependencies.subjects > 0 && (
                                <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                                    <p className="text-2xl font-bold text-purple-600">{dependencies.subjects}</p>
                                    <p className="text-sm text-purple-700">Subject(s)</p>
                                </div>
                            )}
                            {dependencies.students > 0 && (
                                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                                    <p className="text-2xl font-bold text-green-600">{dependencies.students}</p>
                                    <p className="text-sm text-green-700">Student(s)</p>
                                </div>
                            )}
                            {dependencies.faculty > 0 && (
                                <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                                    <p className="text-2xl font-bold text-orange-600">{dependencies.faculty}</p>
                                    <p className="text-sm text-orange-700">Faculty</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                        <p className="text-sm text-secondary-600">
                            <strong>Recommended:</strong> Deactivate the department to hide it from active lists while preserving all linked data.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={() => { setShowDependencyModal(false); setDependencies(null); setSelectedDepartment(null); }}
                            className="btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDeactivate}
                            className="btn-warning"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Deactivating...' : 'Deactivate Department'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ManageDepartments;
