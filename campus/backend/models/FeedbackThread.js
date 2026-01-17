const mongoose = require('mongoose');

/**
 * FeedbackThread Model - V2
 * Represents a conversation thread for feedback
 */
const feedbackThreadSchema = new mongoose.Schema({
    // Thread title/subject
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },

    // Creator information
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Creator is required']
    },
    createdByRole: {
        type: String,
        enum: ['student', 'faculty', 'admin'],
        required: [true, 'Creator role is required']
    },

    // Target information
    targetRole: {
        type: String,
        enum: ['faculty', 'admin'],
        required: [true, 'Target role is required']
    },
    targetUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null  // Null when targeting admin (general), populated for specific faculty
    },

    // Categorization
    type: {
        type: String,
        enum: ['academic', 'technical', 'complaint', 'suggestion', 'general'],
        default: 'general'
    },

    // Priority level
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },

    // Status workflow: open → in_review → waiting_for_user → resolved → closed
    status: {
        type: String,
        enum: ['open', 'in_review', 'waiting_for_user', 'resolved', 'closed'],
        default: 'open'
    },

    // Soft delete
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    // Thread activity tracking
    lastMessageAt: {
        type: Date,
        default: Date.now
    },
    messageCount: {
        type: Number,
        default: 1
    },

    // Migration tracking
    migratedFromV1: {
        type: Boolean,
        default: false
    },
    originalV1Id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    }
}, {
    timestamps: true
});

// Indexes for faster queries
feedbackThreadSchema.index({ createdBy: 1 });
feedbackThreadSchema.index({ targetRole: 1 });
feedbackThreadSchema.index({ targetUserId: 1 });
feedbackThreadSchema.index({ status: 1 });
feedbackThreadSchema.index({ priority: 1 });
feedbackThreadSchema.index({ isDeleted: 1 });
feedbackThreadSchema.index({ createdAt: -1 });
feedbackThreadSchema.index({ lastMessageAt: -1 });

// Compound indexes for common queries
feedbackThreadSchema.index({ createdBy: 1, isDeleted: 1 });
feedbackThreadSchema.index({ targetUserId: 1, isDeleted: 1 });
feedbackThreadSchema.index({ status: 1, priority: 1, isDeleted: 1 });

// Virtual for checking if thread is active (can receive replies)
feedbackThreadSchema.virtual('isActive').get(function () {
    return !['resolved', 'closed'].includes(this.status) && !this.isDeleted;
});

// Ensure virtuals are included in JSON output
feedbackThreadSchema.set('toJSON', { virtuals: true });
feedbackThreadSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('FeedbackThread', feedbackThreadSchema);
