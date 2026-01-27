const FeeStructure = require('../models/FeeStructure');
const StudentFeeLedger = require('../models/StudentFeeLedger');
const FeeReceipt = require('../models/FeeReceipt');
const FeeAuditLog = require('../models/FeeAuditLog');
const Student = require('../models/Student');
const mongoose = require('mongoose');

/**
 * FeeAccountingService
 * Core accounting calculation engine - SINGLE SOURCE OF TRUTH
 * 
 * Responsibilities:
 * - Real-time balance computation
 * - Fee status determination
 * - Aging bucket calculations
 * - Receipt processing & reversal
 * - Dashboard KPIs
 * - Report generation
 */
class FeeAccountingService {

    // ==================== BALANCE COMPUTATION ====================

    /**
     * Compute student's total balance across all ledgers
     */
    static async computeStudentTotalBalance(studentId) {
        const ledgers = await StudentFeeLedger.find({
            studentId,
            isActive: true,
            isClosed: false
        });

        return ledgers.reduce((acc, ledger) => ({
            totalApproved: acc.totalApproved + ledger.netPayable,
            totalPaid: acc.totalPaid + ledger.totalPaid,
            totalOutstanding: acc.totalOutstanding + ledger.outstandingBalance,
            totalOverdue: acc.totalOverdue + (ledger.isOverdue ? ledger.outstandingBalance : 0)
        }), { totalApproved: 0, totalPaid: 0, totalOutstanding: 0, totalOverdue: 0 });
    }

    /**
     * Compute balance for a specific ledger
     */
    static async computeLedgerBalance(ledgerId) {
        const ledger = await StudentFeeLedger.findById(ledgerId);
        if (!ledger) {
            throw new Error('Ledger not found');
        }

        // Get all active receipts for this ledger
        const receipts = await FeeReceipt.find({
            ledgerId,
            receiptType: 'PAYMENT',
            isReversed: false
        });

        const totalPaid = receipts.reduce((sum, r) => sum + r.amount, 0);
        const outstandingBalance = ledger.netPayable - totalPaid;

        return {
            netPayable: ledger.netPayable,
            totalPaid,
            outstandingBalance,
            isOverdue: ledger.isOverdue,
            feeStatus: this.computeFeeStatus(ledger.netPayable, totalPaid, ledger.dueDate),
            agingBucket: StudentFeeLedger.computeAgingBucket(ledger.dueDate)
        };
    }

    // ==================== STATUS ENGINE ====================

    /**
     * Compute fee status based on payment and due date
     */
    static computeFeeStatus(netPayable, totalPaid, dueDate) {
        const isOverdue = this.isPaymentOverdue(dueDate, totalPaid, netPayable);

        if (totalPaid >= netPayable) {
            return 'PAID';
        }
        if (totalPaid === 0) {
            return isOverdue ? 'OVERDUE' : 'UNPAID';
        }
        return isOverdue ? 'OVERDUE' : 'PARTIALLY_PAID';
    }

    /**
     * Check if payment is overdue
     */
    static isPaymentOverdue(dueDate, totalPaid, netPayable) {
        if (totalPaid >= netPayable) return false;
        if (!dueDate) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);

