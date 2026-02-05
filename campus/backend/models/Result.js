/**
 * Result Model (Extended)
 * 
 * Academic marks with status-driven workflow:
 * draft → submitted → approved → published → locked
 * 
 * RULES:
 * - Faculty can edit only in DRAFT status
 * - Faculty cannot publish or lock
 * - Admin can approve, reject, publish, lock
 * - LOCKED results are immutable (admin override with audit)
 */

const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },

    // Marks data
    marksObtained: {
        type: Number,
        required: true,
        min: 0
    },
    grade: {
        type: String,
        enum: ['O', 'A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F', 'AB', '-'],
        default: '-'
    },
    percentage: {
        type: Number,
        default: 0
    },
    remarks: {
        type: String,
        default: ''
    },

    // =============================================
    // ACADEMIC CONTROL WORKFLOW
    // =============================================

    // Status lifecycle
    status: {
        type: String,
        enum: ['draft', 'submitted', 'approved', 'published', 'locked'],
        default: 'draft',
        index: true
    },

    // Entry tracking
    enteredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    enteredAt: {
        type: Date,
        default: Date.now
    },

    // Submission tracking
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    submittedAt: {
        type: Date
    },

    // Approval tracking
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    },

    // Publication tracking
    publishedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    publishedAt: {
        type: Date
    },

    // Lock tracking
    lockedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lockedAt: {
        type: Date
    },

    // Rejection tracking
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedAt: {
        type: Date
    },
    rejectionReason: {
        type: String
    },

    // Legacy field for backward compatibility
    isPublished: {
        type: Boolean,
        default: false
    },

    // Faculty who entered marks
    facultyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty'
    }
}, {
    timestamps: true
});

// =============================================
// INDEXES
// =============================================

// Compound unique index - one result per student per exam
resultSchema.index({ examId: 1, studentId: 1 }, { unique: true });

// Status-based queries
resultSchema.index({ status: 1, examId: 1 });
resultSchema.index({ status: 1, facultyId: 1 });

// Publication queries
resultSchema.index({ isPublished: 1, studentId: 1 });

// =============================================
// INSTANCE METHODS
// =============================================

// Check if result can be edited
resultSchema.methods.canEdit = function (userRole) {
    if (userRole === 'admin') {
        // Admin can edit in any non-locked status
        return this.status !== 'locked';
    }
    // Faculty can only edit in draft status
    return this.status === 'draft';
};

// Check if result can be submitted
resultSchema.methods.canSubmit = function () {
    return this.status === 'draft';
};

// Check if result can be approved
resultSchema.methods.canApprove = function () {
    return this.status === 'submitted';
};

// Check if result can be published
resultSchema.methods.canPublish = function () {
    return this.status === 'approved';
};

// Check if result can be locked
resultSchema.methods.canLock = function () {
    return this.status === 'published';
};

// Check if admin override is needed
resultSchema.methods.requiresOverride = function () {
    return this.status === 'locked';
};

// =============================================
// PRE-SAVE HOOKS
// =============================================

// Calculate grade before saving
resultSchema.pre('save', async function (next) {
    if (this.isModified('marksObtained')) {
        const Exam = mongoose.model('Exam');
        const exam = await Exam.findById(this.examId);
        if (exam) {
            this.percentage = ((this.marksObtained / exam.maxMarks) * 100).toFixed(2);

            // Auto-calculate grade (10-point scale)
            const pct = parseFloat(this.percentage);
            if (pct >= 90) this.grade = 'O';
            else if (pct >= 80) this.grade = 'A+';
            else if (pct >= 70) this.grade = 'A';
            else if (pct >= 60) this.grade = 'B+';
            else if (pct >= 55) this.grade = 'B';
            else if (pct >= 50) this.grade = 'C+';
            else if (pct >= 45) this.grade = 'C';
            else if (pct >= 40) this.grade = 'D';
            else this.grade = 'F';
        }
    }

    // Sync isPublished with status for backward compatibility
    if (this.isModified('status')) {
        this.isPublished = ['published', 'locked'].includes(this.status);
    }

    next();
});

// =============================================
// STATIC METHODS
// =============================================

// Get results by status for an exam
resultSchema.statics.getByExamAndStatus = function (examId, status) {
    return this.find({ examId, status })
        .populate('studentId', 'rollNo firstName lastName')
        .sort({ 'studentId.rollNo': 1 })
        .lean();
};

// Bulk status update for exam results
resultSchema.statics.bulkUpdateStatus = async function (examId, newStatus, updateFields = {}) {
    return this.updateMany(
        { examId },
        {
            $set: {
                status: newStatus,
                ...updateFields
            }
        }
    );
};

// Get pending submissions for admin
resultSchema.statics.getPendingApprovals = function (options = {}) {
    const { departmentId, limit = 50 } = options;

    const pipeline = [
        { $match: { status: 'submitted' } },
        {
            $lookup: {
                from: 'exams',
                localField: 'examId',
                foreignField: '_id',
                as: 'exam'
            }
        },
        { $unwind: '$exam' },
        {
            $group: {
                _id: '$examId',
                exam: { $first: '$exam' },
                resultCount: { $sum: 1 },
                submittedAt: { $max: '$submittedAt' }
            }
        },
        { $sort: { submittedAt: -1 } },
        { $limit: limit }
    ];

    return this.aggregate(pipeline);
};

module.exports = mongoose.model('Result', resultSchema);
