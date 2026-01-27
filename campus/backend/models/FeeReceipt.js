const mongoose = require('mongoose');

/**
 * FeeReceipt Model
 * Manual receipt entry - IMMUTABLE, no deletions allowed
 * 
 * CONTROL RULES:
 * - No receipt deletion allowed
 * - Corrections require reversal + new entry
 * - All actions logged permanently
 * - Receipt numbers are unique and auditable
 */
const feeReceiptSchema = new mongoose.Schema({
    // Receipt Identification
    receiptNumber: {
        type: String,
        required: [true, 'Receipt number is required'],
        unique: true,
        uppercase: true,
        trim: true
        // Format: RCP-{YYYYMMDD}-{SEQUENCE} e.g., "RCP-20250127-0001"
    },
    receiptDate: {
        type: Date,
        required: [true, 'Receipt date is required']
    },

    // Student & Ledger References
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: [true, 'Student ID is required']
    },
    ledgerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudentFeeLedger',
        required: [true, 'Ledger ID is required']
    },

    // Student Info Snapshot (for historical records)
    studentSnapshot: {
        name: String,
        rollNo: String,
        department: String,
        course: String
    },

    // Payment Details
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0, 'Amount cannot be negative']
    },
    paymentMode: {
        type: String,
        enum: ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'DD', 'OTHER'],
        required: [true, 'Payment mode is required']
    },
    referenceNumber: {
        type: String,
        default: ''
        // Cheque number, DD number, bank transaction reference
    },
    voucherNumber: {
        type: String,
        default: ''
    },
    bankDetails: {
        bankName: { type: String, default: '' },
        branchName: { type: String, default: '' },
        accountNumber: { type: String, default: '' }
    },

    // Fee Head Allocation (how the payment is distributed)
    allocations: [{
        headCode: {
            type: String,
            required: true
        },
        headName: {
            type: String,
            required: true
        },
        allocatedAmount: {
            type: Number,
            required: true,
            min: 0
        }
    }],

    // Ledger Snapshot (balance at time of receipt)
    balanceSnapshot: {
        previousBalance: { type: Number, default: 0 },
        newBalance: { type: Number, default: 0 },
        totalPaidBefore: { type: Number, default: 0 },
        totalPaidAfter: { type: Number, default: 0 }
    },

    // Receipt Type
    receiptType: {
        type: String,
        enum: ['PAYMENT', 'REVERSAL'],
        default: 'PAYMENT'
    },

    // Reversal References
    reversalOf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FeeReceipt',
        default: null
        // For REVERSAL type: reference to the original receipt being reversed
    },
    reversalReceiptNumber: {
        type: String,
        default: ''
    },
    isReversed: {
        type: Boolean,
        default: false
    },
    reversedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FeeReceipt',
        default: null
        // For PAYMENT type that was reversed: reference to the reversal receipt
    },
    reversedReceiptNumber: {
        type: String,
        default: ''
    },
    reversedAt: {
        type: Date,
        default: null
    },
    reversalReason: {
        type: String,
        default: ''
    },

    // Remarks
    remarks: {
        type: String,
        default: '',
        maxlength: 500
    },

    // Verification Status
    isVerified: {
        type: Boolean,
        default: false
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    verifiedAt: {
        type: Date,
        default: null
    },

    // Audit Trail
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdByName: {
        type: String,
        required: true
    },
    createdByRole: {
        type: String,
        required: true
    },
    createdByIP: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Indexes
feeReceiptSchema.index({ receiptNumber: 1 });
feeReceiptSchema.index({ studentId: 1, receiptDate: -1 });
feeReceiptSchema.index({ ledgerId: 1, createdAt: -1 });
feeReceiptSchema.index({ receiptDate: 1 });
feeReceiptSchema.index({ receiptType: 1, isReversed: 1 });
feeReceiptSchema.index({ paymentMode: 1 });
feeReceiptSchema.index({ createdAt: -1 });

// CRITICAL: Prevent deletion of receipts
feeReceiptSchema.pre('remove', function (next) {
    next(new Error('Receipts cannot be deleted. Use reversal entry for corrections.'));
});

feeReceiptSchema.pre('deleteOne', function (next) {
    next(new Error('Receipts cannot be deleted. Use reversal entry for corrections.'));
});

feeReceiptSchema.pre('deleteMany', function (next) {
    next(new Error('Receipts cannot be deleted. Use reversal entry for corrections.'));
});

// Prevent modification of critical fields after creation
feeReceiptSchema.pre('save', function (next) {
    if (!this.isNew) {
        const immutableFields = [
            'receiptNumber', 'receiptDate', 'studentId', 'ledgerId',
            'amount', 'paymentMode', 'receiptType', 'reversalOf',
            'allocations', 'createdBy', 'createdByName', 'createdByRole'
        ];

        const modifiedPaths = this.modifiedPaths();

        // Allow only these fields to be modified
        const allowedModifications = [
            'isReversed', 'reversedBy', 'reversedReceiptNumber', 'reversedAt',
            'reversalReason', 'isVerified', 'verifiedBy', 'verifiedAt',
            'updatedAt'
        ];

        for (const path of modifiedPaths) {
            if (immutableFields.includes(path)) {
                return next(new Error(`Cannot modify immutable field: ${path}`));
            }
        }
    }
    next();
});

// Static method to generate receipt number
feeReceiptSchema.statics.generateReceiptNumber = async function (prefix = 'RCP') {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    // Find the last receipt number for today
    const lastReceipt = await this.findOne({
        receiptNumber: new RegExp(`^${prefix}-${dateStr}-`)
    }).sort({ receiptNumber: -1 });

    let sequence = 1;
    if (lastReceipt) {
        const lastSequence = parseInt(lastReceipt.receiptNumber.split('-').pop(), 10);
        sequence = lastSequence + 1;
    }

    return `${prefix}-${dateStr}-${sequence.toString().padStart(4, '0')}`;
};

// Static method to generate reversal receipt number
feeReceiptSchema.statics.generateReversalNumber = async function (originalReceiptNumber) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    // Find existing reversals for this receipt
    const existingReversals = await this.countDocuments({
        reversalReceiptNumber: originalReceiptNumber
    });

    const suffix = existingReversals > 0 ? `-R${existingReversals + 1}` : '-R1';
    return `REV-${dateStr}${suffix}`;
};