        return today > due;
    }

    /**
     * Compute aging bucket
     */
    static computeAgingBucket(dueDate) {
        return StudentFeeLedger.computeAgingBucket(dueDate);
    }

    /**
     * Compute overdue days
     */
    static computeOverdueDays(dueDate) {
        return StudentFeeLedger.computeOverdueDays(dueDate);
    }

    // ==================== RECEIPT PROCESSING ====================

    /**
     * Process a new receipt
     */
    static async processReceipt(ledgerId, receiptData, createdBy, requestContext = {}) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Get ledger
            const ledger = await StudentFeeLedger.findById(ledgerId)
                .populate({
                    path: 'studentId',
                    populate: { path: 'userId', select: 'name' }
                })
                .session(session);

            if (!ledger) {
                throw new Error('Ledger not found');
            }
            if (ledger.isClosed) {
                throw new Error('Cannot add receipt to a closed ledger');
            }
            if (ledger.feeStatus === 'PAID') {
                throw new Error('Ledger is already fully paid');
            }

            // Validate amount
            if (receiptData.amount <= 0) {
                throw new Error('Receipt amount must be positive');
            }
            if (receiptData.amount > ledger.outstandingBalance) {
                throw new Error(`Amount exceeds outstanding balance of ${ledger.outstandingBalance}`);
            }

            // Generate receipt number
            const receiptNumber = await FeeReceipt.generateReceiptNumber();

            // Create balance snapshot
            const balanceSnapshot = {
                previousBalance: ledger.outstandingBalance,
                newBalance: ledger.outstandingBalance - receiptData.amount,
                totalPaidBefore: ledger.totalPaid,
                totalPaidAfter: ledger.totalPaid + receiptData.amount
            };

            // Create student snapshot
            const studentSnapshot = {
                name: ledger.studentId?.userId?.name || 'Unknown',
                rollNo: ledger.studentId?.rollNo || '',
                department: ledger.studentId?.department || '',
                course: ledger.studentId?.course || ''
            };

            // Create receipt
            const receipt = new FeeReceipt({
                receiptNumber,
                receiptDate: receiptData.receiptDate || new Date(),
                studentId: ledger.studentId._id,
                ledgerId: ledger._id,
                studentSnapshot,
                amount: receiptData.amount,
                paymentMode: receiptData.paymentMode,
                referenceNumber: receiptData.referenceNumber || '',
                voucherNumber: receiptData.voucherNumber || '',
                bankDetails: receiptData.bankDetails || {},
                allocations: receiptData.allocations || [],
                balanceSnapshot,
                receiptType: 'PAYMENT',
                remarks: receiptData.remarks || '',
                createdBy: createdBy._id,
                createdByName: createdBy.name,
                createdByRole: createdBy.role,
                createdByIP: requestContext.ipAddress || ''
            });

            await receipt.save({ session });

            // Update ledger
            await ledger.updatePaymentStatus(receiptData.amount, receiptData.receiptDate);
            await ledger.save({ session });

            // Create audit log
            await FeeAuditLog.log({
                action: 'RECEIPT_CREATED',
                entityType: 'FeeReceipt',
                entityId: receipt._id,
                entityCode: receiptNumber,
                performedBy: createdBy._id,
                performedByName: createdBy.name,
                performedByRole: createdBy.role,
                description: `Receipt ${receiptNumber} created for ${studentSnapshot.name} - Amount: ₹${receiptData.amount}`,
                studentId: ledger.studentId._id,
                studentName: studentSnapshot.name,
                studentRollNo: studentSnapshot.rollNo,
                amount: receiptData.amount,
                receiptNumber,
                academicYear: ledger.academicYear,
                semester: ledger.semester,
                before: { outstandingBalance: balanceSnapshot.previousBalance },
                after: { outstandingBalance: balanceSnapshot.newBalance },
                ipAddress: requestContext.ipAddress,
                userAgent: requestContext.userAgent
            });

            await session.commitTransaction();

            return {
                success: true,
                receipt,
                newBalance: balanceSnapshot.newBalance,
                feeStatus: ledger.feeStatus
            };

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Reverse a receipt
     */
    static async reverseReceipt(receiptId, reason, reversedBy, requestContext = {}) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Get original receipt
            const originalReceipt = await FeeReceipt.findById(receiptId)
                .populate('studentId')
                .session(session);

            if (!originalReceipt) {
                throw new Error('Receipt not found');
            }
            if (originalReceipt.isReversed) {
                throw new Error('This receipt has already been reversed');
            }
            if (originalReceipt.receiptType === 'REVERSAL') {
                throw new Error('Cannot reverse a reversal receipt');
            }

            // Get ledger
            const ledger = await StudentFeeLedger.findById(originalReceipt.ledgerId).session(session);
            if (!ledger) {
                throw new Error('Associated ledger not found');
            }

            // Generate reversal receipt number
            const reversalReceiptNumber = await FeeReceipt.generateReversalNumber(originalReceipt.receiptNumber);

            // Create balance snapshot for reversal
            const balanceSnapshot = {
                previousBalance: ledger.outstandingBalance,
                newBalance: ledger.outstandingBalance + originalReceipt.amount,
                totalPaidBefore: ledger.totalPaid,
                totalPaidAfter: ledger.totalPaid - originalReceipt.amount
            };

            // Create reversal receipt
            const reversalReceipt = new FeeReceipt({
                receiptNumber: reversalReceiptNumber,
                receiptDate: new Date(),
                studentId: originalReceipt.studentId,
                ledgerId: originalReceipt.ledgerId,
                studentSnapshot: originalReceipt.studentSnapshot,
                amount: originalReceipt.amount,
                paymentMode: originalReceipt.paymentMode,
                referenceNumber: `Reversal of ${originalReceipt.receiptNumber}`,
                allocations: originalReceipt.allocations,
                balanceSnapshot,
                receiptType: 'REVERSAL',
                reversalOf: originalReceipt._id,
                reversalReceiptNumber: originalReceipt.receiptNumber,
                remarks: `Reversal of ${originalReceipt.receiptNumber}. Reason: ${reason}`,
                createdBy: reversedBy._id,
                createdByName: reversedBy.name,
                createdByRole: reversedBy.role,
                createdByIP: requestContext.ipAddress || ''
            });

            await reversalReceipt.save({ session });

            // Mark original as reversed
            await originalReceipt.markAsReversed(reversalReceipt._id, reversalReceiptNumber, reason);

            // Update ledger - reverse the payment
            await ledger.reversePayment(originalReceipt.amount);
            await ledger.save({ session });

            // Create audit log
            await FeeAuditLog.log({
                action: 'RECEIPT_REVERSED',
                entityType: 'FeeReceipt',
                entityId: reversalReceipt._id,
                entityCode: reversalReceiptNumber,
                performedBy: reversedBy._id,
                performedByName: reversedBy.name,
                performedByRole: reversedBy.role,
                description: `Receipt ${originalReceipt.receiptNumber} reversed. New receipt: ${reversalReceiptNumber}. Reason: ${reason}`,
                reason,
                studentId: originalReceipt.studentId,
                studentName: originalReceipt.studentSnapshot?.name,
                studentRollNo: originalReceipt.studentSnapshot?.rollNo,
                amount: originalReceipt.amount,
                receiptNumber: reversalReceiptNumber,
                academicYear: ledger.academicYear,
                semester: ledger.semester,
                before: {
                    originalReceiptNumber: originalReceipt.receiptNumber,
                    outstandingBalance: balanceSnapshot.previousBalance
                },
                after: {
                    reversalReceiptNumber,
                    outstandingBalance: balanceSnapshot.newBalance
                },
                ipAddress: requestContext.ipAddress,
                userAgent: requestContext.userAgent
            });

            await session.commitTransaction();

            return {
                success: true,
                originalReceipt,
                reversalReceipt,
                newBalance: balanceSnapshot.newBalance,
                feeStatus: ledger.feeStatus
            };

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    // ==================== LEDGER MANAGEMENT ====================

    /**
     * Create a student fee ledger from a fee structure
     */
    static async createStudentLedger(studentId, feeStructureId, options, createdBy, requestContext = {}) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Get fee structure
            const structure = await FeeStructure.findById(feeStructureId).session(session);
            if (!structure) {
                throw new Error('Fee structure not found');
            }
            if (structure.status !== 'active' && structure.status !== 'approved') {
                throw new Error('Fee structure must be approved or active');
            }

            // Get student
            const student = await Student.findById(studentId)
                .populate('userId', 'name')
                .session(session);
            if (!student) {
                throw new Error('Student not found');
            }

            // Check for existing ledger
            const existingLedger = await StudentFeeLedger.findOne({
                studentId,
                academicYear: structure.academicYear,
                semester: options.semester || structure.semester
            }).session(session);

            if (existingLedger) {
                throw new Error('A ledger already exists for this student for the specified academic period');
            }

            // Calculate net payable
            const concessionAmount = options.concessionAmount || 0;
            const netPayable = structure.approvedTotal - concessionAmount;

            // Prepare fee heads
            const feeHeads = structure.feeHeads.map(head => ({
                headCode: head.headCode,
                headName: head.headName,
                amount: head.amount,
                isApplicable: !head.isOptional || (options.optionalHeads?.includes(head.headCode)),
                paidAmount: 0
            }));

            // Prepare installments if applicable
            let installments = [];
            let hasInstallments = false;

            if (options.installments && options.installments.length > 0) {
                hasInstallments = true;
                installments = options.installments.map((inst, idx) => ({
                    installmentNo: idx + 1,
                    amount: inst.amount,
                    dueDate: new Date(inst.dueDate),
                    paidAmount: 0,
                    status: 'PENDING',
                    description: inst.description || `Installment ${idx + 1}`
                }));
            }

            // Create ledger
            const ledger = new StudentFeeLedger({
                studentId,
                feeStructureId: structure._id,
                feeStructureVersion: structure.version,
                feeStructureCode: structure.code,
                academicYear: structure.academicYear,
                semester: options.semester || structure.semester,
                feeHeads,
                approvedTotal: structure.approvedTotal,
                concessionAmount,
                concessionReason: options.concessionReason || '',
                netPayable,
                hasInstallments,
                installments,
                dueDate: options.dueDate || (hasInstallments ? installments[0].dueDate : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
                totalPaid: 0,
                outstandingBalance: netPayable,
                feeStatus: 'UNPAID',
                createdBy: createdBy._id,
                createdByName: createdBy.name
            });

            await ledger.save({ session });

            // Lock the fee structure if not already locked
            if (!structure.isLocked) {
                structure.isLocked = true;
                structure.lockedAt = new Date();
                structure.lockedReason = 'Assigned to students';
                structure.updatedBy = createdBy._id;
                await structure.save({ session });
            }

            // Create audit log
            await FeeAuditLog.log({
                action: 'LEDGER_CREATED',
                entityType: 'StudentFeeLedger',
                entityId: ledger._id,
                performedBy: createdBy._id,
                performedByName: createdBy.name,
                performedByRole: createdBy.role,
                description: `Fee ledger created for ${student.userId?.name || 'Unknown'} (${student.rollNo})`,
                studentId,
                studentName: student.userId?.name || '',
                studentRollNo: student.rollNo,
                amount: netPayable,
                structureCode: structure.code,
                academicYear: structure.academicYear,
                semester: options.semester || structure.semester,
                after: {
                    netPayable,
                    dueDate: ledger.dueDate,
                    hasInstallments
                },
                ipAddress: requestContext.ipAddress,
                userAgent: requestContext.userAgent
            });

            await session.commitTransaction();

            return {
                success: true,
                ledger
            };

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Bulk assign fee structure to multiple students
     */
    static async bulkAssignStructure(studentIds, feeStructureId, options, createdBy, requestContext = {}) {
        const results = {
            success: [],
            failed: []
        };

        for (const studentId of studentIds) {
            try {
                const result = await this.createStudentLedger(
                    studentId,
                    feeStructureId,
                    options,
                    createdBy,
                    requestContext
                );
                results.success.push({ studentId, ledgerId: result.ledger._id });
            } catch (error) {
                results.failed.push({ studentId, error: error.message });
            }
        }

        // Log bulk operation
        await FeeAuditLog.log({
            action: 'LEDGER_BULK_ASSIGNED',
            entityType: 'StudentFeeLedger',
            performedBy: createdBy._id,
            performedByName: createdBy.name,
            performedByRole: createdBy.role,
            description: `Bulk ledger assignment: ${results.success.length} succeeded, ${results.failed.length} failed`,
            affectedCount: results.success.length,
            affectedIds: results.success.map(r => r.ledgerId),
            ipAddress: requestContext.ipAddress,
            userAgent: requestContext.userAgent
        });

        return results;
    }

    /**
     * Update overdue status for all active ledgers
     */
    static async updateOverdueStatus() {
        const ledgers = await StudentFeeLedger.find({
            isActive: true,
            isClosed: false,
            feeStatus: { $ne: 'PAID' }
        });

        let updatedCount = 0;

        for (const ledger of ledgers) {
            const wasOverdue = ledger.isOverdue;
            await ledger.updateOverdueStatus();

            if (!wasOverdue && ledger.isOverdue) {
                updatedCount++;

                // Log overdue marking
                await FeeAuditLog.log({
                    action: 'LEDGER_OVERDUE_MARKED',
                    entityType: 'StudentFeeLedger',
                    entityId: ledger._id,
                    performedBy: null, // System action
                    performedByName: 'System',
                    performedByRole: 'system',
                    description: `Ledger marked as overdue - ${ledger.overdueDays} days past due`,
                    studentId: ledger.studentId,
                    amount: ledger.outstandingBalance,
                    academicYear: ledger.academicYear,
                    semester: ledger.semester
                });
            }
        }

        // Log batch processing
        await FeeAuditLog.log({
            action: 'OVERDUE_BATCH_PROCESSED',
            entityType: 'System',
            performedBy: null,
            performedByName: 'System',
            performedByRole: 'system',
            description: `Overdue batch processing completed. ${updatedCount} ledgers newly marked as overdue.`,
            affectedCount: updatedCount
        });

        return { processedCount: ledgers.length, newlyOverdue: updatedCount };
    }

    // ==================== DASHBOARD KPIs ====================

    /**
     * Get dashboard KPIs
     */
    static async getDashboardKPIs(filters = {}) {
        const matchQuery = { isActive: true };

        if (filters.academicYear) {
            matchQuery.academicYear = filters.academicYear;
        }
        if (filters.semester) {
            matchQuery.semester = filters.semester;
        }
        if (filters.departmentId) {
            // Need to join with Student
            const students = await Student.find({ departmentId: filters.departmentId }).select('_id');
            matchQuery.studentId = { $in: students.map(s => s._id) };
        }

        const aggregation = await StudentFeeLedger.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    totalApproved: { $sum: '$netPayable' },
                    totalReceived: { $sum: '$totalPaid' },
                    totalOutstanding: { $sum: '$outstandingBalance' },
                    ledgerCount: { $sum: 1 },
                    paidCount: { $sum: { $cond: [{ $eq: ['$feeStatus', 'PAID'] }, 1, 0] } },
                    unpaidCount: { $sum: { $cond: [{ $eq: ['$feeStatus', 'UNPAID'] }, 1, 0] } },
                    partialCount: { $sum: { $cond: [{ $eq: ['$feeStatus', 'PARTIALLY_PAID'] }, 1, 0] } },
                    overdueCount: { $sum: { $cond: [{ $eq: ['$feeStatus', 'OVERDUE'] }, 1, 0] } },
                    overdueAmount: { $sum: { $cond: ['$isOverdue', '$outstandingBalance', 0] } }
                }
            }
        ]);

        const kpis = aggregation[0] || {
            totalApproved: 0,
            totalReceived: 0,
            totalOutstanding: 0,
            ledgerCount: 0,
            paidCount: 0,
            unpaidCount: 0,
            partialCount: 0,
            overdueCount: 0,
            overdueAmount: 0
        };

        // Calculate collection rate
        kpis.collectionRate = kpis.totalApproved > 0
            ? ((kpis.totalReceived / kpis.totalApproved) * 100).toFixed(2)
            : 0;

        return kpis;
    }

    /**
     * Get aging report
     */
    static async getAgingReport(filters = {}) {
        const matchQuery = {
            isActive: true,
            isClosed: false,
            feeStatus: { $ne: 'PAID' }
        };

        if (filters.academicYear) matchQuery.academicYear = filters.academicYear;

        const aging = await StudentFeeLedger.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$agingBucket',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$outstandingBalance' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Ensure all buckets are represented
        const buckets = ['CURRENT', '1-30_DAYS', '31-60_DAYS', '60+_DAYS'];
        const result = buckets.map(bucket => {
            const found = aging.find(a => a._id === bucket);
            return {
                bucket,
                count: found?.count || 0,
                totalAmount: found?.totalAmount || 0
            };
        });

        return result;
    }

    /**
     * Get department-wise summary
     */
    static async getDepartmentSummary(academicYear) {
        const students = await Student.find({}).populate('departmentId', 'name code');
        const studentDeptMap = {};
        students.forEach(s => {
            studentDeptMap[s._id.toString()] = {
                deptId: s.departmentId?._id,
                deptName: s.departmentId?.name || 'Unknown',
                deptCode: s.departmentId?.code || ''
            };
        });

        const query = { isActive: true };
        if (academicYear) query.academicYear = academicYear;

        const ledgers = await StudentFeeLedger.find(query).lean();

        const deptSummary = {};

        ledgers.forEach(ledger => {
            const deptInfo = studentDeptMap[ledger.studentId?.toString()] || { deptName: 'Unknown', deptCode: '' };
            const key = deptInfo.deptName;

            if (!deptSummary[key]) {
                deptSummary[key] = {
                    department: deptInfo.deptName,
                    code: deptInfo.deptCode,
                    totalApproved: 0,
                    totalReceived: 0,
                    totalOutstanding: 0,
                    totalOverdue: 0,
                    studentCount: 0
                };
            }

            deptSummary[key].totalApproved += ledger.netPayable;
            deptSummary[key].totalReceived += ledger.totalPaid;
            deptSummary[key].totalOutstanding += ledger.outstandingBalance;
            if (ledger.isOverdue) {
                deptSummary[key].totalOverdue += ledger.outstandingBalance;
            }
            deptSummary[key].studentCount++;
        });

        return Object.values(deptSummary);
    }

    /**
     * Get defaulters list
     */
    static async getDefaultersList(filters = {}) {
        const matchQuery = {
            isActive: true,
            isClosed: false,
            isOverdue: true
        };

        if (filters.academicYear) matchQuery.academicYear = filters.academicYear;
        if (filters.semester) matchQuery.semester = filters.semester;
        if (filters.agingBucket) matchQuery.agingBucket = filters.agingBucket;
        if (filters.minAmount) matchQuery.outstandingBalance = { $gte: filters.minAmount };

        const ledgers = await StudentFeeLedger.find(matchQuery)
            .populate({
                path: 'studentId',
                populate: [
                    { path: 'userId', select: 'name phone' },
                    { path: 'departmentId', select: 'name code' },
                    { path: 'courseId', select: 'name code' }
                ]
            })
            .sort({ outstandingBalance: -1 })
            .limit(filters.limit || 100)
            .lean();

        return ledgers.map(ledger => ({
            ledgerId: ledger._id,
            studentId: ledger.studentId?._id,
            studentName: ledger.studentId?.userId?.name || 'Unknown',
            rollNo: ledger.studentId?.rollNo || '',
            phone: ledger.studentId?.userId?.phone || '',
            department: ledger.studentId?.departmentId?.name || '',
            course: ledger.studentId?.courseId?.name || '',
            academicYear: ledger.academicYear,
            semester: ledger.semester,
            netPayable: ledger.netPayable,
            totalPaid: ledger.totalPaid,
            outstandingBalance: ledger.outstandingBalance,
            dueDate: ledger.dueDate,
            overdueDays: ledger.overdueDays,
            agingBucket: ledger.agingBucket
        }));
    }

    // ==================== REPORT GENERATION ====================

    /**
     * Generate student ledger report data
     */
    static async generateStudentLedgerReport(studentId, academicYear) {
        const query = { studentId, isActive: true };
        if (academicYear) query.academicYear = academicYear;

        const ledgers = await StudentFeeLedger.find(query)
            .populate('feeStructureId', 'name code')
            .sort({ academicYear: -1, semester: -1 })
            .lean();

        const student = await Student.findById(studentId)
            .populate('userId', 'name phone')
            .populate('departmentId', 'name')
            .populate('courseId', 'name')
            .lean();

        // Get all receipts for these ledgers
        const ledgerIds = ledgers.map(l => l._id);
        const receipts = await FeeReceipt.find({
            ledgerId: { $in: ledgerIds },
            receiptType: 'PAYMENT',
            isReversed: false
        }).sort({ receiptDate: -1 }).lean();

        return {
            student: {
                name: student?.userId?.name || 'Unknown',
                rollNo: student?.rollNo || '',
                phone: student?.userId?.phone || '',
                department: student?.departmentId?.name || '',
                course: student?.courseId?.name || ''
            },
            ledgers: ledgers.map(ledger => ({
                ...ledger,
                receipts: receipts.filter(r => r.ledgerId.toString() === ledger._id.toString())
            })),
            summary: {
                totalApproved: ledgers.reduce((sum, l) => sum + l.netPayable, 0),
                totalPaid: ledgers.reduce((sum, l) => sum + l.totalPaid, 0),
                totalOutstanding: ledgers.reduce((sum, l) => sum + l.outstandingBalance, 0)
            }
        };
    }

    /**
     * Generate collection summary for a date range
     */
    static async generateCollectionSummary(startDate, endDate, filters = {}) {
        const matchQuery = {
            receiptDate: { $gte: startDate, $lte: endDate },
            receiptType: 'PAYMENT',
            isReversed: false
        };

        const summary = await FeeReceipt.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$receiptDate' } },
                        mode: '$paymentMode'
                    },
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' }
                }
            },
            { $sort: { '_id.date': 1 } }
        ]);

        // Also get daily totals
        const dailyTotals = await FeeReceipt.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$receiptDate' } },
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Grand totals
        const grandTotal = await FeeReceipt.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    totalReceipts: { $sum: 1 },
                    totalAmount: { $sum: '$amount' },
                    avgAmount: { $avg: '$amount' }
                }
            }
        ]);

        return {
            byDateAndMode: summary,
            dailyTotals,
            grandTotal: grandTotal[0] || { totalReceipts: 0, totalAmount: 0, avgAmount: 0 },
            period: { startDate, endDate }
        };
    }
}

module.exports = FeeAccountingService;
