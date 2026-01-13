const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
    applicantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    applicantType: {
        type: String,
        enum: ['student', 'faculty'],
        required: true
    },
    // Module 8: Request type extension
    requestType: {
        type: String,
        enum: ['leave', 'od', 'certificate', 'general'],
        default: 'leave'
    },
    leaveType: {
        type: String,
        required: true,
        enum: ['sick', 'casual', 'emergency', 'academic', 'personal', 'other']
    },
    fromDate: {
        type: Date,
        required: true
    },
    toDate: {
        type: Date,
        required: true
    },
    reason: {
        type: String,
        required: [true, 'Reason is required']
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    approvalDate: {
        type: Date,
        default: null
    },
    remarks: {
        type: String,
        default: ''
    },
    attachments: [{
        type: String
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Leave', leaveSchema);
