/**
 * Marks Audit Log Model
 * Compliance and recovery tracking for marks changes
 * 
 * RECORDS: create, update, publish, reopen actions
 */

const mongoose = require('mongoose');

const marksAuditLogSchema = new mongoose.Schema({
    // Reference to marks record
    markId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudentMarks',
        index: true
    },

    // Scope (for bulk operations)
    scope: {
        department: String,
        academicYear: String,
        semester: Number,
        subject: String
    },

    // Action type
    action: {
        type: String,
        enum: ['created', 'updated', 'published', 'reopened', 'bulk_publish', 'bulk_reopen'],
        required: true,
        index: true
    },

    // State changes
    previousValues: {
        type: mongoose.Schema.Types.Mixed
    },
    newValues: {
        type: mongoose.Schema.Types.Mixed
    },

    // Actor
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    performedAt: {
        type: Date,
        default: Date.now,
        index: true
    },

    // Reason (required for reopen)
    reason: {
        type: String
    },

    // Count for bulk operations
    affectedCount: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true
});

// ==================== INDEXES ====================

// Audit trail queries
marksAuditLogSchema.index({ performedAt: -1 });
marksAuditLogSchema.index({
    'scope.department': 1,
    'scope.academicYear': 1,
    'scope.semester': 1,
    'scope.subject': 1
});

// ==================== STATIC METHODS ====================

/**
 * Log individual mark action
 */
marksAuditLogSchema.statics.logAction = async function (markId, action, data, adminId) {
    return this.create({
        markId,
        action,
        previousValues: data.previous,
        newValues: data.new,
        performedBy: adminId,
        performedAt: new Date(),
        reason: data.reason
    });
};

/**
 * Log bulk action (publish/reopen)
 */
marksAuditLogSchema.statics.logBulkAction = async function (scope, action, adminId, count, reason) {
    return this.create({
        scope,
        action,
        performedBy: adminId,
        performedAt: new Date(),
        affectedCount: count,
        reason
    });
};

/**
 * Get audit history for a scope
 */
marksAuditLogSchema.statics.getScopeHistory = async function (scope, limit = 50) {
    return this.find({
        'scope.department': scope.department,
        'scope.academicYear': scope.academicYear,
        'scope.semester': scope.semester,
        'scope.subject': scope.subject
    })
        .populate('performedBy', 'name')
        .sort({ performedAt: -1 })
        .limit(limit)
        .lean();
};

module.exports = mongoose.model('MarksAuditLog', marksAuditLogSchema);
