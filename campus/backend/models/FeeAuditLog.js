const mongoose = require('mongoose');

/**
 * FeeAuditLog Model
 * Dedicated audit trail for all fee operations
 * 
 * MANDATORY LOGGING:
 * - Every fee-related action must be logged
 * - Records: Who, When, What changed, Reason
 * - Immutable - no deletions or updates
 */
const feeAuditLogSchema = new mongoose.Schema({
    // Action Type
    action: {
        type: String,
        required: true,
        enum: [
            // Fee Structure Actions
            'STRUCTURE_CREATED',
            'STRUCTURE_UPDATED',
            'STRUCTURE_APPROVED',
            'STRUCTURE_ACTIVATED',
            'STRUCTURE_LOCKED',
            'STRUCTURE_ARCHIVED',
            'STRUCTURE_VERSION_CREATED',

            // Ledger Actions
            'LEDGER_CREATED',
            'LEDGER_ASSIGNED',
            'LEDGER_BULK_ASSIGNED',
            'LEDGER_STATUS_UPDATED',
            'LEDGER_OVERDUE_MARKED',
            'LEDGER_CLOSED',

            // Receipt Actions
            'RECEIPT_CREATED',
            'RECEIPT_REVERSED',
            'RECEIPT_VERIFIED',

            // Report Actions
            'REPORT_GENERATED',
            'REPORT_EXPORTED',
            'DATA_EXPORTED',

            // System Actions
            'OVERDUE_BATCH_PROCESSED',
            'AGING_RECALCULATED',
            'ERROR_OCCURRED'
        ]
    },

    // Entity Reference
    entityType: {
        type: String,
        enum: ['FeeStructure', 'StudentFeeLedger', 'FeeReceipt', 'Report', 'System'],
        required: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    entityCode: {
        type: String,
        default: ''
        // Structure code, receipt number, etc.
    },

    // Who performed the action
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    performedByName: {
        type: String,
        required: true
    },
    performedByRole: {
        type: String,
        required: true,
        enum: ['admin', 'faculty', 'student', 'system']
    },

    // Action Details
    description: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        default: ''
    },

    // Changes Made (before/after snapshot)
    changes: {
        before: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },
        after: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },
        diff: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        }
    },

    // Context Metadata
    metadata: {
        // Student context
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        studentName: {
            type: String,
            default: ''
        },
        studentRollNo: {
            type: String,
            default: ''
        },

        // Financial context
        amount: {
            type: Number,
            default: null
        },
        receiptNumber: {
            type: String,
            default: ''
        },

        // Structure context
        structureCode: {
            type: String,
            default: ''
        },
        academicYear: {
            type: String,
            default: ''
        },
        semester: {
            type: Number,
            default: null
        },

        // Report context
        reportType: {
            type: String,
            default: ''
        },
        dateRange: {
            from: Date,
            to: Date
        },

        // Batch context
        affectedCount: {
            type: Number,
            default: null
        },
        affectedIds: [{
            type: mongoose.Schema.Types.ObjectId
        }]
    },

    // Request Context
    ipAddress: {
        type: String,
        default: ''
    },
    userAgent: {
        type: String,
        default: ''
    },
    requestId: {
        type: String,
        default: ''
    },

    // Status
    status: {
        type: String,
        enum: ['SUCCESS', 'FAILED', 'PARTIAL'],
        default: 'SUCCESS'
    },
    errorMessage: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
feeAuditLogSchema.index({ createdAt: -1 });
feeAuditLogSchema.index({ action: 1, createdAt: -1 });
feeAuditLogSchema.index({ entityType: 1, entityId: 1 });
feeAuditLogSchema.index({ performedBy: 1, createdAt: -1 });
feeAuditLogSchema.index({ 'metadata.studentId': 1 });
feeAuditLogSchema.index({ 'metadata.receiptNumber': 1 });
feeAuditLogSchema.index({ 'metadata.academicYear': 1 });
feeAuditLogSchema.index({ status: 1 });

