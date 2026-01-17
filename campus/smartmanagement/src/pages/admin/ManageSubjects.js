import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal, { ConfirmModal } from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiToggleLeft, FiToggleRight, FiUser, FiLoader } from 'react-icons/fi';
import { getErrorMessage } from '../../utils/errorNormalizer';

const ManageSubjects = () => {
    const [subjects, setSubjects] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [courses, setCourses] = useState([]);
    const [filteredCourses, setFilteredCourses] = useState([]);
    const [faculty, setFaculty] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingCourses, setLoadingCourses] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCourse, setFilterCourse] = useState('');
    const [filterSemester, setFilterSemester] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedFacultyId, setSelectedFacultyId] = useState('');

    const itemsPerPage = 10;

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        departmentId: '', // Added department field
        courseId: '',
        semester: 1,
        credits: 3,
        type: 'theory',
        facultyId: '',
        description: ''
    });

    const subjectTypes = [
        { value: 'theory', label: 'Theory' },
        { value: 'practical', label: 'Practical' },
        { value: 'elective', label: 'Elective' }
    ];

    useEffect(() => {
        fetchSubjects();
        fetchDepartments();
        fetchAllCourses();
        fetchFaculty();
    }, []);

    const fetchSubjects = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getSubjects();
            const data = response.data?.data || response.data || [];
            setSubjects(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching subjects:', error);
            setSubjects([]);
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

    // Fetch courses filtered by department - for the modal form
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

    // Handle department change - fetch courses for that department
    const handleDepartmentChange = (e) => {
        const departmentId = e.target.value;
        setFormData(prev => ({
            ...prev,
            departmentId,
            courseId: '', // Reset course when department changes
            semester: 1  // Reset semester
        }));

        if (departmentId) {
            fetchCoursesByDepartment(departmentId);
        } else {
            setFilteredCourses([]);
        }
    };

    // Handle course change - update max semesters
    const handleCourseChange = (e) => {
        const courseId = e.target.value;
        setFormData(prev => ({
            ...prev,
            courseId,
            semester: 1 // Reset semester when course changes
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.departmentId) {
            toast.error('Please select a department');
            return;
        }
        if (!formData.courseId) {
            toast.error('Please select a course');
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                name: formData.name,
                code: formData.code,
                courseId: formData.courseId,
                semester: parseInt(formData.semester),
                credits: parseInt(formData.credits),
                type: formData.type,
                facultyId: formData.facultyId || null,
                description: formData.description
            };

            if (selectedSubject) {
                await adminAPI.updateSubject(selectedSubject._id, payload);
                toast.success('Subject updated successfully');
            } else {
                await adminAPI.createSubject(payload);
                toast.success('Subject created successfully');
            }
            fetchSubjects();
            handleCloseModal();
        } catch (error) {
            toast.error(getErrorMessage(error, 'Operation failed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async (subject) => {
        setSelectedSubject(subject);

        // Get department from course
        const course = courses.find(c => c._id === subject.courseId?._id);
        const departmentId = course?.departmentId?._id || subject.courseId?.departmentId?._id || '';

        // Fetch courses for this department before populating form
        if (departmentId) {
            await fetchCoursesByDepartment(departmentId);
        }

        setFormData({
            name: subject.name || '',
            code: subject.code || '',
            departmentId: departmentId,
            courseId: subject.courseId?._id || '',
            semester: subject.semester || 1,
            credits: subject.credits || 3,
            type: subject.type || 'theory',
            facultyId: subject.facultyId?._id || '',
            description: subject.description || ''
        });
        setShowModal(true);
    };

    const handleDelete = async () => {
        setIsSubmitting(true);
        try {
            await adminAPI.deleteSubject(selectedSubject._id);
            toast.success('Subject deleted successfully');
            fetchSubjects();
            setShowDeleteModal(false);
            setSelectedSubject(null);
        } catch (error) {
            toast.error(getErrorMessage(error, 'Delete failed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (subject) => {
        try {
            await adminAPI.toggleSubjectStatus(subject._id);
            toast.success(`Subject ${subject.status === 'active' ? 'deactivated' : 'activated'} successfully`);
            fetchSubjects();
        } catch (error) {
            toast.error('Failed to toggle status');
        }
    };

    const handleAssignFaculty = async () => {
        setIsSubmitting(true);
        try {
            await adminAPI.assignFacultyToSubject(selectedSubject._id, selectedFacultyId || null);
            toast.success(selectedFacultyId ? 'Faculty assigned successfully' : 'Faculty removed successfully');
            fetchSubjects();
            setShowAssignModal(false);
            setSelectedSubject(null);
            setSelectedFacultyId('');
        } catch (error) {
            toast.error(getErrorMessage(error, 'Assignment failed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedSubject(null);
        setFilteredCourses([]);
        setFormData({
            name: '', code: '', departmentId: '', courseId: '', semester: 1, credits: 3, type: 'theory', facultyId: '', description: ''
        });
    };

    // Get max semesters for selected course
    const getMaxSemesters = () => {
        const course = filteredCourses.find(c => c._id === formData.courseId) ||
            courses.find(c => c._id === formData.courseId);
        return course?.totalSemesters || 8;
    };

    // Filter subjects
    const filteredSubjects = subjects.filter(subject => {
        const matchesSearch =
            subject.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            subject.code?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCourse = !filterCourse || subject.courseId?._id === filterCourse;
        const matchesSemester = !filterSemester || subject.semester === parseInt(filterSemester);
        const matchesStatus = !filterStatus || subject.status === filterStatus;
        const matchesDept = !filterDepartment || subject.courseId?.departmentId?._id === filterDepartment;
        return matchesSearch && matchesCourse && matchesSemester && matchesStatus && matchesDept;
    });

    // Pagination
    const totalPages = Math.ceil(filteredSubjects.length / itemsPerPage);
    const paginatedSubjects = filteredSubjects.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="animate-fade-in">
            <Breadcrumb />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Manage Subjects</h1>
                    <p className="text-secondary-500 mt-1">
                        Total Subjects: <span className="font-semibold text-primary-600">{subjects.length}</span>
                    </p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary mt-4 md:mt-0">
                    <FiPlus size={18} />
                    Add Subject
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
                        value={filterCourse}
                        onChange={(e) => setFilterCourse(e.target.value)}
                        className="input w-full md:w-40"
                    >
                        <option value="">All Courses</option>
                        {courses.map(course => (
                            <option key={course._id} value={course._id}>{course.code}</option>
                        ))}
                    </select>
                    <select
                        value={filterSemester}
                        onChange={(e) => setFilterSemester(e.target.value)}
                        className="input w-full md:w-36"
                    >
                        <option value="">All Semesters</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                            <option key={sem} value={sem}>Semester {sem}</option>
                        ))}
                    </select>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="input w-full md:w-32"
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
            ) : filteredSubjects.length === 0 ? (
                <EmptyState
                    title="No subjects found"
                    description={searchTerm ? `No results for "${searchTerm}"` : "No subjects have been added yet."}
                    action={() => setShowModal(true)}
                    actionLabel="Add Subject"
                />
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Subject Name</th>
                                <th>Department</th>
                                <th>Course</th>
                                <th>Semester</th>
                                <th>Type</th>
                                <th>Credits</th>
                                <th>Faculty</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedSubjects.map((subject) => (
                                <tr key={subject._id}>
                                    <td className="font-semibold text-primary-600">{subject.code}</td>
                                    <td>
                                        <div>
                                            <p className="font-medium text-secondary-800">{subject.name}</p>
                                            {subject.description && (
                                                <p className="text-sm text-secondary-500 truncate max-w-xs">{subject.description}</p>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="badge badge-secondary">
                                            {subject.courseId?.departmentId?.code || 'N/A'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="badge badge-primary">
                                            {subject.courseId?.code || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="text-center">Sem {subject.semester}</td>
                                    <td>
                                        <span className={`badge ${subject.type === 'theory' ? 'badge-info' :
                                            subject.type === 'practical' ? 'badge-warning' : 'badge-secondary'
                                            }`}>
                                            {subject.type}
                                        </span>
                                    </td>
                                    <td className="text-center">{subject.credits}</td>
                                    <td>
                                        {subject.facultyId?.userId?.name || (
                                            <span className="text-secondary-400 italic">Not Assigned</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`badge ${subject.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                            {subject.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleEdit(subject)}
                                                className="p-2 rounded-lg hover:bg-gray-100 text-secondary-600"
                                                title="Edit"
                                            >
                                                <FiEdit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedSubject(subject);
                                                    setSelectedFacultyId(subject.facultyId?._id || '');
                                                    setShowAssignModal(true);
                                                }}
                                                className="p-2 rounded-lg hover:bg-primary-50 text-primary-500"
                                                title="Assign Faculty"
                                            >
                                                <FiUser size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(subject)}
                                                className={`p-2 rounded-lg hover:bg-gray-100 ${subject.status === 'active' ? 'text-warning-500' : 'text-success-500'}`}
                                                title={subject.status === 'active' ? 'Deactivate' : 'Activate'}
                                            >
                                                {subject.status === 'active' ? <FiToggleRight size={18} /> : <FiToggleLeft size={18} />}
                                            </button>
                                            <button
                                                onClick={() => { setSelectedSubject(subject); setShowDeleteModal(true); }}
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
                totalItems={filteredSubjects.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
            />

            {/* Add/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={selectedSubject ? 'Edit Subject' : 'Add New Subject'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="label">Subject Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="input"
                                placeholder="e.g., Data Structures"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Subject Code *</label>
                            <input
                                type="text"
                                name="code"
                                value={formData.code}
                                onChange={handleChange}
                                className="input"
                                placeholder="e.g., CS301"
                                required
                            />
                        </div>
                    </div>

                    {/* Department → Course Dependency Chain */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                        <p className="text-sm text-secondary-600 font-medium">📍 Step 1: Select Department → Step 2: Select Course</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Step 1: Department Selection */}
                            <div className="form-group">
                                <label className="label">Department *</label>
                                <select
                                    name="departmentId"
                                    value={formData.departmentId}
                                    onChange={handleDepartmentChange}
                                    className="input"
                                    required
                                >
                                    <option value="">Select Department First</option>
                                    {departments.map(dept => (
                                        <option key={dept._id} value={dept._id}>
                                            {dept.name} ({dept.code})
                                        </option>
                                    ))}
                                </select>
                                {departments.length === 0 && (
                                    <p className="text-sm text-warning-600 mt-1">No departments found. Please add departments first.</p>
                                )}
                            </div>

                            {/* Step 2: Course Selection (dependent on department) */}
                            <div className="form-group">
                                <label className="label">
                                    Course *
                                    {loadingCourses && <FiLoader className="inline-block ml-2 animate-spin" size={14} />}
                                </label>
                                <select
                                    name="courseId"
                                    value={formData.courseId}
                                    onChange={handleCourseChange}
                                    className={`input ${!formData.departmentId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={!formData.departmentId || loadingCourses}
                                    required
                                >
                                    <option value="">
                                        {!formData.departmentId
                                            ? 'Select Department First'
                                            : loadingCourses
                                                ? 'Loading courses...'
                                                : filteredCourses.length === 0
                                                    ? 'No courses in this department'
                                                    : 'Select Course'
                                        }
                                    </option>
                                    {filteredCourses.map(course => (
                                        <option key={course._id} value={course._id}>
                                            {course.name} ({course.code})
                                        </option>
                                    ))}
                                </select>
                                {formData.departmentId && !loadingCourses && filteredCourses.length === 0 && (
                                    <p className="text-sm text-warning-600 mt-1">No courses found. Add courses to this department first.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Semester (dependent on course selection) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="label">Semester *</label>
                            <select
                                name="semester"
                                value={formData.semester}
                                onChange={handleChange}
                                className={`input ${!formData.courseId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={!formData.courseId}
                                required
                            >
                                {[...Array(getMaxSemesters())].map((_, i) => (
                                    <option key={i + 1} value={i + 1}>Semester {i + 1}</option>
                                ))}
                            </select>
                            {formData.courseId && (
                                <p className="text-xs text-secondary-500 mt-1">
                                    Max {getMaxSemesters()} semesters for this course
                                </p>
                            )}
                        </div>
                        <div className="form-group">
                            <label className="label">Subject Type *</label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className="input"
                                required
                            >
                                {subjectTypes.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="label">Credits *</label>
                            <input
                                type="number"
                                name="credits"
                                value={formData.credits}
                                onChange={handleChange}
                                className="input"
                                min={1}
                                max={6}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Assign Faculty</label>
                            <select
                                name="facultyId"
                                value={formData.facultyId}
                                onChange={handleChange}
                                className="input"
                            >
                                <option value="">Not Assigned</option>
                                {faculty.map(f => (
                                    <option key={f._id} value={f._id}>
                                        {f.userId?.name} ({f.designation})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="label">Description</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            className="input"
                            rows={2}
                            placeholder="Brief description of the subject..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={handleCloseModal} className="btn-secondary">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={isSubmitting || !formData.departmentId || !formData.courseId}
                        >
                            {isSubmitting ? 'Saving...' : selectedSubject ? 'Update Subject' : 'Add Subject'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Assign Faculty Modal */}
            <Modal
                isOpen={showAssignModal}
                onClose={() => { setShowAssignModal(false); setSelectedFacultyId(''); }}
                title={`Assign Faculty to ${selectedSubject?.name}`}
                size="sm"
            >
                <div className="space-y-4">
                    <div className="form-group">
                        <label className="label">Select Faculty</label>
                        <select
                            value={selectedFacultyId}
                            onChange={(e) => setSelectedFacultyId(e.target.value)}
                            className="input"
                        >
                            <option value="">Remove Faculty Assignment</option>
                            {faculty.map(f => (
                                <option key={f._id} value={f._id}>
                                    {f.userId?.name} ({f.designation})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => { setShowAssignModal(false); setSelectedFacultyId(''); }}
                            className="btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAssignFaculty}
                            className="btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Assigning...' : 'Assign Faculty'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete Subject"
                message={`Are you sure you want to delete "${selectedSubject?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                isLoading={isSubmitting}
            />
        </div>
    );
};

export default ManageSubjects;
