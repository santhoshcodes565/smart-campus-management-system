const mongoose = require('mongoose');

/**
 * AuditLog Model
 * Tracks all administrative actions for accountability
 */
const auditLogSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: [
            'USER_CREATED',
            'USER_UPDATED',
            'USER_DELETED',
            'PASSWORD_RESET',
            'PASSWORD_CHANGED',
            'USER_LOCKED',
            'USER_UNLOCKED',
            'LOGIN_SUCCESS',
            'LOGIN_FAILED',
            'SETTINGS_UPDATED',
            'SYSTEM_CONFIG_UPDATED',
            'ACADEMIC_RULES_UPDATED',
            'POLICY_UPDATED',
            'EXAM_CREATED',
            'EXAM_PUBLISHED',
            'RESULT_PUBLISHED',
            'FEEDBACK_RESOLVED',
            'NOTICE_CREATED',
            'DATA_EXPORTED',
            'OTHER'
        ]
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    performedByRole: {
        type: String,
        enum: ['admin', 'faculty', 'student'],
        required: true
    },
    targetType: {
        type: String,
        enum: ['user', 'student', 'faculty', 'exam', 'result', 'feedback', 'notice', 'settings', 'system'],
        default: 'system'
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    targetName: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
    changes: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    ipAddress: {
        type: String,
        default: ''
    },
    userAgent: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ performedBy: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ performedByRole: 1 });

// Static method to create log entry
auditLogSchema.statics.log = async function (data) {
    return await this.create({
        action: data.action,
        performedBy: data.performedBy,
        performedByRole: data.performedByRole || 'admin',
        targetType: data.targetType || 'system',
        targetId: data.targetId || null,
        targetName: data.targetName || '',
        description: data.description || '',
        changes: data.changes || null,
        ipAddress: data.ipAddress || '',
        userAgent: data.userAgent || ''
    });
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
