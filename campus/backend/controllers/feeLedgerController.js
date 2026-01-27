const StudentFeeLedger = require('../models/StudentFeeLedger');
const FeeStructure = require('../models/FeeStructure');
const FeeAuditLog = require('../models/FeeAuditLog');
const Student = require('../models/Student');
const FeeAccountingService = require('../services/FeeAccountingService');
const asyncHandler = require('express-async-handler');

/**
 * Fee Ledger Controller
 * Student fee ledger operations
 */

// @desc    Create student fee ledger
// @route   POST /api/fees/ledgers
// @access  Admin
const createStudentLedger = asyncHandler(async (req, res) => {
    const {
        studentId,
        feeStructureId,
        semester,
        concessionAmount,
        concessionReason,
        dueDate,
        installments,
        optionalHeads
    } = req.body;

    if (!studentId || !feeStructureId) {
        res.status(400);
        throw new Error('Student ID and Fee Structure ID are required');
    }

    const result = await FeeAccountingService.createStudentLedger(
        studentId,
        feeStructureId,
        {
            semester,
            concessionAmount,
            concessionReason,
            dueDate,
            installments,
            optionalHeads
        },
        req.user,
        { ipAddress: req.ip, userAgent: req.get('User-Agent') }
    );

    res.status(201).json({
        success: true,
        message: 'Student fee ledger created successfully',
        data: result.ledger
    });
});

// @desc    Bulk assign fee structure to students
// @route   POST /api/fees/ledgers/bulk-assign
// @access  Admin
const bulkAssignStructure = asyncHandler(async (req, res) => {
    const {
        studentIds,
        feeStructureId,
        semester,
        dueDate,
        installments
    } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        res.status(400);
        throw new Error('At least one student ID is required');
    }

    if (!feeStructureId) {
        res.status(400);
        throw new Error('Fee Structure ID is required');
    }

    const results = await FeeAccountingService.bulkAssignStructure(
        studentIds,
        feeStructureId,
        { semester, dueDate, installments },
        req.user,
        { ipAddress: req.ip, userAgent: req.get('User-Agent') }
    );

    res.json({
        success: true,
        message: `Assigned to ${results.success.length} students. ${results.failed.length} failed.`,
        data: results
    });
});

// @desc    Get all student ledgers
// @route   GET /api/fees/ledgers
// @access  Admin
const getAllLedgers = asyncHandler(async (req, res) => {
    const {
        academicYear,
        semester,
        feeStatus,
        isOverdue,
        agingBucket,
        departmentId,
        courseId,
        search,
        page = 1,
        limit = 20
    } = req.query;

    // Build query
    const query = { isActive: true };

    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = parseInt(semester);
    if (feeStatus) query.feeStatus = feeStatus;
    if (isOverdue !== undefined) query.isOverdue = isOverdue === 'true';
    if (agingBucket) query.agingBucket = agingBucket;

    // Handle department/course filter through student lookup
    let studentIds = null;
    if (departmentId || courseId || search) {
        const studentQuery = {};
        if (departmentId) studentQuery.departmentId = departmentId;
        if (courseId) studentQuery.courseId = courseId;

        let studentFilter = Student.find(studentQuery);

        if (search) {
            studentFilter = studentFilter.populate('userId', 'name');
        }

        const students = await studentFilter;

        if (search) {
            const searchLower = search.toLowerCase();
            const filtered = students.filter(s =>
                s.rollNo?.toLowerCase().includes(searchLower) ||
                s.userId?.name?.toLowerCase().includes(searchLower)
            );
            studentIds = filtered.map(s => s._id);
        } else {
            studentIds = students.map(s => s._id);
        }

        query.studentId = { $in: studentIds };
    }

    const total = await StudentFeeLedger.countDocuments(query);

    const ledgers = await StudentFeeLedger.find(query)
        .populate({
            path: 'studentId',
            populate: [
                { path: 'userId', select: 'name phone' },
                { path: 'departmentId', select: 'name code' },
                { path: 'courseId', select: 'name code' }
            ]
        })
        .populate('feeStructureId', 'name code')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    res.json({
        success: true,
        data: ledgers,
        pagination: {
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        }
    });
});

