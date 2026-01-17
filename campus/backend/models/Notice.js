const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Notice title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    content: {
        type: String,
        required: [true, 'Notice content is required']
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdByRole: {
        type: String,
        enum: ['admin', 'faculty'],
        required: true
    },
    targetAudience: {
        type: String,
        enum: ['all', 'faculty', 'students'],
        default: 'all'
    },
    type: {
        type: String,
        enum: ['global', 'department', 'class', 'individual', 'general', 'academic', 'event', 'holiday', 'exam', 'urgent'],
        default: 'global'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent', 'normal'],
        default: 'medium'
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        default: null
    },
    department: {
        type: String,
        default: ''
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        default: null
    },
    isImportant: {
        type: Boolean,
        default: false
    },
    expiresAt: {
        type: Date,
        default: null
    },
    attachments: [{
        type: String
    }],
    isActive: {
        type: Boolean,
        default: true
    },
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

// Index for efficient querying
noticeSchema.index({ createdBy: 1, createdAt: -1 });
noticeSchema.index({ targetAudience: 1, isActive: 1 });
noticeSchema.index({ expiresAt: 1 });

// Virtual to check if notice is expired
noticeSchema.virtual('isExpired').get(function () {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
});

// Ensure virtuals are included in JSON
noticeSchema.set('toJSON', { virtuals: true });
noticeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Notice', noticeSchema);
