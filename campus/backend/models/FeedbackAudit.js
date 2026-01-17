const mongoose = require('mongoose');

/**
 * FeedbackAudit Model - V2
 * Tracks all actions performed on feedback threads for audit trail
 */
const feedbackAuditSchema = new mongoose.Schema({
    // Reference to the thread
    threadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FeedbackThread',
        required: [true, 'Thread ID is required'],
        index: true
    },

    // Action type
    action: {
        type: String,
        enum: [
            'created',          // Thread created
            'reply',            // New message added
            'status_change',    // Status updated
            'priority_change',  // Priority updated
            'deleted',          // Soft deleted
            'reopened',         // Reopened after resolved
            'migrated'          // Migrated from V1
        ],
        required: [true, 'Action type is required']
    },

    // Who performed the action
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Performer is required']
    },
    performedByRole: {
        type: String,
        enum: ['student', 'faculty', 'admin'],
        required: [true, 'Performer role is required']
    },

    // Value tracking for changes
    previousValue: {
        type: String,
        default: null
    },
    newValue: {
        type: String,
        default: null
    },

    // Additional metadata (flexible storage for extra info)
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

// Indexes for faster queries
feedbackAuditSchema.index({ threadId: 1, createdAt: -1 });
feedbackAuditSchema.index({ performedBy: 1 });
feedbackAuditSchema.index({ action: 1 });

// Ensure virtuals are included in JSON output
feedbackAuditSchema.set('toJSON', { virtuals: true });
feedbackAuditSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('FeedbackAudit', feedbackAuditSchema);
