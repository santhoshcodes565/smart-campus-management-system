const StudentFeeLedger = require('../models/StudentFeeLedger');
const FeeReceipt = require('../models/FeeReceipt');
const FeeAuditLog = require('../models/FeeAuditLog');
const FeeAccountingService = require('../services/FeeAccountingService');
const asyncHandler = require('express-async-handler');

/**
 * Fee Report Controller
 * Compliance-grade reporting and analytics
 */

// @desc    Get executive dashboard KPIs
// @route   GET /api/fees/dashboard
// @access  Admin
const getDashboard = asyncHandler(async (req, res) => {
    const { academicYear, semester, departmentId } = req.query;

    const kpis = await FeeAccountingService.getDashboardKPIs({
        academicYear,
        semester: semester ? parseInt(semester) : null,
        departmentId
    });

    const agingReport = await FeeAccountingService.getAgingReport({ academicYear });

    // Get recent activity
    const recentReceipts = await FeeReceipt.find({
        receiptType: 'PAYMENT',
        isReversed: false
    })
        .populate({
            path: 'studentId',
            populate: { path: 'userId', select: 'name' }
        })
        .sort({ createdAt: -1 })
        .limit(5);

    res.json({
        success: true,
        data: {
            kpis,
            agingReport,
            recentReceipts
        }
    });
});

