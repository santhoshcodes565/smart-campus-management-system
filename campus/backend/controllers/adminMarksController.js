/**
 * Admin Marks Controller
 * Enterprise-grade marks entry and publishing
 * 
 * ENDPOINTS:
 * - GET /students - Fetch students for marks grid
 * - POST /draft - Save marks as draft
 * - POST /publish - Publish and lock results
 * - POST /reopen - Unlock for edits
 * - GET /status - Check publish status
 */

const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const StudentMarks = require('../models/StudentMarks');
const SimplifiedAnalytics = require('../models/SimplifiedAnalytics');
const MarksAuditLog = require('../models/MarksAuditLog');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Department = require('../models/Department');
const { MARKS_EVENTS, emitMarksEvent } = require('../services/marksEventEmitter');

// ==================== HELPER FUNCTIONS ====================

/**
 * Validate marks input
 */
function validateMarks(marks, config = { maxInternal: 30, maxExternal: 70 }) {
    const errors = [];

    for (let i = 0; i < marks.length; i++) {
        const mark = marks[i];

        if (mark.internalMarks < 0 || mark.internalMarks > config.maxInternal) {
            errors.push(`Row ${i + 1}: Internal marks must be 0-${config.maxInternal}`);
        }

        if (mark.externalMarks < 0 || mark.externalMarks > config.maxExternal) {
            errors.push(`Row ${i + 1}: External marks must be 0-${config.maxExternal}`);
        }

        const total = (mark.internalMarks || 0) + (mark.externalMarks || 0);
        if (total > 100) {
            errors.push(`Row ${i + 1}: Total cannot exceed 100`);
        }
    }

    return errors;
}

// ==================== ENDPOINTS ====================

/**
 * @desc    Get students for marks entry grid
 * @route   GET /api/admin/marks/students
 * @access  Admin
 */
const getStudentsForMarks = asyncHandler(async (req, res) => {
    const { department, academicYear, semester, subject } = req.query;

    if (!department || !academicYear || !semester || !subject) {
        return res.status(400).json({
            success: false,
            message: 'department, academicYear, semester, and subject are required'
        });
    }

    // Get department ID from name/code
    const dept = await Department.findOne({
        $or: [{ name: department }, { code: department }]
    }).lean();

    if (!dept) {
        return res.status(404).json({
            success: false,
            message: 'Department not found'
        });
    }

    // Get subject info
    const subjectDoc = await Subject.findOne({
        $or: [{ name: subject }, { code: subject }]
    }).lean();

    // Get students in this department/semester
    const students = await Student.find({
        departmentId: dept._id,
        semester: parseInt(semester)
    })
        .populate('userId', 'name email')
        .select('rollNo userId')
        .sort({ rollNo: 1 })
        .lean();

    // Get existing marks if any
    const existingMarks = await StudentMarks.find({
        department: dept.name,
        academicYear,
        semester: parseInt(semester),
        subject
    }).lean();

    const marksMap = new Map(existingMarks.map(m => [m.studentId.toString(), m]));

    // Merge students with marks
    const marksGrid = students.map(student => {
        const mark = marksMap.get(student._id.toString());
        return {
            studentId: student._id,
            rollNo: student.rollNo,
            studentName: student.userId?.name || 'N/A',
            internalMarks: mark?.internalMarks ?? '',
            externalMarks: mark?.externalMarks ?? '',
            totalMarks: mark?.totalMarks ?? '',
            grade: mark?.grade ?? '-',
            resultStatus: mark?.resultStatus ?? 'pending',
            status: mark?.status ?? 'draft',
            _id: mark?._id
        };
    });

    res.json({
        success: true,
        data: {
            department: dept.name,
            academicYear,
            semester: parseInt(semester),
            subject,
            subjectName: subjectDoc?.name || subject,
            students: marksGrid,
            totalCount: marksGrid.length,
            draftCount: marksGrid.filter(m => m.status === 'draft' && m._id).length,
            publishedCount: marksGrid.filter(m => m.status === 'published').length
        }
    });
});

/**
 * @desc    Save marks as draft
 * @route   POST /api/admin/marks/draft
 * @access  Admin
 */
