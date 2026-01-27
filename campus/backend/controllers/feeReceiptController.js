const FeeReceipt = require('../models/FeeReceipt');
const StudentFeeLedger = require('../models/StudentFeeLedger');
const Student = require('../models/Student');
const FeeAuditLog = require('../models/FeeAuditLog');
const FeeAccountingService = require('../services/FeeAccountingService');
const asyncHandler = require('express-async-handler');

/**
 * Fee Receipt Controller
 * Manual receipt entry with reversal support
 * 
 * RULES:
 * - No deletion allowed
 * - Corrections via reversal + new entry
 * - All actions logged
 */

// @desc    Create a new receipt
// @route   POST /api/fees/receipts
// @access  Admin
const createReceipt = asyncHandler(async (req, res) => {
    const {
        ledgerId,
        receiptDate,
        amount,
        paymentMode,
        referenceNumber,
        voucherNumber,
        bankDetails,
        allocations,
        remarks
    } = req.body;

    // Validate required fields
    if (!ledgerId || !amount || !paymentMode) {
        res.status(400);
        throw new Error('Ledger ID, amount, and payment mode are required');
    }

    if (amount <= 0) {
        res.status(400);
        throw new Error('Amount must be positive');
    }

    const result = await FeeAccountingService.processReceipt(
        ledgerId,
        {
            receiptDate: receiptDate || new Date(),
            amount,
            paymentMode,
            referenceNumber,
            voucherNumber,
            bankDetails,
            allocations,
            remarks
        },
        req.user,
        { ipAddress: req.ip, userAgent: req.get('User-Agent') }
    );

    res.status(201).json({
        success: true,
        message: `Receipt ${result.receipt.receiptNumber} created successfully`,
        data: {
            receipt: result.receipt,
            newBalance: result.newBalance,
            feeStatus: result.feeStatus
        }
    });
});

// @desc    Get all receipts
// @route   GET /api/fees/receipts
// @access  Admin
const getAllReceipts = asyncHandler(async (req, res) => {
    const {
        startDate,
        endDate,
        paymentMode,
        receiptType,
        isReversed,
        studentId,
        search,
        page = 1,
        limit = 20
    } = req.query;

    const query = {};

    if (startDate || endDate) {
        query.receiptDate = {};
        if (startDate) query.receiptDate.$gte = new Date(startDate);
        if (endDate) query.receiptDate.$lte = new Date(endDate);
    }
    if (paymentMode) query.paymentMode = paymentMode;
    if (receiptType) query.receiptType = receiptType;
    if (isReversed !== undefined) query.isReversed = isReversed === 'true';
    if (studentId) query.studentId = studentId;

    if (search) {
        query.$or = [
            { receiptNumber: { $regex: search, $options: 'i' } },
            { 'studentSnapshot.name': { $regex: search, $options: 'i' } },
            { 'studentSnapshot.rollNo': { $regex: search, $options: 'i' } }
        ];
    }

    const total = await FeeReceipt.countDocuments(query);

    const receipts = await FeeReceipt.find(query)
        .populate({
            path: 'studentId',
            populate: { path: 'userId', select: 'name' }
        })
        .populate('createdBy', 'name')
        .sort({ receiptDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    res.json({
        success: true,
        data: receipts,
        pagination: {
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        }
    });
});

// @desc    Get receipt details
// @route   GET /api/fees/receipts/:id
// @access  Admin
const getReceiptDetails = asyncHandler(async (req, res) => {
    const receipt = await FeeReceipt.findById(req.params.id)
        .populate({
            path: 'studentId',
            populate: [
                { path: 'userId', select: 'name phone' },
                { path: 'departmentId', select: 'name' }
            ]
        })
        .populate('ledgerId')
        .populate('createdBy', 'name')
        .populate('reversalOf')
        .populate('reversedBy');

    if (!receipt) {
        res.status(404);
        throw new Error('Receipt not found');
    }

    res.json({
        success: true,
        data: receipt
    });
});

// @desc    Reverse a receipt
// @route   POST /api/fees/receipts/:id/reverse
// @access  Admin
const reverseReceipt = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    if (!reason) {
        res.status(400);
        throw new Error('Reason for reversal is required');
    }

    const result = await FeeAccountingService.reverseReceipt(
        req.params.id,
        reason,
        req.user,
        { ipAddress: req.ip, userAgent: req.get('User-Agent') }
    );

    res.json({
        success: true,
        message: `Receipt reversed. Reversal receipt: ${result.reversalReceipt.receiptNumber}`,
        data: {
            originalReceipt: result.originalReceipt,
            reversalReceipt: result.reversalReceipt,
            newBalance: result.newBalance,
            feeStatus: result.feeStatus
        }
    });
});