// @desc    Get single ledger details
// @route   GET /api/fees/ledgers/:id
// @access  Admin
const getLedgerDetails = asyncHandler(async (req, res) => {
    const ledger = await StudentFeeLedger.findById(req.params.id)
        .populate({
            path: 'studentId',
            populate: [
                { path: 'userId', select: 'name phone' },
                { path: 'departmentId', select: 'name code' },
                { path: 'courseId', select: 'name code' }
            ]
        })
        .populate('feeStructureId', 'name code feeHeads');

    if (!ledger) {
        res.status(404);
        throw new Error('Ledger not found');
    }

    // Get receipts for this ledger
    const FeeReceipt = require('../models/FeeReceipt');
    const receipts = await FeeReceipt.find({ ledgerId: ledger._id })
        .sort({ receiptDate: -1 });

    // Get balance info
    const balance = await FeeAccountingService.computeLedgerBalance(ledger._id);

    res.json({
        success: true,
        data: {
            ledger,
            receipts,
            balance
        }
    });
});

// @desc    Get student's own fee ledger
// @route   GET /api/fees/student/ledger
// @access  Student
const getStudentOwnLedger = asyncHandler(async (req, res) => {
    // Get student record for logged-in user
    const student = await Student.findOne({ userId: req.user._id });

    if (!student) {
        res.status(404);
        throw new Error('Student record not found');
    }

    const ledgers = await StudentFeeLedger.find({
        studentId: student._id,
        isActive: true
    })
        .populate('feeStructureId', 'name code')
        .sort({ academicYear: -1, semester: -1 });

    // Get total summary
    const summary = await FeeAccountingService.computeStudentTotalBalance(student._id);

    res.json({
        success: true,
        data: {
            ledgers,
            summary
        }
    });
});

// @desc    Get student's fee summary
// @route   GET /api/fees/student/summary
// @access  Student
const getStudentFeeSummary = asyncHandler(async (req, res) => {
    // Get student record for logged-in user
    const student = await Student.findOne({ userId: req.user._id });

    if (!student) {
        res.status(404);
        throw new Error('Student record not found');
    }

    const summary = await FeeAccountingService.computeStudentTotalBalance(student._id);

    // Get current semester ledger if exists
    const currentLedger = await StudentFeeLedger.findOne({
        studentId: student._id,
        isActive: true,
        isClosed: false
    })
        .sort({ academicYear: -1, semester: -1 })
        .populate('feeStructureId', 'name');

    res.json({
        success: true,
        data: {
            summary,
            currentLedger: currentLedger ? {
                academicYear: currentLedger.academicYear,
                semester: currentLedger.semester,
                structureName: currentLedger.feeStructureId?.name,
                netPayable: currentLedger.netPayable,
                totalPaid: currentLedger.totalPaid,
                outstandingBalance: currentLedger.outstandingBalance,
                feeStatus: currentLedger.feeStatus,
                dueDate: currentLedger.dueDate,
                isOverdue: currentLedger.isOverdue
            } : null
        }
    });
});

// @desc    Get ledger by student ID (Admin)
// @route   GET /api/fees/ledgers/student/:studentId
// @access  Admin
const getLedgersByStudent = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const { academicYear } = req.query;

    const report = await FeeAccountingService.generateStudentLedgerReport(
        studentId,
        academicYear
    );

    res.json({
        success: true,
        data: report
    });
});

// @desc    Close a ledger
// @route   PUT /api/fees/ledgers/:id/close
// @access  Admin
const closeLedger = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    const ledger = await StudentFeeLedger.findById(req.params.id);

    if (!ledger) {
        res.status(404);
        throw new Error('Ledger not found');
    }

    if (ledger.isClosed) {
        res.status(400);
        throw new Error('Ledger is already closed');
    }

    if (ledger.outstandingBalance > 0) {
        res.status(400);
        throw new Error('Cannot close ledger with outstanding balance');
    }

    ledger.isClosed = true;
    ledger.closedAt = new Date();
    ledger.closedReason = reason || 'Fully paid';
    await ledger.save();

    // Audit log
    await FeeAuditLog.log({
        action: 'LEDGER_CLOSED',
        entityType: 'StudentFeeLedger',
        entityId: ledger._id,
        performedBy: req.user._id,
        performedByName: req.user.name,
        performedByRole: req.user.role,
        description: `Ledger closed for student`,
        reason,
        studentId: ledger.studentId,
        academicYear: ledger.academicYear,
        semester: ledger.semester,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.json({
        success: true,
        message: 'Ledger closed successfully',
        data: ledger
    });
});

// @desc    Get academic years list
// @route   GET /api/fees/ledgers/academic-years
// @access  Admin
const getAcademicYears = asyncHandler(async (req, res) => {
    const years = await StudentFeeLedger.distinct('academicYear');

    res.json({
        success: true,
        data: years.sort().reverse()
    });
});

module.exports = {
    createStudentLedger,
    bulkAssignStructure,
    getAllLedgers,
    getLedgerDetails,
    getStudentOwnLedger,
    getStudentFeeSummary,
    getLedgersByStudent,
    closeLedger,
    getAcademicYears
};
