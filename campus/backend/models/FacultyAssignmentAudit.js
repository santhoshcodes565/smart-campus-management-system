const mongoose = require('mongoose');

/**
 * FacultyAssignmentAudit Model
 * Tracks ALL changes to faculty subject/class assignments
 * Used for data integrity verification and rollback capability
 */
const facultyAssignmentAuditSchema = new mongoose.Schema({
    facultyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty',
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        enum: ['assigned', 'removed', 'updated', 'cleared', 'bulk_update'],
        required: true
    },
    fieldChanged: {
        type: String,
        enum: ['subjectIds', 'classIds', 'departmentId', 'subjects'],
        required: true
    },
    beforeValue: {
        type: mongoose.Schema.Types.Mixed,
        default: []
    },
    afterValue: {
        type: mongoose.Schema.Types.Mixed,
        default: []
    },
    changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    changedByRole: {
        type: String,
        enum: ['admin', 'system'],
        required: true
    },
    reason: {
        type: String,
        default: ''
    },
    apiEndpoint: {
        type: String,
        default: ''
    },
    ipAddress: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
facultyAssignmentAuditSchema.index({ createdAt: -1 });
facultyAssignmentAuditSchema.index({ facultyId: 1, fieldChanged: 1, createdAt: -1 });

// Static method to log an assignment change
facultyAssignmentAuditSchema.statics.logChange = async function (data) {
    try {
        return await this.create(data);
    } catch (error) {
        console.error('[AUDIT] Failed to log faculty assignment change:', error.message);
        // Don't throw - audit failure should not break main operation
        return null;
    }
};

// Static method to get recent changes for a faculty
facultyAssignmentAuditSchema.statics.getRecentChanges = async function (facultyId, limit = 10) {
    return await this.find({ facultyId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('changedBy', 'name username')
        .populate('facultyId');
};

module.exports = mongoose.model('FacultyAssignmentAudit', facultyAssignmentAuditSchema);
