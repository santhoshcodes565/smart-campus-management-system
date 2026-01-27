import React, { useState, useEffect, useCallback } from 'react';
import { feeAPI, adminAPI } from '../../../services/api';
import { toast } from 'react-toastify';
import {
    FiPlus, FiEdit2, FiCheck, FiPlay, FiArchive,
    FiCopy, FiLock, FiEye, FiFilter, FiSearch, FiX
} from 'react-icons/fi';
import './AdminFeeStructures.css';

const AdminFeeStructures = () => {
    const [loading, setLoading] = useState(true);
    const [structures, setStructures] = useState([]);
    const [filters, setFilters] = useState({
        academicYear: '',
        status: '',
        search: ''
    });
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedStructure, setSelectedStructure] = useState(null);
    const [feeHeadsMaster, setFeeHeadsMaster] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [courses, setCourses] = useState([]);

    const [formData, setFormData] = useState({
        code: '',
        name: '',
        description: '',
        academicYear: '',
        semester: '',
        departmentId: '',
        courseId: '',
        feeHeads: [],
        effectiveFrom: '',
        effectiveTo: ''
    });

    const fetchStructures = useCallback(async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: 15,
                ...filters
            };
            const response = await feeAPI.structures.getAll(params);
            setStructures(response.data.data || []);
            setPagination(response.data.pagination || { page: 1, pages: 1, total: 0 });
        } catch (error) {
            toast.error(error.message || 'Failed to load fee structures');
        } finally {
            setLoading(false);
        }
    }, [filters, pagination.page]);

    const fetchMasterData = useCallback(async () => {
        try {
            const [headsRes, deptRes, courseRes] = await Promise.all([
                feeAPI.structures.getFeeHeads(),
                adminAPI.getDepartments(),
                adminAPI.getCourses()
            ]);
            setFeeHeadsMaster(headsRes.data.data || []);
            setDepartments(deptRes.data.data || deptRes.data || []);
            setCourses(courseRes.data.data || courseRes.data || []);
        } catch (error) {
            console.error('Failed to load master data:', error);
        }
    }, []);

    useEffect(() => {
        fetchStructures();
    }, [fetchStructures]);

    useEffect(() => {
        fetchMasterData();
    }, [fetchMasterData]);

    const openCreateModal = () => {
        setModalMode('create');
        setSelectedStructure(null);
        setFormData({
            code: '',
            name: '',
            description: '',
            academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
            semester: '',
            departmentId: '',
            courseId: '',
            feeHeads: feeHeadsMaster.map(h => ({
                headCode: h.code,
                headName: h.name,
                amount: 0,
                isOptional: h.isOptional || false,
                description: h.description || ''
            })),
            effectiveFrom: '',
            effectiveTo: ''
        });
        setShowModal(true);
    };

    const openViewModal = async (structure) => {
        try {
            const response = await feeAPI.structures.get(structure._id);
            setSelectedStructure(response.data.data);
            setModalMode('view');
            setShowModal(true);
        } catch (error) {
            toast.error('Failed to load structure details');
        }
    };

    const openEditModal = async (structure) => {
        if (structure.isLocked) {
            toast.error('Cannot edit a locked structure');
            return;
        }
        if (structure.status !== 'draft') {
            toast.error('Only draft structures can be edited');
            return;
        }

        try {
            const response = await feeAPI.structures.get(structure._id);
            const data = response.data.data;
            setSelectedStructure(data);
            setFormData({
                code: data.code,
                name: data.name,
                description: data.description || '',
                academicYear: data.academicYear,
                semester: data.semester || '',
                departmentId: data.departmentId?._id || data.departmentId || '',
                courseId: data.courseId?._id || data.courseId || '',
                feeHeads: data.feeHeads,
                effectiveFrom: data.effectiveFrom ? data.effectiveFrom.split('T')[0] : '',
                effectiveTo: data.effectiveTo ? data.effectiveTo.split('T')[0] : ''
            });
            setModalMode('edit');
            setShowModal(true);
        } catch (error) {
            toast.error('Failed to load structure details');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (modalMode === 'create') {
                await feeAPI.structures.create(formData);
                toast.success('Fee structure created successfully');
            } else {
                await feeAPI.structures.update(selectedStructure._id, formData);
                toast.success('Fee structure updated successfully');
            }
            setShowModal(false);
            fetchStructures();
        } catch (error) {
            toast.error(error.message || 'Operation failed');
        }
    };

    const handleApprove = async (structure) => {
        if (window.confirm('Are you sure you want to approve this fee structure?')) {
            try {
                await feeAPI.structures.approve(structure._id, 'Approved by admin');
                toast.success('Fee structure approved');
                fetchStructures();
            } catch (error) {
                toast.error(error.message || 'Failed to approve');
            }
        }
    };

    const handleActivate = async (structure) => {
        if (window.confirm('Activate this fee structure?')) {
            try {
                await feeAPI.structures.activate(structure._id);
                toast.success('Fee structure activated');
                fetchStructures();
            } catch (error) {
                toast.error(error.message || 'Failed to activate');
            }
        }
    };

    const handleArchive = async (structure) => {
        if (window.confirm('Archive this fee structure? It will no longer be usable.')) {
            try {
                await feeAPI.structures.archive(structure._id);
                toast.success('Fee structure archived');
                fetchStructures();
            } catch (error) {
                toast.error(error.message || 'Failed to archive');
            }
        }
    };

    const handleCreateVersion = async (structure) => {
        if (window.confirm('Create a new version of this fee structure?')) {
            try {
                await feeAPI.structures.createVersion(structure._id);
                toast.success('New version created');
                fetchStructures();
            } catch (error) {
                toast.error(error.message || 'Failed to create version');
            }
        }
    };

    const updateFeeHead = (index, field, value) => {
        const newHeads = [...formData.feeHeads];
        newHeads[index][field] = field === 'amount' ? parseFloat(value) || 0 : value;
        setFormData(prev => ({ ...prev, feeHeads: newHeads }));
    };

    const getStatusBadge = (status) => {
        const colors = {
            draft: 'badge-draft',
            approved: 'badge-approved',
            active: 'badge-active',
            archived: 'badge-archived'
        };
        return <span className={`status-badge ${colors[status] || ''}`}>{status}</span>;
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const calculateTotal = () => {
        return formData.feeHeads
            .filter(h => !h.isOptional)
            .reduce((sum, h) => sum + (h.amount || 0), 0);
    };

    return (
        <div className="admin-fee-structures">
            {/* Header */}
            <div className="page-header">
                <div className="header-title">
                    <h1>Fee Structures</h1>
                    <p>Manage institutional fee templates</p>
                </div>
                <button className="btn-primary" onClick={openCreateModal}>
                    <FiPlus /> New Structure
                </button>
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <div className="search-box">
                    <FiSearch />
                    <input
                        type="text"
                        placeholder="Search by code or name..."
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    />
                </div>
                <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                >
                    <option value="">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="approved">Approved</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                </select>
                <select
                    value={filters.academicYear}
                    onChange={(e) => setFilters(prev => ({ ...prev, academicYear: e.target.value }))}
                >
                    <option value="">All Years</option>
                    {['2025-2026', '2024-2025', '2023-2024'].map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
            </div>

            {/* Structures Grid */}
            {loading ? (
                <div className="loading-state">Loading...</div>
            ) : structures.length === 0 ? (
                <div className="empty-state">
                    <p>No fee structures found</p>
                    <button onClick={openCreateModal}>Create First Structure</button>
                </div>
            ) : (
                <div className="structures-grid">
                    {structures.map(structure => (
                        <div key={structure._id} className="structure-card">
                            <div className="card-header">
                                <div className="code-badge">{structure.code}</div>
                                {getStatusBadge(structure.status)}
                                {structure.isLocked && <FiLock className="lock-icon" />}
                            </div>
                            <h3>{structure.name}</h3>
                            <div className="card-details">
                                <span>Year: {structure.academicYear}</span>
                                {structure.semester && <span>Sem: {structure.semester}</span>}
                                <span>V{structure.version}</span>
                            </div>
                            <div className="card-amount">
                                <span className="label">Total Fee</span>
                                <span className="value">{formatCurrency(structure.approvedTotal)}</span>
                            </div>
                            <div className="card-meta">
                                <span>{structure.feeHeads?.length || 0} fee heads</span>
                            </div>
                            <div className="card-actions">
                                <button onClick={() => openViewModal(structure)} title="View">
                                    <FiEye />
                                </button>
                                {structure.status === 'draft' && !structure.isLocked && (
                                    <button onClick={() => openEditModal(structure)} title="Edit">
                                        <FiEdit2 />
                                    </button>
                                )}
                                {structure.status === 'draft' && (
                                    <button onClick={() => handleApprove(structure)} title="Approve">
                                        <FiCheck />
                                    </button>
                                )}
                                {structure.status === 'approved' && (
                                    <button onClick={() => handleActivate(structure)} title="Activate">
                                        <FiPlay />
                                    </button>
                                )}
                                {structure.isLocked && (
                                    <button onClick={() => handleCreateVersion(structure)} title="New Version">
                                        <FiCopy />
                                    </button>
                                )}
                                {structure.status !== 'archived' && structure.status !== 'active' && (
                                    <button onClick={() => handleArchive(structure)} title="Archive">
                                        <FiArchive />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="pagination">
                    {Array.from({ length: pagination.pages }, (_, i) => (
                        <button
                            key={i + 1}
                            className={pagination.page === i + 1 ? 'active' : ''}
                            onClick={() => setPagination(prev => ({ ...prev, page: i + 1 }))}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>
                                {modalMode === 'create' && 'Create Fee Structure'}
                                {modalMode === 'edit' && 'Edit Fee Structure'}
                                {modalMode === 'view' && 'Fee Structure Details'}
                            </h2>
                            <button className="close-btn" onClick={() => setShowModal(false)}>
                                <FiX />
                            </button>
                        </div>

                        {modalMode === 'view' ? (
                            <div className="view-content">
                                <div className="view-grid">
                                    <div><strong>Code:</strong> {selectedStructure?.code}</div>
                                    <div><strong>Name:</strong> {selectedStructure?.name}</div>
                                    <div><strong>Status:</strong> {getStatusBadge(selectedStructure?.status)}</div>
                                    <div><strong>Version:</strong> {selectedStructure?.version}</div>
                                    <div><strong>Academic Year:</strong> {selectedStructure?.academicYear}</div>
                                    <div><strong>Total:</strong> {formatCurrency(selectedStructure?.approvedTotal)}</div>
                                </div>
                                <h4>Fee Heads</h4>
                                <table className="fee-heads-table">
                                    <thead>
                                        <tr>
                                            <th>Code</th>
                                            <th>Name</th>
                                            <th>Amount</th>
                                            <th>Optional</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedStructure?.feeHeads?.map((head, idx) => (
                                            <tr key={idx}>
                                                <td>{head.headCode}</td>
                                                <td>{head.headName}</td>
                                                <td>{formatCurrency(head.amount)}</td>
                                                <td>{head.isOptional ? 'Yes' : 'No'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Code *</label>
                                        <input
                                            type="text"
                                            value={formData.code}
                                            onChange={e => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                            required
                                            disabled={modalMode === 'edit'}
                                            placeholder="e.g., FEE-2025-CSE"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Name *</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                            required
                                            placeholder="e.g., B.Tech CSE 2025-26"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Academic Year *</label>
                                        <input
                                            type="text"
                                            value={formData.academicYear}
                                            onChange={e => setFormData(prev => ({ ...prev, academicYear: e.target.value }))}
                                            required
                                            placeholder="e.g., 2025-2026"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Semester</label>
                                        <select
                                            value={formData.semester}
                                            onChange={e => setFormData(prev => ({ ...prev, semester: e.target.value }))}
                                        >
                                            <option value="">All Semesters</option>
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                                                <option key={s} value={s}>Semester {s}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Department</label>
                                        <select
                                            value={formData.departmentId}
                                            onChange={e => setFormData(prev => ({ ...prev, departmentId: e.target.value }))}
                                        >
                                            <option value="">All Departments</option>
                                            {departments.map(d => (
                                                <option key={d._id} value={d._id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Course</label>
                                        <select
                                            value={formData.courseId}
                                            onChange={e => setFormData(prev => ({ ...prev, courseId: e.target.value }))}
                                        >
                                            <option value="">All Courses</option>
                                            {courses.map(c => (
                                                <option key={c._id} value={c._id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group full-width">
                                    <label>Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        rows={2}
                                    />
                                </div>

                                <h4>Fee Heads</h4>
                                <div className="fee-heads-editor">
                                    {formData.feeHeads.map((head, idx) => (
                                        <div key={idx} className="fee-head-row">
                                            <span className="head-code">{head.headCode}</span>
                                            <span className="head-name">{head.headName}</span>
                                            <input
                                                type="number"
                                                value={head.amount}
                                                onChange={e => updateFeeHead(idx, 'amount', e.target.value)}
                                                min="0"
                                                placeholder="Amount"
                                            />
                                            <label className="optional-check">
                                                <input
                                                    type="checkbox"
                                                    checked={head.isOptional}
                                                    onChange={e => updateFeeHead(idx, 'isOptional', e.target.checked)}
                                                />
                                                Optional
                                            </label>
                                        </div>
                                    ))}
                                </div>

                                <div className="total-display">
                                    <span>Total (Mandatory):</span>
                                    <strong>{formatCurrency(calculateTotal())}</strong>
                                </div>

                                <div className="modal-actions">
                                    <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        {modalMode === 'create' ? 'Create' : 'Update'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminFeeStructures;
