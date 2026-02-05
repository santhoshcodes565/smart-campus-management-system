/**
 * Mark Controller
 * 
 * Handles all mark-related operations with strict RBAC.
 * 
 * FACULTY OPERATIONS:
 * - Upload marks (draft status)
 * - Edit marks (draft status only)
 * - Submit for review
 * 
 * ADMIN OPERATIONS:
 * - View pending approvals
 * - Approve/Reject results
 * - Publish results
 * - Lock semesters
 * - Override locked results (with audit)
 */

const Result = require('../models/Result');
const Exam = require('../models/Exam');
const Student = require('../models/Student');
const MarkAuditLog = require('../models/MarkAuditLog');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { emitEvent, EVENTS } = require('../services/eventEmitter');

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Get request metadata for audit logging
 */
const getRequestMeta = (req) => ({
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('User-Agent')
});

/**
 * Log mark change to audit trail
 */
const logAudit = async (params) => {
    try {
        await MarkAuditLog.logChange(params);
    } catch (error) {
        console.error('[Audit] Failed to log mark change:', error.message);
        // Don't throw - audit failure shouldn't block operation
    }
};

// =============================================
// FACULTY ENDPOINTS
// =============================================

/**
 * Upload marks for an exam
 * POST /faculty/marks/upload
 */