const saveDraft = asyncHandler(async (req, res) => {
    const { department, academicYear, semester, subject, subjectName, marks } = req.body;

    if (!department || !academicYear || !semester || !subject || !marks?.length) {
        return res.status(400).json({
            success: false,
            message: 'department, academicYear, semester, subject, and marks are required'
        });
    }

    // Validate marks
    const errors = validateMarks(marks);
    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors
        });
    }

    // Check if any marks are already published
    const publishedCount = await StudentMarks.countDocuments({
        department,
        academicYear,
        semester: parseInt(semester),
        subject,
        status: 'published'
    });

    if (publishedCount > 0) {
        return res.status(400).json({
            success: false,
            message: 'Cannot save draft - results already published. Use Reopen first.'
        });
    }

    // Prepare bulk data
    const marksData = marks.map(mark => ({
        studentId: mark.studentId,
        department,
        academicYear,
        semester: parseInt(semester),
        subject,
        subjectName: subjectName || subject,
        internalMarks: mark.internalMarks || 0,
        externalMarks: mark.externalMarks || 0
    }));

    // Bulk upsert
    const result = await StudentMarks.saveDraftBulk(marksData, req.user._id);

    // Log audit
    await MarksAuditLog.logBulkAction(
        { department, academicYear, semester: parseInt(semester), subject },
        'updated',
        req.user._id,
        marks.length
    );

    res.json({
        success: true,
        message: `Draft saved for ${marks.length} students`,
        data: {
            modifiedCount: result.modifiedCount,
            upsertedCount: result.upsertedCount
        }
    });
});

/**
 * @desc    Publish results (lock marks, trigger analytics)
 * @route   POST /api/admin/marks/publish
 * @access  Admin
 */
const publishResults = asyncHandler(async (req, res) => {
    const { department, academicYear, semester, subject, subjectName } = req.body;

    if (!department || !academicYear || !semester || !subject) {
        return res.status(400).json({
            success: false,
            message: 'department, academicYear, semester, and subject are required'
        });
    }

    const semesterNum = parseInt(semester);
    const scope = { department, academicYear, semester: semesterNum, subject, subjectName };

    // Check for draft marks
    const draftCount = await StudentMarks.countDocuments({
        ...scope,
        status: 'draft'
    });

    if (draftCount === 0) {
        return res.status(400).json({
            success: false,
            message: 'No draft marks to publish'
        });
    }

    // Validate all marks before publishing
    const drafts = await StudentMarks.find({ ...scope, status: 'draft' }).lean();
    const errors = validateMarks(drafts);
    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Cannot publish - validation errors exist',
            errors
        });
    }

    // Check for incomplete entries
    const incompleteCount = drafts.filter(d =>
        d.internalMarks === undefined || d.externalMarks === undefined
    ).length;

    if (incompleteCount > 0) {
        return res.status(400).json({
            success: false,
            message: `Cannot publish - ${incompleteCount} students have incomplete marks`
        });
    }

    // PUBLISH (lock records)
    const result = await StudentMarks.publishBulk(scope, req.user._id);

    // Log audit
    await MarksAuditLog.logBulkAction(
        scope,
        'bulk_publish',
        req.user._id,
        result.modifiedCount
    );

    // EMIT EVENT → Trigger analytics computation
    // This is fault-tolerant: analytics failure doesn't affect publish
    emitMarksEvent(MARKS_EVENTS.RESULTS_PUBLISHED, {
        scope,
        adminId: req.user._id,
        publishedCount: result.modifiedCount
    });

    res.json({
        success: true,
        message: `Results published for ${result.modifiedCount} students`,
        data: {
            publishedCount: result.modifiedCount,
            department,
            semester: semesterNum,
            subject
        }
    });
});

/**
 * @desc    Reopen published results for editing
 * @route   POST /api/admin/marks/reopen
 * @access  Admin
 */
const reopenResults = asyncHandler(async (req, res) => {
    const { department, academicYear, semester, subject, reason } = req.body;

    if (!department || !academicYear || !semester || !subject) {
        return res.status(400).json({
            success: false,
            message: 'department, academicYear, semester, and subject are required'
        });
    }

    if (!reason || reason.trim().length < 10) {
        return res.status(400).json({
            success: false,
            message: 'A reason (minimum 10 characters) is required for reopening'
        });
    }

    const scope = { department, academicYear, semester: parseInt(semester), subject };

    // Check for published marks
    const publishedCount = await StudentMarks.countDocuments({
        ...scope,
        status: 'published'
    });

    if (publishedCount === 0) {
        return res.status(400).json({
            success: false,
            message: 'No published marks to reopen'
        });
    }

    // Reopen (unlock records, increment version)
    const result = await StudentMarks.reopenBulk(scope);

    // Log audit with reason
    await MarksAuditLog.logBulkAction(
        scope,
        'bulk_reopen',
        req.user._id,
        result.modifiedCount,
        reason
    );

    // Emit event
    emitMarksEvent(MARKS_EVENTS.RESULTS_REOPENED, {
        scope,
        adminId: req.user._id,
        reason
    });

    res.json({
        success: true,
        message: `Results reopened for ${result.modifiedCount} students`,
        data: {
            reopenedCount: result.modifiedCount
        }
    });
});