// @desc    Get student's own receipts
// @route   GET /api/fees/student/receipts
// @access  Student
const getStudentOwnReceipts = asyncHandler(async (req, res) => {
    // Get student record for logged-in user
    const student = await Student.findOne({ userId: req.user._id });

    if (!student) {
        res.status(404);
        throw new Error('Student record not found');
    }

    const receipts = await FeeReceipt.find({
        studentId: student._id,
        receiptType: 'PAYMENT',
        isReversed: false
    })
        .populate('ledgerId', 'academicYear semester')
        .sort({ receiptDate: -1 });

    // Calculate totals
    const totalPaid = receipts.reduce((sum, r) => sum + r.amount, 0);

    res.json({
        success: true,
        data: {
            receipts,
            totalPaid,
            receiptCount: receipts.length
        }
    });
});

// @desc    Get receipt by number
// @route   GET /api/fees/receipts/number/:receiptNumber
// @access  Admin
const getReceiptByNumber = asyncHandler(async (req, res) => {
    const receipt = await FeeReceipt.findOne({
        receiptNumber: req.params.receiptNumber.toUpperCase()
    })
        .populate({
            path: 'studentId',
            populate: { path: 'userId', select: 'name' }
        })
        .populate('ledgerId')
        .populate('createdBy', 'name');

    if (!receipt) {
        res.status(404);
        throw new Error('Receipt not found');
    }

    res.json({
        success: true,
        data: receipt
    });
});

// @desc    Get receipts for a specific ledger
// @route   GET /api/fees/receipts/ledger/:ledgerId
// @access  Admin
const getReceiptsByLedger = asyncHandler(async (req, res) => {
    const receipts = await FeeReceipt.find({
        ledgerId: req.params.ledgerId
    })
        .populate('createdBy', 'name')
        .sort({ receiptDate: -1 });

    const activeReceipts = receipts.filter(r => r.receiptType === 'PAYMENT' && !r.isReversed);
    const totalPaid = activeReceipts.reduce((sum, r) => sum + r.amount, 0);

    res.json({
        success: true,
        data: {
            receipts,
            totalPaid,
            activeCount: activeReceipts.length,
            totalCount: receipts.length
        }
    });
});

// @desc    Get today's receipts
// @route   GET /api/fees/receipts/today
// @access  Admin
const getTodayReceipts = asyncHandler(async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const receipts = await FeeReceipt.find({
        receiptDate: { $gte: today, $lt: tomorrow },
        receiptType: 'PAYMENT',
        isReversed: false
    })
        .populate({
            path: 'studentId',
            populate: { path: 'userId', select: 'name' }
        })
        .sort({ createdAt: -1 });

    const totalAmount = receipts.reduce((sum, r) => sum + r.amount, 0);

    // Group by payment mode
    const byMode = receipts.reduce((acc, r) => {
        if (!acc[r.paymentMode]) {
            acc[r.paymentMode] = { count: 0, amount: 0 };
        }
        acc[r.paymentMode].count++;
        acc[r.paymentMode].amount += r.amount;
        return acc;
    }, {});

    res.json({
        success: true,
        data: {
            receipts,
            summary: {
                totalReceipts: receipts.length,
                totalAmount,
                byMode
            }
        }
    });
});

// @desc    Verify a receipt
// @route   PUT /api/fees/receipts/:id/verify
// @access  Admin
const verifyReceipt = asyncHandler(async (req, res) => {
    const receipt = await FeeReceipt.findById(req.params.id);

    if (!receipt) {
        res.status(404);
        throw new Error('Receipt not found');
    }

    if (receipt.isVerified) {
        res.status(400);
        throw new Error('Receipt is already verified');
    }

    if (receipt.isReversed) {
        res.status(400);
        throw new Error('Cannot verify a reversed receipt');
    }

    receipt.isVerified = true;
    receipt.verifiedBy = req.user._id;
    receipt.verifiedAt = new Date();
    await receipt.save();

    // Audit log
    await FeeAuditLog.log({
        action: 'RECEIPT_VERIFIED',
        entityType: 'FeeReceipt',
        entityId: receipt._id,
        entityCode: receipt.receiptNumber,
        performedBy: req.user._id,
        performedByName: req.user.name,
        performedByRole: req.user.role,
        description: `Receipt ${receipt.receiptNumber} verified`,
        receiptNumber: receipt.receiptNumber,
        amount: receipt.amount,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.json({
        success: true,
        message: 'Receipt verified successfully',
        data: receipt
    });
});

module.exports = {
    createReceipt,
    getAllReceipts,
    getReceiptDetails,
    reverseReceipt,
    getStudentOwnReceipts,
    getReceiptByNumber,
    getReceiptsByLedger,
    getTodayReceipts,
    verifyReceipt
};