// Instance method to mark as reversed
feeReceiptSchema.methods.markAsReversed = async function (reversalReceiptId, reversalReceiptNumber, reason) {
    if (this.isReversed) {
        throw new Error('This receipt has already been reversed');
    }
    if (this.receiptType === 'REVERSAL') {
        throw new Error('Cannot reverse a reversal receipt');
    }

    this.isReversed = true;
    this.reversedBy = reversalReceiptId;
    this.reversedReceiptNumber = reversalReceiptNumber;
    this.reversedAt = new Date();
    this.reversalReason = reason;

    return await this.save();
};

// Virtual for effective amount (negative for reversals)
feeReceiptSchema.virtual('effectiveAmount').get(function () {
    if (this.receiptType === 'REVERSAL') {
        return -this.amount;
    }
    if (this.isReversed) {
        return 0; // Reversed payments have no effect
    }
    return this.amount;
});

// Virtual for display status
feeReceiptSchema.virtual('displayStatus').get(function () {
    if (this.isReversed) return 'REVERSED';
    if (this.receiptType === 'REVERSAL') return 'REVERSAL';
    if (this.isVerified) return 'VERIFIED';
    return 'ACTIVE';
});

// Enable virtuals in JSON
feeReceiptSchema.set('toJSON', { virtuals: true });
feeReceiptSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('FeeReceipt', feeReceiptSchema);
