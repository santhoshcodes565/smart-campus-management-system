/**
 * StudentMarks Model
 * Admin-entered marks with draft/published workflow
 * 
 * FLOW: Draft Save → Publish → Lock
 * DESIGN: Simplified, no exam module dependency
 */

const mongoose = require('mongoose');

const studentMarksSchema = new mongoose.Schema({
    // Student reference
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },

    // Scope (denormalized for fast queries)
    department: {
        type: String,
        required: true,
        index: true
    },
    academicYear: {
        type: String,
        required: true,
        index: true
    },
    semester: {
        type: Number,
        required: true,
        min: 1,
        max: 8,
        index: true
    },
    subject: {
        type: String,
        required: true,
        index: true
    },
    subjectName: {
        type: String,
        required: true
    },

    // Marks (Admin entered)
    internalMarks: {
        type: Number,
        required: true,
        min: 0,
        max: 30,
        default: 0
    },
    externalMarks: {
        type: Number,
        required: true,
        min: 0,
        max: 70,
        default: 0
    },
    totalMarks: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },

    // Auto-calculated fields
    grade: {
        type: String,
        enum: ['O', 'A+', 'A', 'B+', 'B', 'C', 'D', 'F', '-'],
        default: '-'
    },
    resultStatus: {
        type: String,
        enum: ['pass', 'fail', 'pending'],
        default: 'pending',
        index: true
    },

    // Workflow status
    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'draft',
        index: true
    },

    // Timestamps
    publishedAt: {
        type: Date
    },
    lockedAt: {
        type: Date
    },

    // Audit fields
    enteredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    publishedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Versioning for reopen/republish
    version: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true
});

// ==================== INDEXES ====================

// Compound index for fetching marks grid
studentMarksSchema.index({ department: 1, academicYear: 1, semester: 1, subject: 1, status: 1 });

// Unique constraint - one mark per student per subject per semester
studentMarksSchema.index(
    { studentId: 1, academicYear: 1, semester: 1, subject: 1 },
    { unique: true }
);

// Analytics query optimization
studentMarksSchema.index({ status: 1, publishedAt: -1 });

// ==================== PRE-SAVE HOOKS ====================

studentMarksSchema.pre('save', function (next) {
    // Auto-calculate total
    this.totalMarks = (this.internalMarks || 0) + (this.externalMarks || 0);

    // Auto-calculate grade
    const total = this.totalMarks;
    if (total >= 90) this.grade = 'O';
    else if (total >= 80) this.grade = 'A+';
    else if (total >= 70) this.grade = 'A';
    else if (total >= 60) this.grade = 'B+';
    else if (total >= 55) this.grade = 'B';
    else if (total >= 50) this.grade = 'C';
    else if (total >= 40) this.grade = 'D';
    else this.grade = 'F';

    // Auto-calculate result status
    this.resultStatus = total >= 40 ? 'pass' : 'fail';

    next();
});

// ==================== STATIC METHODS ====================

/**
 * Get marks grid for admin entry
 */
studentMarksSchema.statics.getMarksGrid = async function (filters) {
    const { department, academicYear, semester, subject } = filters;

    return this.find({
        department,
        academicYear,
        semester: parseInt(semester),
        subject
    })
        .populate('studentId', 'rollNo userId')
        .populate({
            path: 'studentId',
            populate: { path: 'userId', select: 'name' }
        })
        .sort({ 'studentId.rollNo': 1 })
        .lean();
};

/**
 * Save draft marks (bulk)
 */
studentMarksSchema.statics.saveDraftBulk = async function (marksArray, adminId) {
    const bulkOps = marksArray.map(mark => ({
        updateOne: {
            filter: {
                studentId: mark.studentId,
                academicYear: mark.academicYear,
                semester: mark.semester,
                subject: mark.subject
            },
            update: {
                $set: {
                    ...mark,
                    status: 'draft',
                    enteredBy: adminId,
                    updatedAt: new Date()
                },
                $setOnInsert: {
                    createdAt: new Date()
                }
            },
            upsert: true
        }
    }));

    return this.bulkWrite(bulkOps, { ordered: false });
};

/**
 * Publish marks (bulk lock)
 */
studentMarksSchema.statics.publishBulk = async function (scope, adminId) {
    const now = new Date();

    return this.updateMany(
        {
            department: scope.department,
            academicYear: scope.academicYear,
            semester: scope.semester,
            subject: scope.subject,
            status: 'draft'
        },
        {
            $set: {
                status: 'published',
                publishedAt: now,
                lockedAt: now,
                publishedBy: adminId
            }
        }
    );
};

/**
 * Reopen published marks
 */
studentMarksSchema.statics.reopenBulk = async function (scope) {
    return this.updateMany(
        {
            department: scope.department,
            academicYear: scope.academicYear,
            semester: scope.semester,
            subject: scope.subject,
            status: 'published'
        },
        {
            $set: {
                status: 'draft',
                lockedAt: null
            },
            $inc: { version: 1 }
        }
    );
};

/**
 * Get published marks for analytics
 */
studentMarksSchema.statics.getPublishedForAnalytics = async function (scope) {
    return this.find({
        department: scope.department,
        academicYear: scope.academicYear,
        semester: scope.semester,
        subject: scope.subject,
        status: 'published'
    }).select('totalMarks grade resultStatus').lean();
};

module.exports = mongoose.model('StudentMarks', studentMarksSchema);