// @desc    Get aging report
// @route   GET /api/fees/reports/aging
// @access  Admin
const getAgingReport = asyncHandler(async (req, res) => {
    const { academicYear, departmentId, courseId } = req.query;

    const aging = await FeeAccountingService.getAgingReport({ academicYear });

    // Get detailed list for each bucket if requested
    const includeDetails = req.query.details === 'true';

    let detailedAging = null;
    if (includeDetails) {
        detailedAging = {};
        for (const bucket of aging) {
            const ledgers = await StudentFeeLedger.find({
                isActive: true,
                isClosed: false,
                feeStatus: { $ne: 'PAID' },
                agingBucket: bucket.bucket,
                ...(academicYear && { academicYear })
            })
                .populate({
                    path: 'studentId',
                    populate: [
                        { path: 'userId', select: 'name phone' },
                        { path: 'departmentId', select: 'name' }
                    ]
                })
                .sort({ outstandingBalance: -1 })
                .limit(50);

            detailedAging[bucket.bucket] = ledgers;
        }
    }

    // Log report generation
    await FeeAuditLog.log({
        action: 'REPORT_GENERATED',
        entityType: 'Report',
        performedBy: req.user._id,
        performedByName: req.user.name,
        performedByRole: req.user.role,
        description: 'Aging report generated',
        reportType: 'AGING',
        academicYear,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.json({
        success: true,
        data: {
            summary: aging,
            details: detailedAging
        }
    });
});

// @desc    Get department-wise summary
// @route   GET /api/fees/reports/department/:deptId
// @access  Admin
const getDepartmentRegister = asyncHandler(async (req, res) => {
    const { academicYear, semester } = req.query;
    const { deptId } = req.params;

    // Get all students in department
    const Student = require('../models/Student');
    const students = await Student.find({ departmentId: deptId })
        .populate('userId', 'name')
        .lean();

    const studentIds = students.map(s => s._id);

    // Get all ledgers for these students
    const query = {
        studentId: { $in: studentIds },
        isActive: true
    };
    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = parseInt(semester);

    const ledgers = await StudentFeeLedger.find(query)
        .populate({
            path: 'studentId',
            populate: { path: 'userId', select: 'name' }
        })
        .sort({ 'studentId.rollNo': 1 });

    // Calculate department totals
    const totals = ledgers.reduce((acc, ledger) => ({
        totalApproved: acc.totalApproved + ledger.netPayable,
        totalReceived: acc.totalReceived + ledger.totalPaid,
        totalOutstanding: acc.totalOutstanding + ledger.outstandingBalance,
        totalOverdue: acc.totalOverdue + (ledger.isOverdue ? ledger.outstandingBalance : 0),
        studentCount: acc.studentCount + 1
    }), { totalApproved: 0, totalReceived: 0, totalOutstanding: 0, totalOverdue: 0, studentCount: 0 });

    // Log report generation
    await FeeAuditLog.log({
        action: 'REPORT_GENERATED',
        entityType: 'Report',
        performedBy: req.user._id,
        performedByName: req.user.name,
        performedByRole: req.user.role,
        description: 'Department register generated',
        reportType: 'DEPARTMENT_REGISTER',
        academicYear,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.json({
        success: true,
        data: {
            ledgers,
            totals
        }
    });
});

// @desc    Get collection summary
// @route   GET /api/fees/reports/collection
// @access  Admin
const getCollectionSummary = asyncHandler(async (req, res) => {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    if (!startDate || !endDate) {
        res.status(400);
        throw new Error('Start date and end date are required');
    }

    const summary = await FeeAccountingService.generateCollectionSummary(
        new Date(startDate),
        new Date(endDate)
    );

    // Log report generation
    await FeeAuditLog.log({
        action: 'REPORT_GENERATED',
        entityType: 'Report',
        performedBy: req.user._id,
        performedByName: req.user.name,
        performedByRole: req.user.role,
        description: `Collection summary generated for ${startDate} to ${endDate}`,
        reportType: 'COLLECTION_SUMMARY',
        dateRange: { from: new Date(startDate), to: new Date(endDate) },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.json({
        success: true,
        data: summary
    });
});

// @desc    Get defaulters list
// @route   GET /api/fees/reports/defaulters
// @access  Admin
const getDefaultersList = asyncHandler(async (req, res) => {
    const { academicYear, semester, agingBucket, minAmount, limit = 100 } = req.query;

    const defaulters = await FeeAccountingService.getDefaultersList({
        academicYear,
        semester: semester ? parseInt(semester) : null,
        agingBucket,
        minAmount: minAmount ? parseFloat(minAmount) : null,
        limit: parseInt(limit)
    });

    // Log report generation
    await FeeAuditLog.log({
        action: 'REPORT_GENERATED',
        entityType: 'Report',
        performedBy: req.user._id,
        performedByName: req.user.name,
        performedByRole: req.user.role,
        description: `Defaulters list generated - ${defaulters.length} records`,
        reportType: 'DEFAULTERS_LIST',
        academicYear,
        affectedCount: defaulters.length,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.json({
        success: true,
        data: defaulters,
        count: defaulters.length
    });
});

// @desc    Get student ledger report
// @route   GET /api/fees/reports/student/:studentId
// @access  Admin
const getStudentLedgerReport = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const { academicYear } = req.query;

    const report = await FeeAccountingService.generateStudentLedgerReport(
        studentId,
        academicYear
    );

    // Log report generation
    await FeeAuditLog.log({
        action: 'REPORT_GENERATED',
        entityType: 'Report',
        performedBy: req.user._id,
        performedByName: req.user.name,
        performedByRole: req.user.role,
        description: `Student ledger report generated for ${report.student.name}`,
        reportType: 'STUDENT_LEDGER',
        studentId,
        studentName: report.student.name,
        studentRollNo: report.student.rollNo,
        academicYear,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.json({
        success: true,
        data: report
    });
});

// @desc    Export report data
// @route   GET /api/fees/reports/export/:type
// @access  Admin
const exportReport = asyncHandler(async (req, res) => {
    const { type } = req.params;
    const { academicYear, startDate, endDate, format = 'json' } = req.query;

    let data;
    let filename;

    switch (type) {
        case 'ledgers':
            data = await StudentFeeLedger.find({
                isActive: true,
                ...(academicYear && { academicYear })
            })
                .populate({
                    path: 'studentId',
                    populate: { path: 'userId', select: 'name' }
                })
                .lean();
            filename = `fee_ledgers_${academicYear || 'all'}`;
            break;

        case 'receipts':
            const receiptQuery = { receiptType: 'PAYMENT', isReversed: false };
            if (startDate && endDate) {
                receiptQuery.receiptDate = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }
            data = await FeeReceipt.find(receiptQuery)
                .populate({
                    path: 'studentId',
                    populate: { path: 'userId', select: 'name' }
                })
                .lean();
            filename = `fee_receipts_${startDate || 'all'}_${endDate || 'all'}`;
            break;

        case 'defaulters':
            data = await FeeAccountingService.getDefaultersList({
                academicYear,
                limit: 1000
            });
            filename = `defaulters_${academicYear || 'all'}`;
            break;

        case 'aging':
            data = await FeeAccountingService.getAgingReport({ academicYear });
            filename = `aging_report_${academicYear || 'all'}`;
            break;

        case 'department-summary':
            data = await FeeAccountingService.getDepartmentSummary(academicYear);
            filename = `department_summary_${academicYear || 'all'}`;
            break;

        default:
            res.status(400);
            throw new Error('Invalid report type');
    }

    // Log export
    await FeeAuditLog.log({
        action: 'REPORT_EXPORTED',
        entityType: 'Report',
        performedBy: req.user._id,
        performedByName: req.user.name,
        performedByRole: req.user.role,
        description: `${type} report exported in ${format} format`,
        reportType: type.toUpperCase(),
        academicYear,
        dateRange: startDate && endDate ? { from: new Date(startDate), to: new Date(endDate) } : null,
        affectedCount: Array.isArray(data) ? data.length : 1,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });

    if (format === 'csv') {
        // Convert to CSV
        const fields = data.length > 0 ? Object.keys(data[0]) : [];
        let csv = fields.join(',') + '\n';
        data.forEach(row => {
            csv += fields.map(f => {
                const val = row[f];
                if (typeof val === 'object') return JSON.stringify(val);
                return val;
            }).join(',') + '\n';
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
        return res.send(csv);
    }

    res.json({
        success: true,
        data,
        count: Array.isArray(data) ? data.length : 1,
        exportedAt: new Date()
    });
});

// @desc    Get audit logs
// @route   GET /api/fees/reports/audit
// @access  Admin
const getAuditLogs = asyncHandler(async (req, res) => {
    const {
        startDate,
        endDate,
        action,
        entityType,
        performedBy,
        page = 1,
        limit = 50
    } = req.query;

    const query = {};

    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (action) query.action = action;
    if (entityType) query.entityType = entityType;
    if (performedBy) query.performedBy = performedBy;

    const total = await FeeAuditLog.countDocuments(query);

    const logs = await FeeAuditLog.find(query)
        .populate('performedBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    res.json({
        success: true,
        data: logs,
        pagination: {
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        }
    });
});

// @desc    Get summary statistics
// @route   GET /api/fees/reports/summary
// @access  Admin
const getSummaryStats = asyncHandler(async (req, res) => {
    const { academicYear } = req.query;

    // Get overall stats
    const kpis = await FeeAccountingService.getDashboardKPIs({ academicYear });

    // Get department-wise summary
    const departmentSummary = await FeeAccountingService.getDepartmentSummary(academicYear);

    // Get semester-wise summary
    const semesterQuery = { isActive: true };
    if (academicYear) semesterQuery.academicYear = academicYear;

    const semesterSummary = await StudentFeeLedger.aggregate([
        { $match: semesterQuery },
        {
            $group: {
                _id: '$semester',
                totalApproved: { $sum: '$netPayable' },
                totalReceived: { $sum: '$totalPaid' },
                totalOutstanding: { $sum: '$outstandingBalance' },
                studentCount: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    res.json({
        success: true,
        data: {
            overall: kpis,
            byDepartment: departmentSummary,
            bySemester: semesterSummary
        }
    });
});

module.exports = {
    getDashboard,
    getAgingReport,
    getDepartmentRegister,
    getCollectionSummary,
    getDefaultersList,
    getStudentLedgerReport,
    exportReport,
    getAuditLogs,
    getSummaryStats
};