const uploadMarks = async (req, res, next) => {
    try {
        const { examId, marks } = req.body;

        if (!examId || !marks || !Array.isArray(marks)) {
            return errorResponse(res, 400, 'examId and marks array are required');
        }

        const exam = await Exam.findById(examId);
        if (!exam) {
            return errorResponse(res, 404, 'Exam not found');
        }

        // Check exam status
        if (!['draft', 'completed'].includes(exam.status)) {
            return errorResponse(res, 400,
                'Cannot upload marks. Exam must be in draft or completed status.'
            );
        }

        const results = [];
        const errors = [];
        const meta = getRequestMeta(req);

        for (const entry of marks) {
            const { studentId, marksObtained, remarks } = entry;

            try {
                // Check if result exists
                let result = await Result.findOne({ examId, studentId });

                if (result) {
                    // Check if editable
                    if (!result.canEdit(req.user.role)) {
                        errors.push({
                            studentId,
                            error: `Result is in '${result.status}' status and cannot be edited`
                        });
                        continue;
                    }

                    // Store old values for audit
                    const oldValues = {
                        marks: result.marksObtained,
                        grade: result.grade,
                        status: result.status,
                        percentage: result.percentage
                    };

                    // Update existing
                    result.marksObtained = marksObtained;
                    if (remarks !== undefined) result.remarks = remarks;
                    await result.save();

                    // Log update
                    await logAudit({
                        resultId: result._id,
                        examId,
                        studentId,
                        subjectId: exam.subjectId,
                        action: 'update',
                        performedBy: req.user._id,
                        performedByRole: req.user.role,
                        performedByName: req.user.name,
                        oldValues,
                        newValues: {
                            marks: result.marksObtained,
                            grade: result.grade,
                            status: result.status,
                            percentage: result.percentage
                        },
                        ...meta
                    });

                } else {
                    // Create new
                    result = await Result.create({
                        examId,
                        studentId,
                        marksObtained,
                        remarks: remarks || '',
                        status: 'draft',
                        enteredBy: req.user._id,
                        enteredAt: new Date(),
                        facultyId: req.user.facultyId
                    });

                    // Log creation
                    await logAudit({
                        resultId: result._id,
                        examId,
                        studentId,
                        subjectId: exam.subjectId,
                        action: 'create',
                        performedBy: req.user._id,
                        performedByRole: req.user.role,
                        performedByName: req.user.name,
                        oldValues: {},
                        newValues: {
                            marks: result.marksObtained,
                            grade: result.grade,
                            status: result.status,
                            percentage: result.percentage
                        },
                        ...meta
                    });
                }

                results.push(result);

            } catch (err) {
                errors.push({ studentId, error: err.message });
            }
        }

        return successResponse(res, 200, 'Marks uploaded successfully', {
            uploaded: results.length,
            errors: errors.length,
            errorDetails: errors
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Edit a single result
 * PATCH /faculty/marks/:resultId
 */
const editMark = async (req, res, next) => {
    try {
        const result = req.result; // Set by canEdit middleware
        const { marksObtained, remarks, reason } = req.body;

        if (marksObtained === undefined) {
            return errorResponse(res, 400, 'marksObtained is required');
        }

        const exam = await Exam.findById(result.examId);
        const meta = getRequestMeta(req);

        // Store old values
        const oldValues = {
            marks: result.marksObtained,
            grade: result.grade,
            status: result.status,
            percentage: result.percentage
        };

        // Update
        result.marksObtained = marksObtained;
        if (remarks !== undefined) result.remarks = remarks;
        await result.save();

        // Log change
        await logAudit({
            resultId: result._id,
            examId: result.examId,
            studentId: result.studentId,
            subjectId: exam?.subjectId,
            action: 'update',
            performedBy: req.user._id,
            performedByRole: req.user.role,
            performedByName: req.user.name,
            oldValues,
            newValues: {
                marks: result.marksObtained,
                grade: result.grade,
                status: result.status,
                percentage: result.percentage
            },
            reason,
            ...meta
        });

        return successResponse(res, 200, 'Mark updated successfully', { result });

    } catch (error) {
        next(error);
    }
};

/**
 * Submit results for admin review
 * POST /faculty/marks/submit/:examId
 */
const submitResults = async (req, res, next) => {
    try {
        const { examId } = req.params;

        const exam = await Exam.findById(examId);
        if (!exam) {
            return errorResponse(res, 404, 'Exam not found');
        }

        // Get draft results count
        const draftCount = await Result.countDocuments({
            examId,
            status: 'draft'
        });

        if (draftCount === 0) {
            return errorResponse(res, 400, 'No draft results to submit');
        }

        const meta = getRequestMeta(req);

        // Bulk update status
        await Result.bulkUpdateStatus(examId, 'submitted', {
            submittedBy: req.user._id,
            submittedAt: new Date()
        });

        // Log submission for all results
        const results = await Result.find({ examId, status: 'submitted' });
        for (const result of results) {
            await logAudit({
                resultId: result._id,
                examId,
                studentId: result.studentId,
                subjectId: exam.subjectId,
                action: 'submit',
                performedBy: req.user._id,
                performedByRole: req.user.role,
                performedByName: req.user.name,
                oldValues: { status: 'draft' },
                newValues: { status: 'submitted' },
                ...meta
            });
        }

        return successResponse(res, 200, 'Results submitted for admin review', {
            submittedCount: draftCount
        });

    } catch (error) {
        next(error);
    }
};

// =============================================
// ADMIN ENDPOINTS
// =============================================

/**
 * Get pending approvals
 * GET /admin/marks/pending
 */
const getPendingApprovals = async (req, res, next) => {
    try {
        const pending = await Result.getPendingApprovals({
            limit: parseInt(req.query.limit) || 50
        });

        return successResponse(res, 200, 'Pending approvals retrieved', {
            exams: pending
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Approve results for an exam
 * POST /admin/marks/approve/:examId
 */
const approveResults = async (req, res, next) => {
    try {
        const { examId } = req.params;

        const exam = await Exam.findById(examId);
        if (!exam) {
            return errorResponse(res, 404, 'Exam not found');
        }

        // Check if any submitted results exist
        const submittedCount = await Result.countDocuments({
            examId,
            status: 'submitted'
        });

        if (submittedCount === 0) {
            return errorResponse(res, 400, 'No submitted results to approve');
        }

        const meta = getRequestMeta(req);

        // Bulk approve
        await Result.updateMany(
            { examId, status: 'submitted' },
            {
                $set: {
                    status: 'approved',
                    approvedBy: req.user._id,
                    approvedAt: new Date()
                }
            }
        );

        // Log approvals
        const results = await Result.find({ examId, status: 'approved' });
        for (const result of results) {
            await logAudit({
                resultId: result._id,
                examId,
                studentId: result.studentId,
                subjectId: exam.subjectId,
                action: 'approve',
                performedBy: req.user._id,
                performedByRole: 'admin',
                performedByName: req.user.name,
                oldValues: { status: 'submitted' },
                newValues: { status: 'approved' },
                ...meta
            });
        }

        return successResponse(res, 200, 'Results approved successfully', {
            approvedCount: submittedCount
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Reject results (back to draft)
 * POST /admin/marks/reject/:examId
 */
const rejectResults = async (req, res, next) => {
    try {
        const { examId } = req.params;
        const { reason } = req.body;

        if (!reason || reason.trim().length < 5) {
            return errorResponse(res, 400, 'Rejection reason is required');
        }

        const exam = await Exam.findById(examId);
        if (!exam) {
            return errorResponse(res, 404, 'Exam not found');
        }

        const submittedCount = await Result.countDocuments({
            examId,
            status: 'submitted'
        });

        if (submittedCount === 0) {
            return errorResponse(res, 400, 'No submitted results to reject');
        }

        const meta = getRequestMeta(req);

        // Bulk reject → back to draft
        await Result.updateMany(
            { examId, status: 'submitted' },
            {
                $set: {
                    status: 'draft',
                    rejectedBy: req.user._id,
                    rejectedAt: new Date(),
                    rejectionReason: reason
                }
            }
        );

        // Log rejections
        const results = await Result.find({ examId, status: 'draft', rejectedBy: { $exists: true } });
        for (const result of results) {
            await logAudit({
                resultId: result._id,
                examId,
                studentId: result.studentId,
                subjectId: exam.subjectId,
                action: 'reject',
                performedBy: req.user._id,
                performedByRole: 'admin',
                performedByName: req.user.name,
                oldValues: { status: 'submitted' },
                newValues: { status: 'draft' },
                reason,
                ...meta
            });
        }

        return successResponse(res, 200, 'Results rejected and returned to draft', {
            rejectedCount: submittedCount,
            reason
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Publish approved results
 * POST /admin/marks/publish/:examId
 */
const publishResults = async (req, res, next) => {
    try {
        const { examId } = req.params;

        const exam = await Exam.findById(examId)
            .populate('subjectId', 'courseId semester');
        if (!exam) {
            return errorResponse(res, 404, 'Exam not found');
        }

        const approvedCount = await Result.countDocuments({
            examId,
            status: 'approved'
        });

        if (approvedCount === 0) {
            return errorResponse(res, 400, 'No approved results to publish');
        }

        const meta = getRequestMeta(req);

        // Bulk publish
        await Result.updateMany(
            { examId, status: 'approved' },
            {
                $set: {
                    status: 'published',
                    isPublished: true,
                    publishedBy: req.user._id,
                    publishedAt: new Date()
                }
            }
        );

        // Update exam status
        exam.status = 'completed';
        await exam.save();

        // Get student IDs for analytics event
        const results = await Result.find({ examId, status: 'published' })
            .select('studentId')
            .lean();
        const studentIds = results.map(r => r.studentId);

        // Emit analytics event
        if (studentIds.length > 0) {
            emitEvent(EVENTS.RESULT_PUBLISHED, {
                examId,
                departmentId: exam.subjectId?.courseId?.departmentId,
                courseId: exam.courseId,
                semester: exam.semester,
                studentIds,
                publishedBy: req.user._id
            });
        }

        // Log publications
        for (const result of results) {
            await logAudit({
                resultId: result._id,
                examId,
                studentId: result.studentId,
                subjectId: exam.subjectId,
                action: 'publish',
                performedBy: req.user._id,
                performedByRole: 'admin',
                performedByName: req.user.name,
                oldValues: { status: 'approved' },
                newValues: { status: 'published' },
                ...meta
            });
        }

        return successResponse(res, 200, 'Results published successfully', {
            publishedCount: approvedCount
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Lock semester results
 * POST /admin/marks/lock/:examId
 */
const lockResults = async (req, res, next) => {
    try {
        const { examId } = req.params;

        const exam = await Exam.findById(examId);
        if (!exam) {
            return errorResponse(res, 404, 'Exam not found');
        }

        const publishedCount = await Result.countDocuments({
            examId,
            status: 'published'
        });

        if (publishedCount === 0) {
            return errorResponse(res, 400, 'No published results to lock');
        }

        const meta = getRequestMeta(req);

        // Bulk lock
        await Result.updateMany(
            { examId, status: 'published' },
            {
                $set: {
                    status: 'locked',
                    lockedBy: req.user._id,
                    lockedAt: new Date()
                }
            }
        );

        // Log locks
        const results = await Result.find({ examId, status: 'locked' });
        for (const result of results) {
            await logAudit({
                resultId: result._id,
                examId,
                studentId: result.studentId,
                subjectId: exam.subjectId,
                action: 'lock',
                performedBy: req.user._id,
                performedByRole: 'admin',
                performedByName: req.user.name,
                oldValues: { status: 'published' },
                newValues: { status: 'locked' },
                ...meta
            });
        }

        return successResponse(res, 200, 'Semester results locked successfully', {
            lockedCount: publishedCount
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Admin override on locked result
 * POST /admin/marks/override/:resultId
 */
const overrideResult = async (req, res, next) => {
    try {
        const { resultId } = req.params;
        const { marksObtained, reason } = req.body;

        // Reason validation done in middleware

        const result = await Result.findById(resultId);
        if (!result) {
            return errorResponse(res, 404, 'Result not found');
        }

        if (result.status !== 'locked') {
            return errorResponse(res, 400,
                'Override is only for locked results. Use normal edit for other statuses.'
            );
        }

        const exam = await Exam.findById(result.examId);
        const meta = getRequestMeta(req);

        // Store old values
        const oldValues = {
            marks: result.marksObtained,
            grade: result.grade,
            status: result.status,
            percentage: result.percentage
        };

        // Update marks (keeps locked status)
        result.marksObtained = marksObtained;
        await result.save();

        // Log admin override
        await logAudit({
            resultId: result._id,
            examId: result.examId,
            studentId: result.studentId,
            subjectId: exam?.subjectId,
            action: 'admin_override',
            performedBy: req.user._id,
            performedByRole: 'admin',
            performedByName: req.user.name,
            oldValues,
            newValues: {
                marks: result.marksObtained,
                grade: result.grade,
                status: result.status,
                percentage: result.percentage
            },
            reason,  // Required for override
            ...meta
        });

        return successResponse(res, 200, 'Result overridden successfully', {
            result,
            auditNote: 'This change has been logged in the audit trail'
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Get audit history for a result
 * GET /admin/marks/audit/:resultId
 */
const getAuditHistory = async (req, res, next) => {
    try {
        const { resultId } = req.params;

        const history = await MarkAuditLog.getResultHistory(resultId);

        return successResponse(res, 200, 'Audit history retrieved', {
            history
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Admin edit mark (for approved/submitted status)
 * PATCH /admin/marks/:resultId
 */
const adminEditMark = async (req, res, next) => {
    try {
        const { resultId } = req.params;
        const { marksObtained, remarks, reason } = req.body;

        const result = await Result.findById(resultId);
        if (!result) {
            return errorResponse(res, 404, 'Result not found');
        }

        // Admin can edit in draft, submitted, approved (not published/locked)
        if (['published', 'locked'].includes(result.status)) {
            return errorResponse(res, 403,
                `Cannot edit ${result.status} results. Use override for locked results.`
            );
        }

        const exam = await Exam.findById(result.examId);
        const meta = getRequestMeta(req);

        const oldValues = {
            marks: result.marksObtained,
            grade: result.grade,
            status: result.status,
            percentage: result.percentage
        };

        result.marksObtained = marksObtained;
        if (remarks !== undefined) result.remarks = remarks;
        await result.save();

        await logAudit({
            resultId: result._id,
            examId: result.examId,
            studentId: result.studentId,
            subjectId: exam?.subjectId,
            action: 'update',
            performedBy: req.user._id,
            performedByRole: 'admin',
            performedByName: req.user.name,
            oldValues,
            newValues: {
                marks: result.marksObtained,
                grade: result.grade,
                status: result.status,
                percentage: result.percentage
            },
            reason,
            ...meta
        });

        return successResponse(res, 200, 'Mark updated by admin', { result });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    // Faculty
    uploadMarks,
    editMark,
    submitResults,

    // Admin
    getPendingApprovals,
    approveResults,
    rejectResults,
    publishResults,
    lockResults,
    overrideResult,
    getAuditHistory,
    adminEditMark
};
