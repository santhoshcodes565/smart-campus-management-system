/**
 * Admin Marks Entry Page
 * Enterprise-grade Excel-like marks grid
 * 
 * FLOW: Select Filters → Fetch Students → Enter Marks → Save Draft → Publish
 */

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import './AdminMarksEntry.css';

const AdminMarksEntry = () => {
    // Filter state
    const [filters, setFilters] = useState({
        department: '',
        academicYear: '',
        semester: '',
        subject: ''
    });
    const [filterOptions, setFilterOptions] = useState({
        departments: [],
        academicYears: [],
        semesters: [],
        subjects: []
    });

    // Data state
    const [marksData, setMarksData] = useState({
        students: [],
        department: '',
        academicYear: '',
        semester: '',
        subject: '',
        subjectName: '',
        totalCount: 0,
        draftCount: 0,
        publishedCount: 0
    });

    // UI state
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showPublishConfirm, setShowPublishConfirm] = useState(false);
    const [showReopenModal, setShowReopenModal] = useState(false);
    const [reopenReason, setReopenReason] = useState('');
    const [syncing, setSyncing] = useState(false);
    const [publishStatus, setPublishStatus] = useState(null);

    // Validation errors per row
    const [validationErrors, setValidationErrors] = useState({});

    // ==================== FETCH FILTER OPTIONS ====================
    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const response = await api.get('/admin/marks-entry/filters');
                if (response.data?.success) {
                    setFilterOptions(response.data.data);
                    // Set default academic year
                    if (response.data.data.academicYears?.length > 0) {
                        setFilters(prev => ({
                            ...prev,
                            academicYear: response.data.data.academicYears[0]
                        }));
                    }
                }
            } catch (err) {
                console.error('Failed to fetch filters:', err);
            }
        };
        fetchFilters();
    }, []);

    // ==================== FETCH STUDENTS ====================
    const fetchStudents = useCallback(async () => {
        if (!filters.department || !filters.academicYear || !filters.semester || !filters.subject) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await api.get('/admin/marks-entry/students', { params: filters });
            if (response.data?.success) {
                setMarksData(response.data.data);
                setValidationErrors({});
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch students');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    // ==================== CHECK PUBLISH STATUS ====================
    const checkPublishStatus = useCallback(async () => {
        if (!filters.department || !filters.academicYear || !filters.semester || !filters.subject) {
            return;
        }

        try {
            const response = await api.get('/admin/marks-entry/status', { params: filters });
            if (response.data?.success) {
                setPublishStatus(response.data.data);
            }
        } catch (err) {
            console.error('Failed to check status:', err);
        }
    }, [filters]);

    // ==================== HANDLE FILTER CHANGE ====================
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setMarksData(prev => ({ ...prev, students: [] }));
        setSuccess(null);
        setPublishStatus(null);
    };

    // ==================== HANDLE FETCH ====================
    const handleFetch = () => {
        fetchStudents();
        checkPublishStatus();
    };

    // ==================== HANDLE MARKS CHANGE ====================
    const handleMarksChange = (index, field, value) => {
        const numValue = value === '' ? '' : parseInt(value) || 0;

        setMarksData(prev => {
            const newStudents = [...prev.students];
            newStudents[index] = {
                ...newStudents[index],
                [field]: numValue
            };

            // Auto-calculate total
            const internal = field === 'internalMarks' ? numValue : newStudents[index].internalMarks || 0;
            const external = field === 'externalMarks' ? numValue : newStudents[index].externalMarks || 0;

            if (internal !== '' && external !== '') {
                const total = (parseInt(internal) || 0) + (parseInt(external) || 0);
                newStudents[index].totalMarks = total;
                newStudents[index].grade = calculateGrade(total);
                newStudents[index].resultStatus = total >= 40 ? 'pass' : 'fail';
            }

            return { ...prev, students: newStudents };
        });

        // Validate on change
        validateRow(index, field, numValue);
    };

    // ==================== VALIDATION ====================
    const validateRow = (index, field, value) => {
        const errors = { ...validationErrors };
        const key = `${index}-${field}`;

        if (field === 'internalMarks' && (value < 0 || value > 30)) {
            errors[key] = 'Internal: 0-30';
        } else if (field === 'externalMarks' && (value < 0 || value > 70)) {
            errors[key] = 'External: 0-70';
        } else {
            delete errors[key];
        }

        setValidationErrors(errors);
    };

    const hasValidationErrors = () => Object.keys(validationErrors).length > 0;

    // ==================== CALCULATE GRADE ====================
    const calculateGrade = (total) => {
        if (total >= 90) return 'O';
        if (total >= 80) return 'A+';
        if (total >= 70) return 'A';
        if (total >= 60) return 'B+';
        if (total >= 55) return 'B';
        if (total >= 50) return 'C';
        if (total >= 40) return 'D';
        return 'F';
    };

    // ==================== SAVE DRAFT ====================
    const handleSaveDraft = async () => {
        if (hasValidationErrors()) {
            setError('Fix validation errors before saving');
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const payload = {
                department: marksData.department,
                academicYear: marksData.academicYear,
                semester: marksData.semester,
                subject: marksData.subject,
                subjectName: marksData.subjectName,
                marks: marksData.students.map(s => ({
                    studentId: s.studentId,
                    internalMarks: s.internalMarks || 0,
                    externalMarks: s.externalMarks || 0
                }))
            };

            const response = await api.post('/admin/marks-entry/draft', payload);
            if (response.data?.success) {
                setSuccess('Draft saved successfully');
                fetchStudents();
                checkPublishStatus();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save draft');
        } finally {
            setSaving(false);
        }
    };

    // ==================== PUBLISH RESULTS ====================
    const handlePublish = async () => {
        setPublishing(true);
        setError(null);
        setSuccess(null);

        try {
            const payload = {
                department: marksData.department,
                academicYear: marksData.academicYear,
                semester: marksData.semester,
                subject: marksData.subject,
                subjectName: marksData.subjectName
            };

            const response = await api.post('/admin/marks-entry/publish', payload);
            if (response.data?.success) {
                setSuccess(`Results published for ${response.data.data.publishedCount} students. Analytics will be computed.`);
                setShowPublishConfirm(false);
                fetchStudents();
                checkPublishStatus();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to publish');
        } finally {
            setPublishing(false);
        }
    };

    // ==================== REOPEN RESULTS ====================
    const handleReopen = async () => {
        if (reopenReason.trim().length < 10) {
            setError('Reason must be at least 10 characters');
            return;
        }

        setError(null);
        setSuccess(null);

        try {
            const payload = {
                department: marksData.department,
                academicYear: marksData.academicYear,
                semester: marksData.semester,
                subject: marksData.subject,
                reason: reopenReason
            };

            const response = await api.post('/admin/marks-entry/reopen', payload);
            if (response.data?.success) {
                setSuccess(`Results reopened for editing (${response.data.data.reopenedCount} students)`);
                setShowReopenModal(false);
                setReopenReason('');
                fetchStudents();
                checkPublishStatus();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reopen');
        }
    };

    // ==================== SYNC PERFORMANCE (for existing published marks) ====================
    const handleSyncPerformance = async () => {
        setSyncing(true);
        setError(null);
        setSuccess(null);

        try {
            const payload = {
                department: marksData.department,
                academicYear: marksData.academicYear,
                semester: marksData.semester,
                subject: marksData.subject,
                subjectName: marksData.subjectName
            };

            const response = await api.post('/admin/marks-entry/sync-performance', payload);
            if (response.data?.success) {
                setSuccess('Student performance synced! Students can now view their marks.');
                checkPublishStatus();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to sync');
        } finally {
            setSyncing(false);
        }
    };

    // ==================== RENDER ====================
    const isPublished = publishStatus?.isPublished;
    const canEdit = !isPublished;
    const filtersComplete = filters.department && filters.academicYear && filters.semester && filters.subject;

    return (
        <div className="marks-entry-container">
            {/* Header */}
            <div className="marks-entry-header">
                <h1>📝 Marks Control Center</h1>
                <p className="subtitle">Admin-Only • Draft-First • Publish with Confidence</p>
            </div>

            {/* Alerts */}
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {/* Filters */}
            <div className="filters-section">
                <div className="filter-grid">
                    <div className="filter-group">
                        <label>Department</label>
                        <select name="department" value={filters.department} onChange={handleFilterChange}>
                            <option value="">Select Department</option>
                            {filterOptions.departments.map(d => (
                                <option key={d._id} value={d.name}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Academic Year</label>
                        <select name="academicYear" value={filters.academicYear} onChange={handleFilterChange}>
                            <option value="">Select Year</option>
                            {filterOptions.academicYears.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Semester</label>
                        <select name="semester" value={filters.semester} onChange={handleFilterChange}>
                            <option value="">Select Semester</option>
                            {filterOptions.semesters.map(s => (
                                <option key={s} value={s}>Semester {s}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Subject</label>
                        <select name="subject" value={filters.subject} onChange={handleFilterChange}>
                            <option value="">Select Subject</option>
                            {filterOptions.subjects
                                .filter(s => !filters.semester || s.semester === parseInt(filters.semester))
                                .map(s => (
                                    <option key={s._id} value={s.code}>{s.code} - {s.name}</option>
                                ))}
                        </select>
                    </div>
                    <div className="filter-group filter-action">
                        <button
                            className="btn-fetch"
                            onClick={handleFetch}
                            disabled={!filtersComplete || loading}
                        >
                            {loading ? 'Loading...' : '🔍 Fetch Students'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Status Bar */}
            {publishStatus && (
                <div className={`status-bar ${isPublished ? 'published' : 'draft'}`}>
                    <span className="status-icon">{isPublished ? '🔒' : '📝'}</span>
                    <span className="status-text">
                        {isPublished ? 'Published & Locked' : 'Draft Mode'}
                    </span>
                    {publishStatus.analyticsGenerated && (
                        <span className="analytics-badge">
                            ✅ Analytics v{publishStatus.analyticsVersion}
                        </span>
                    )}
                    <span className="count-badge">
                        {marksData.totalCount} students
                    </span>
                </div>
            )}

            {/* Marks Grid */}
            {marksData.students.length > 0 && (
                <div className="marks-grid-section">
                    <div className="grid-header">
                        <h2>{marksData.subjectName || marksData.subject}</h2>
                        <span className="semester-tag">Semester {marksData.semester}</span>
                    </div>

                    <div className="table-container">
                        <table className="marks-table">
                            <thead>
                                <tr>
                                    <th className="col-sno">#</th>
                                    <th className="col-rollno">Roll No</th>
                                    <th className="col-name">Student Name</th>
                                    <th className="col-marks">Internal (0-30)</th>
                                    <th className="col-marks">External (0-70)</th>
                                    <th className="col-total">Total</th>
                                    <th className="col-grade">Grade</th>
                                    <th className="col-status">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {marksData.students.map((student, idx) => (
                                    <tr key={student.studentId} className={student.resultStatus === 'fail' ? 'row-fail' : ''}>
                                        <td className="col-sno">{idx + 1}</td>
                                        <td className="col-rollno">{student.rollNo}</td>
                                        <td className="col-name">{student.studentName}</td>
                                        <td className="col-marks">
                                            <input
                                                type="number"
                                                min="0"
                                                max="30"
                                                value={student.internalMarks}
                                                onChange={(e) => handleMarksChange(idx, 'internalMarks', e.target.value)}
                                                disabled={!canEdit}
                                                className={validationErrors[`${idx}-internalMarks`] ? 'input-error' : ''}
                                            />
                                            {validationErrors[`${idx}-internalMarks`] && (
                                                <span className="error-hint">{validationErrors[`${idx}-internalMarks`]}</span>
                                            )}
                                        </td>
                                        <td className="col-marks">
                                            <input
                                                type="number"
                                                min="0"
                                                max="70"
                                                value={student.externalMarks}
                                                onChange={(e) => handleMarksChange(idx, 'externalMarks', e.target.value)}
                                                disabled={!canEdit}
                                                className={validationErrors[`${idx}-externalMarks`] ? 'input-error' : ''}
                                            />
                                            {validationErrors[`${idx}-externalMarks`] && (
                                                <span className="error-hint">{validationErrors[`${idx}-externalMarks`]}</span>
                                            )}
                                        </td>
                                        <td className="col-total">
                                            <span className={`total-value ${student.totalMarks < 40 ? 'fail' : 'pass'}`}>
                                                {student.totalMarks !== '' ? student.totalMarks : '-'}
                                            </span>
                                        </td>
                                        <td className="col-grade">
                                            <span className={`grade-badge grade-${student.grade?.replace('+', 'plus')}`}>
                                                {student.grade || '-'}
                                            </span>
                                        </td>
                                        <td className="col-status">
                                            <span className={`status-badge ${student.resultStatus}`}>
                                                {student.resultStatus === 'pass' ? '✅' : student.resultStatus === 'fail' ? '❌' : '⏳'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Action Buttons */}
                    <div className="action-bar">
                        {canEdit ? (
                            <>
                                <button
                                    className="btn btn-draft"
                                    onClick={handleSaveDraft}
                                    disabled={saving || hasValidationErrors()}
                                >
                                    {saving ? '💾 Saving...' : '💾 Save Draft'}
                                </button>
                                <button
                                    className="btn btn-publish"
                                    onClick={() => setShowPublishConfirm(true)}
                                    disabled={marksData.draftCount === 0 && marksData.publishedCount === 0}
                                >
                                    🚀 Publish Results
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    className="btn btn-sync"
                                    onClick={handleSyncPerformance}
                                    disabled={syncing}
                                    title="Sync marks to student dashboard"
                                >
                                    {syncing ? '🔄 Syncing...' : '🔄 Sync to Dashboard'}
                                </button>
                                <button
                                    className="btn btn-reopen"
                                    onClick={() => setShowReopenModal(true)}
                                >
                                    🔓 Reopen for Editing
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Publish Confirmation Modal */}
            {showPublishConfirm && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>⚠️ Confirm Publication</h3>
                        </div>
                        <div className="modal-body">
                            <p className="warning-text">
                                <strong>Publishing will lock marks and update analytics. Continue?</strong>
                            </p>
                            <ul className="confirm-list">
                                <li>✓ All draft marks will be locked</li>
                                <li>✓ Analytics will be computed instantly</li>
                                <li>✓ Students can view their results</li>
                                <li>⚠️ Editing will require reopening</li>
                            </ul>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-cancel" onClick={() => setShowPublishConfirm(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-confirm" onClick={handlePublish} disabled={publishing}>
                                {publishing ? 'Publishing...' : 'Yes, Publish'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reopen Modal */}
            {showReopenModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>🔓 Reopen Results</h3>
                        </div>
                        <div className="modal-body">
                            <p>Reopening will unlock marks for editing. A reason is required for audit.</p>
                            <textarea
                                className="reason-input"
                                placeholder="Enter reason for reopening (min 10 characters)..."
                                value={reopenReason}
                                onChange={(e) => setReopenReason(e.target.value)}
                                rows={3}
                            />
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-cancel" onClick={() => setShowReopenModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-reopen"
                                onClick={handleReopen}
                                disabled={reopenReason.trim().length < 10}
                            >
                                Reopen
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && marksData.students.length === 0 && filtersComplete && (
                <div className="empty-state">
                    <span className="empty-icon">📋</span>
                    <p>No students found for the selected criteria</p>
                    <p className="hint">Try different filters or click Fetch Students</p>
                </div>
            )}
        </div>
    );
};

export default AdminMarksEntry;
