const mongoose = require('mongoose');

/**
 * FeedbackMessage Model - V2
 * Represents individual messages within a feedback thread
 */
const feedbackMessageSchema = new mongoose.Schema({
    // Reference to parent thread
    threadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FeedbackThread',
        required: [true, 'Thread ID is required'],
        index: true
    },

    // Sender information
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Sender ID is required']
    },
    senderRole: {
        type: String,
        enum: ['student', 'faculty', 'admin'],
        required: [true, 'Sender role is required']
    },

    // Message content
    message: {
        type: String,
        required: [true, 'Message is required'],
        trim: true,
        maxlength: [2000, 'Message cannot exceed 2000 characters']
    },

    // Attachments (placeholder for future file upload feature)
    attachments: [{
        filename: {
            type: String,
            trim: true
        },
        url: {
            type: String,
            trim: true
        },
        type: {
            type: String,
            trim: true
        },
        size: {
            type: Number
        }
    }],

    // Flag for the first message in a thread
    isInitialMessage: {
        type: Boolean,
        default: false
    },

    // Read tracking (for future notification enhancement)
    readBy: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        readAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Indexes for faster queries
feedbackMessageSchema.index({ threadId: 1, createdAt: 1 });
feedbackMessageSchema.index({ senderId: 1 });

// Ensure virtuals are included in JSON output
feedbackMessageSchema.set('toJSON', { virtuals: true });
feedbackMessageSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('FeedbackMessage', feedbackMessageSchema);