/**
 * @desc    Get publish status for a scope
 * @route   GET /api/admin/marks/status
 * @access  Admin
 */
const getPublishStatus = asyncHandler(async (req, res) => {
    const { department, academicYear, semester, subject } = req.query;

    if (!department || !academicYear || !semester || !subject) {
        return res.status(400).json({
            success: false,
            message: 'department, academicYear, semester, and subject are required'
        });
    }

    const scope = { department, academicYear, semester: parseInt(semester), subject };

    const [draftCount, publishedCount, analytics] = await Promise.all([
        StudentMarks.countDocuments({ ...scope, status: 'draft' }),
        StudentMarks.countDocuments({ ...scope, status: 'published' }),
        SimplifiedAnalytics.findOne(scope).select('generatedAt version passPercentage').lean()
    ]);

    res.json({
        success: true,
        data: {
            draftCount,
            publishedCount,
            isPublished: publishedCount > 0,
            isDraft: draftCount > 0 && publishedCount === 0,
            analyticsGenerated: !!analytics,
            analyticsVersion: analytics?.version,
            lastPublished: analytics?.generatedAt
        }
    });
});

/**
 * @desc    Get audit history
 * @route   GET /api/admin/marks/audit
 * @access  Admin
 */
const getAuditHistory = asyncHandler(async (req, res) => {
    const { department, academicYear, semester, subject, limit = 50 } = req.query;

    const scope = { department, academicYear, semester: parseInt(semester), subject };
    const history = await MarksAuditLog.getScopeHistory(scope, parseInt(limit));

    res.json({
        success: true,
        data: history
    });
});

/**
 * @desc    Get filter options (departments, subjects)
 * @route   GET /api/admin/marks/filters
 * @access  Admin
 */
const getFilterOptions = asyncHandler(async (req, res) => {
    const [departments, subjects] = await Promise.all([
        Department.find().select('name code').sort({ name: 1 }).lean(),
        Subject.find().select('name code semester').sort({ semester: 1, name: 1 }).lean()
    ]);

    // Generate academic years (current + 2 previous)
    const currentYear = new Date().getFullYear();
    const month = new Date().getMonth();
    const startYear = month >= 6 ? currentYear : currentYear - 1;

    const academicYears = [
        `${startYear}-${(startYear + 1).toString().slice(2)}`,
        `${startYear - 1}-${startYear.toString().slice(2)}`,
        `${startYear - 2}-${(startYear - 1).toString().slice(2)}`
    ];

    res.json({
        success: true,
        data: {
            departments,
            subjects,
            academicYears,
            semesters: [1, 2, 3, 4, 5, 6, 7, 8]
        }
    });
});

/**
 * @desc    Manually sync StudentPerformance for already published marks
 *          Use when fixing data after initial implementation
 * @route   POST /api/admin/marks/sync-performance
 * @access  Admin
 */
const syncStudentPerformances = asyncHandler(async (req, res) => {
    const { department, academicYear, semester, subject, subjectName } = req.body;

    if (!department || !academicYear || !semester || !subject) {
        return res.status(400).json({
            success: false,
            message: 'department, academicYear, semester, and subject are required'
        });
    }

    const scope = { department, academicYear, semester: parseInt(semester), subject, subjectName };

    // Check for published marks
    const publishedCount = await StudentMarks.countDocuments({
        ...scope,
        status: 'published'
    });

    if (publishedCount === 0) {
        return res.status(400).json({
            success: false,
            message: 'No published marks to sync'
        });
    }

    // Trigger the same event that publish triggers
    // This will recompute analytics AND sync StudentPerformance
    emitMarksEvent(MARKS_EVENTS.RESULTS_PUBLISHED, {
        scope,
        adminId: req.user._id,
        publishedCount,
        isManualSync: true
    });

    res.json({
        success: true,
        message: `Syncing performance data for ${publishedCount} students. Check student dashboard shortly.`,
        data: {
            scope,
            publishedCount
        }
    });
});

module.exports = {
    getStudentsForMarks,
    saveDraft,
    publishResults,
    reopenResults,
    getPublishStatus,
    getAuditHistory,
    getFilterOptions,
    syncStudentPerformances
};
