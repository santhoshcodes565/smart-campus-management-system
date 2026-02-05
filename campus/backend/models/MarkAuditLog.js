/**
 * Mark Audit Log Model
 * 
 * Compliance-grade audit trail for all mark changes.
 * Universities require this for regulatory compliance.
 * 
 * Every mark update must be tracked with:
 * - Who made the change
 * - What was changed (old vs new values)
 * - When it happened
 * - Why it was changed (optional reason)
 */

const mongoose = require('mongoose');

const markAuditLogSchema = new mongoose.Schema({
    // Reference to the result being modified
    resultId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Result',
        required: true,
        index: true
    },

    // Associated entities for querying
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true,
        index: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true,
        index: true
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject'
    },

    // Action performed
    action: {
        type: String,
        enum: [
            'create',           // Initial mark entry
            'update',           // Mark edit (draft status)
            'submit',           // Faculty submits for review
            'approve',          // Admin approves
            'reject',           // Admin rejects (back to draft)
            'publish',          // Admin publishes to students
            'lock',             // Admin locks semester
            'admin_override'    // Admin override on locked result
        ],
        required: true,
        index: true
    },

    // Who performed the action
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    performedByRole: {
        type: String,
        enum: ['faculty', 'admin'],
        required: true
    },
    performedByName: {
        type: String  // Denormalized for quick display
    },

    // What changed
    oldValues: {
        marks: Number,
        grade: String,
        status: String,
        percentage: Number
    },
    newValues: {
        marks: Number,
        grade: String,
        status: String,
        percentage: Number
    },

    // Optional reason (required for reject, admin_override)
    reason: {
        type: String,
        default: ''
    },

    // Request metadata for forensics
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    },

    // Timestamp of action
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: false  // We use our own timestamp field
});

// Compound indexes for common queries
markAuditLogSchema.index({ resultId: 1, timestamp: -1 });
markAuditLogSchema.index({ studentId: 1, timestamp: -1 });
markAuditLogSchema.index({ examId: 1, action: 1, timestamp: -1 });
markAuditLogSchema.index({ performedBy: 1, timestamp: -1 });

// Static method: Log a mark change
markAuditLogSchema.statics.logChange = async function (params) {
    const {
        resultId,
        examId,
        studentId,
        subjectId,
        action,
        performedBy,
        performedByRole,
        performedByName,
        oldValues,
        newValues,
        reason,
        ipAddress,
        userAgent
    } = params;

    return this.create({
        resultId,
        examId,
        studentId,
        subjectId,
        action,
        performedBy,
        performedByRole,
        performedByName,
        oldValues,
        newValues,
        reason,
        ipAddress,
        userAgent,
        timestamp: new Date()
    });
};

// Static method: Get audit history for a result
markAuditLogSchema.statics.getResultHistory = function (resultId) {
    return this.find({ resultId })
        .sort({ timestamp: -1 })
        .populate('performedBy', 'name email')
        .lean();
};

// Static method: Get all changes for a student
markAuditLogSchema.statics.getStudentHistory = function (studentId, limit = 100) {
    return this.find({ studentId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate('examId', 'name examType')
        .populate('performedBy', 'name')
        .lean();
};

// Static method: Get recent admin overrides (for audit reports)
markAuditLogSchema.statics.getAdminOverrides = function (startDate, endDate) {
    return this.find({
        action: 'admin_override',
        timestamp: { $gte: startDate, $lte: endDate }
    })
        .sort({ timestamp: -1 })
        .populate('resultId')
        .populate('performedBy', 'name email')
        .populate('studentId', 'rollNo')
        .lean();
};

module.exports = mongoose.model('MarkAuditLog', markAuditLogSchema);