// CRITICAL: Prevent any modification or deletion
feeAuditLogSchema.pre('remove', function (next) {
    next(new Error('Audit logs cannot be deleted.'));
});

feeAuditLogSchema.pre('deleteOne', function (next) {
    next(new Error('Audit logs cannot be deleted.'));
});

feeAuditLogSchema.pre('deleteMany', function (next) {
    next(new Error('Audit logs cannot be deleted.'));
});

feeAuditLogSchema.pre('save', function (next) {
    // Only allow new documents
    if (!this.isNew) {
        return next(new Error('Audit logs cannot be modified after creation.'));
    }
    next();
});

feeAuditLogSchema.pre('updateOne', function (next) {
    next(new Error('Audit logs cannot be modified.'));
});

feeAuditLogSchema.pre('updateMany', function (next) {
    next(new Error('Audit logs cannot be modified.'));
});

feeAuditLogSchema.pre('findOneAndUpdate', function (next) {
    next(new Error('Audit logs cannot be modified.'));
});

// Static method to create audit log entry
feeAuditLogSchema.statics.log = async function (data) {
    try {
        const logEntry = new this({
            action: data.action,
            entityType: data.entityType,
            entityId: data.entityId || null,
            entityCode: data.entityCode || '',
            performedBy: data.performedBy,
            performedByName: data.performedByName,
            performedByRole: data.performedByRole,
            description: data.description,
            reason: data.reason || '',
            changes: {
                before: data.before || null,
                after: data.after || null,
                diff: data.diff || null
            },
            metadata: {
                studentId: data.studentId || null,
                studentName: data.studentName || '',
                studentRollNo: data.studentRollNo || '',
                amount: data.amount || null,
                receiptNumber: data.receiptNumber || '',
                structureCode: data.structureCode || '',
                academicYear: data.academicYear || '',
                semester: data.semester || null,
                reportType: data.reportType || '',
                dateRange: data.dateRange || null,
                affectedCount: data.affectedCount || null,
                affectedIds: data.affectedIds || []
            },
            ipAddress: data.ipAddress || '',
            userAgent: data.userAgent || '',
            requestId: data.requestId || '',
            status: data.status || 'SUCCESS',
            errorMessage: data.errorMessage || ''
        });

        return await logEntry.save();
    } catch (error) {
        console.error('Failed to create fee audit log:', error);
        // Don't throw - audit logging should not break main operations
        return null;
    }
};

// Static method to log success
feeAuditLogSchema.statics.logSuccess = async function (action, entityType, data) {
    return await this.log({
        action,
        entityType,
        status: 'SUCCESS',
        ...data
    });
};

// Static method to log failure
feeAuditLogSchema.statics.logFailure = async function (action, entityType, error, data) {
    return await this.log({
        action,
        entityType,
        status: 'FAILED',
        errorMessage: error.message || String(error),
        ...data
    });
};

// Static method to get audit trail for an entity
feeAuditLogSchema.statics.getEntityAuditTrail = async function (entityType, entityId, options = {}) {
    const query = { entityType, entityId };

    const limit = options.limit || 100;
    const skip = options.skip || 0;

    return await this.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
};

// Static method to get user activity
feeAuditLogSchema.statics.getUserActivity = async function (userId, options = {}) {
    const query = { performedBy: userId };

    if (options.action) {
        query.action = options.action;
    }
    if (options.startDate || options.endDate) {
        query.createdAt = {};
        if (options.startDate) query.createdAt.$gte = options.startDate;
        if (options.endDate) query.createdAt.$lte = options.endDate;
    }

    const limit = options.limit || 100;
    const skip = options.skip || 0;

    return await this.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
};

// Static method to get action summary
feeAuditLogSchema.statics.getActionSummary = async function (startDate, endDate) {
    return await this.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: startDate,
                    $lte: endDate
                }
            }
        },
        {
            $group: {
                _id: '$action',
                count: { $sum: 1 },
                successCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] }
                },
                failedCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] }
                }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);
};

module.exports = mongoose.model('FeeAuditLog', feeAuditLogSchema);
