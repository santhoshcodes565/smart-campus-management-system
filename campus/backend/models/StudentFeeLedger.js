const mongoose = require('mongoose');

/**
 * StudentFeeLedger Model
 * LEGAL RECORD - Immutable student fee ledger
 * 
 * GOVERNANCE RULES:
 * - This ledger is IMMUTABLE once created
 * - Single source of truth for student fees
 * - Required for audits
 * - Fee status computed in real-time based on payments
 */
const studentFeeLedgerSchema = new mongoose.Schema({
    // Student Reference
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: [true, 'Student ID is required']
    },

    // Fee Structure Reference (snapshot at time of assignment)
    feeStructureId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FeeStructure',
        required: [true, 'Fee structure ID is required']
    },
    feeStructureVersion: {
        type: Number,
        required: true
    },
    feeStructureCode: {
        type: String,
        required: true
    },

    // Academic Period
    academicYear: {
        type: String,
        required: [true, 'Academic year is required']
    },
    semester: {
        type: Number,
        required: [true, 'Semester is required'],
        min: 1,
        max: 8
    },

    // Fee Details (snapshot from structure - IMMUTABLE after creation)
    feeHeads: [{
        headCode: {
            type: String,
            required: true
        },
        headName: {
            type: String,
            required: true
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        isApplicable: {
            type: Boolean,
            default: true
        },
        paidAmount: {
            type: Number,
            default: 0
        }
    }],

    // Financial Totals
    approvedTotal: {
        type: Number,
        required: true,
        min: 0
    },
    concessionAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    concessionReason: {
        type: String,
        default: ''
    },
    netPayable: {
        type: Number,
        required: true,
        min: 0
    },

    // Installment Schedule (optional)
    hasInstallments: {
        type: Boolean,
        default: false
    },
    installments: [{
        installmentNo: {
            type: Number,
            required: true
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        dueDate: {
            type: Date,
            required: true
        },
        paidAmount: {
            type: Number,
            default: 0
        },
        paidDate: {
            type: Date,
            default: null
        },
        status: {
            type: String,
            enum: ['PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'],
            default: 'PENDING'
        },
        description: {
            type: String,
            default: ''
        }
    }],

    // Primary Due Date (if no installments)
    dueDate: {
        type: Date,
        required: true
    },

    // Payment Status (computed fields - updated by service)
    totalPaid: {
        type: Number,
        default: 0,
        min: 0
    },
    outstandingBalance: {
        type: Number,
        default: 0
    },
    feeStatus: {
        type: String,
        enum: ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'],
        default: 'UNPAID'
    },
    lastPaymentDate: {
        type: Date,
        default: null
    },
    lastPaymentAmount: {
        type: Number,
        default: 0
    },

    // Overdue Tracking
    isOverdue: {
        type: Boolean,
        default: false
    },
    overdueSince: {
        type: Date,
        default: null
    },
    overdueDays: {
        type: Number,
        default: 0
    },
    agingBucket: {
        type: String,
        enum: ['CURRENT', '1-30_DAYS', '31-60_DAYS', '60+_DAYS'],
        default: 'CURRENT'
    },

    // Governance
    ledgerCreatedDate: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isClosed: {
        type: Boolean,
        default: false
    },
    closedAt: {
        type: Date,
        default: null
    },
    closedReason: {
        type: String,
        default: ''
    },

    // Receipt Count (for quick reference)
    receiptCount: {
        type: Number,
        default: 0
    },

    // Audit
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdByName: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Compound index for unique ledger per student per academic period
studentFeeLedgerSchema.index(
    { studentId: 1, academicYear: 1, semester: 1 },
    { unique: true }
);

// Additional indexes for queries
studentFeeLedgerSchema.index({ feeStatus: 1, isActive: 1 });
studentFeeLedgerSchema.index({ agingBucket: 1, isOverdue: 1 });
studentFeeLedgerSchema.index({ academicYear: 1, semester: 1 });
studentFeeLedgerSchema.index({ feeStructureId: 1 });
studentFeeLedgerSchema.index({ dueDate: 1 });

// Pre-save: Calculate outstanding balance
studentFeeLedgerSchema.pre('save', function (next) {
    this.outstandingBalance = this.netPayable - this.totalPaid;

    // Update fee status
    if (this.totalPaid === 0) {
        this.feeStatus = this.isOverdue ? 'OVERDUE' : 'UNPAID';
    } else if (this.totalPaid >= this.netPayable) {
        this.feeStatus = 'PAID';
        this.outstandingBalance = 0;
    } else {
        this.feeStatus = this.isOverdue ? 'OVERDUE' : 'PARTIALLY_PAID';
    }

    next();
});

// CRITICAL: Prevent deletion of ledgers
studentFeeLedgerSchema.pre('remove', function (next) {
    next(new Error('Student fee ledgers cannot be deleted. This is an audit requirement.'));
});

studentFeeLedgerSchema.pre('deleteOne', function (next) {
    next(new Error('Student fee ledgers cannot be deleted. This is an audit requirement.'));
});

studentFeeLedgerSchema.pre('deleteMany', function (next) {
    next(new Error('Student fee ledgers cannot be deleted. This is an audit requirement.'));
});

// Static method to compute aging bucket
studentFeeLedgerSchema.statics.computeAgingBucket = function (dueDate) {
    if (!dueDate) return 'CURRENT';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    if (due >= today) {
        return 'CURRENT';
    }

    const diffTime = today - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 30) return '1-30_DAYS';
    if (diffDays <= 60) return '31-60_DAYS';
    return '60+_DAYS';
};

// Static method to compute overdue days
studentFeeLedgerSchema.statics.computeOverdueDays = function (dueDate) {
    if (!dueDate) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    if (due >= today) return 0;

    const diffTime = today - due;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Instance method to update payment status
studentFeeLedgerSchema.methods.updatePaymentStatus = async function (paymentAmount, paymentDate) {
    this.totalPaid += paymentAmount;
    this.lastPaymentDate = paymentDate || new Date();
    this.lastPaymentAmount = paymentAmount;
    this.receiptCount += 1;

    // Recalculate outstanding
    this.outstandingBalance = this.netPayable - this.totalPaid;

    // Update status
    if (this.totalPaid >= this.netPayable) {
        this.feeStatus = 'PAID';
        this.isOverdue = false;
        this.outstandingBalance = 0;
    } else if (this.totalPaid > 0) {
        this.feeStatus = this.isOverdue ? 'OVERDUE' : 'PARTIALLY_PAID';
    }

    return await this.save();
};

// Instance method to reverse payment (for receipt reversals)
studentFeeLedgerSchema.methods.reversePayment = async function (reversalAmount) {
    this.totalPaid = Math.max(0, this.totalPaid - reversalAmount);
    this.outstandingBalance = this.netPayable - this.totalPaid;

    // Recalculate overdue status
    const overdueDays = this.constructor.computeOverdueDays(this.dueDate);
    this.isOverdue = overdueDays > 0 && this.totalPaid < this.netPayable;
    this.overdueDays = overdueDays;
    this.agingBucket = this.constructor.computeAgingBucket(this.dueDate);

    // Update status
    if (this.totalPaid === 0) {
        this.feeStatus = this.isOverdue ? 'OVERDUE' : 'UNPAID';
    } else if (this.totalPaid >= this.netPayable) {
        this.feeStatus = 'PAID';
    } else {
        this.feeStatus = this.isOverdue ? 'OVERDUE' : 'PARTIALLY_PAID';
    }

    return await this.save();
};

// Instance method to update overdue status
studentFeeLedgerSchema.methods.updateOverdueStatus = async function () {
    if (this.feeStatus === 'PAID' || this.isClosed) {
        this.isOverdue = false;
        this.overdueDays = 0;
        this.agingBucket = 'CURRENT';
    } else {
        const overdueDays = this.constructor.computeOverdueDays(this.dueDate);
        this.isOverdue = overdueDays > 0;
        this.overdueDays = overdueDays;
        this.agingBucket = this.constructor.computeAgingBucket(this.dueDate);

        if (this.isOverdue && !this.overdueSince) {
            this.overdueSince = this.dueDate;
        }

        // Update status if overdue
        if (this.isOverdue && this.feeStatus !== 'PAID') {
            this.feeStatus = 'OVERDUE';
        }
    }

    return await this.save();
};

module.exports = mongoose.model('StudentFeeLedger', studentFeeLedgerSchema);
