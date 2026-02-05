const mongoose = require('mongoose');

/**
 * Production-grade Notification Schema
 * Stores notifications with navigation links for click-through functionality
 */
const notificationSchema = new mongoose.Schema({
    // Target user
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true  // Performance: fast lookup by user
    },

    // User role for filtering
    role: {
        type: String,
        enum: ['student', 'faculty', 'admin'],
        required: true,
        index: true
    },

    // Notification content
    title: {
        type: String,
        required: true,
        maxlength: 200
    },

    message: {
        type: String,
        required: true,
        maxlength: 500
    },

    // Notification type for categorization and icons
    type: {
        type: String,
        enum: [
            'leave',           // Leave approval/rejection
            'timetable',       // Timetable updates
            'exam',            // Exam notifications
            'fee',             // Fee reminders
            'attendance',      // Attendance alerts
            'marks',           // Marks published
            'notice',          // General notices
            'feedback',        // Feedback responses
            'system'           // System notifications
        ],
        default: 'system'
    },

    // 🔥 CRITICAL: Navigation link for click-through
    link: {
        type: String,
        default: null  // If null, notification is not clickable
    },

    // Read status
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },

    // Priority for sorting important notifications
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },

    // Reference to related entity (optional)
    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    referenceType: {
        type: String,
        enum: ['Leave', 'Timetable', 'Exam', 'Fee', 'Notice', 'Feedback', null],
        default: null
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ role: 1, createdAt: -1 });

// Virtual for time ago
notificationSchema.virtual('timeAgo').get(function () {
    const now = new Date();
    const diff = now - this.createdAt;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return this.createdAt.toLocaleDateString();
});

// Ensure virtuals are included in JSON
notificationSchema.set('toJSON', { virtuals: true });
notificationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Notification', notificationSchema);
