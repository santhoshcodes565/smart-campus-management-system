const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    // Sender information
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Sender ID is required']
    },
    senderRole: {
        type: String,
        enum: ['student', 'faculty'],
        required: [true, 'Sender role is required']
    },

    // Receiver information
    receiverRole: {
        type: String,
        enum: ['admin', 'faculty'],
        required: [true, 'Receiver role is required']
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null  // Null when sending to admin, populated when sending to specific faculty
    },

    // Feedback content
    subject: {
        type: String,
        required: [true, 'Subject is required'],
        trim: true,
        maxlength: [200, 'Subject cannot exceed 200 characters']
    },
    message: {
        type: String,
        required: [true, 'Message is required'],
        trim: true,
        maxlength: [2000, 'Message cannot exceed 2000 characters']
    },
    rating: {
        type: Number,
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5'],
        default: null
    },

    // Status tracking
    status: {
        type: String,
        enum: ['new', 'viewed', 'resolved'],
        default: 'new'
    },

    // Timestamps for status changes
    viewedAt: {
        type: Date,
        default: null
    },
    viewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    resolvedAt: {
        type: Date,
        default: null
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, {
    timestamps: true  // Adds createdAt and updatedAt automatically
});

// Indexes for faster queries
feedbackSchema.index({ senderId: 1 });
feedbackSchema.index({ receiverId: 1 });
feedbackSchema.index({ receiverRole: 1 });
feedbackSchema.index({ status: 1 });
feedbackSchema.index({ createdAt: -1 });

// Virtual for relative time (to be calculated on frontend)
feedbackSchema.virtual('isNew').get(function () {
    return this.status === 'new';
});

// Ensure virtuals are included in JSON output
feedbackSchema.set('toJSON', { virtuals: true });
feedbackSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
