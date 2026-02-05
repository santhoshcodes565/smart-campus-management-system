/**
 * Academic Analytics Model
 * Pre-computed semester-level analytics per department
 * 
 * CRITICAL: Versioned and immutable - never overwrite, always create new version
 * Supports 100K+ students with fast dashboard reads
 */

const mongoose = require('mongoose');

const topperSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    gpa: {
        type: Number,
        required: true
    },
    rank: {
        type: Number,
        required: true
    }
}, { _id: false });

const gradeDistributionSchema = new mongoose.Schema({
    O: { type: Number, default: 0 },       // >= 90%
    Aplus: { type: Number, default: 0 },   // 80-89%
    A: { type: Number, default: 0 },       // 70-79%
    B: { type: Number, default: 0 },       // 60-69%
    C: { type: Number, default: 0 },       // 50-59%
    D: { type: Number, default: 0 },       // 40-49%
    F: { type: Number, default: 0 }        // < 40%
}, { _id: false });

const academicAnalyticsSchema = new mongoose.Schema({
    // Scope identifiers
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    semester: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    academicYear: {
        type: String,
        required: true  // e.g., "2025-26"
    },

    // ==================== VERSIONING (CRITICAL) ====================
    // Never overwrite - create new versions for regeneration
    version: {
        type: Number,
        required: true,
        default: 1
    },
    isOfficial: {
        type: Boolean,
        default: true  // Only one official version per dept/sem/year
    },

    // ==================== AGGREGATE COUNTS ====================
    totalStudents: {
        type: Number,
        default: 0
    },
    passCount: {
        type: Number,
        default: 0
    },
    failCount: {
        type: Number,
        default: 0
    },
    passPercentage: {
        type: Number,
        default: 0
    },

    // ==================== GPA METRICS ====================
    highestGPA: {
        type: Number,
        default: 0
    },
    averageGPA: {
        type: Number,
        default: 0
    },
    lowestGPA: {
        type: Number,
        default: 0
    },
    medianGPA: {
        type: Number,
        default: 0
    },

    // ==================== TOP PERFORMERS ====================
    // CRITICAL: Only studentId stored - no denormalized data
    toppers: [topperSchema],

    // ==================== GRADE DISTRIBUTION ====================
    gradeDistribution: {
        type: gradeDistributionSchema,
        default: () => ({})
    },

    // ==================== METADATA ====================
    generatedAt: {
        type: Date,
        default: Date.now
    },
    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    triggerSource: {
        type: String,
        enum: ['result_publish', 'manual_regeneration', 'scheduled_job'],
        default: 'result_publish'
    }
}, {
    timestamps: true
});

// ==================== INDEXES (CRITICAL FOR PERFORMANCE) ====================

// Primary lookup index - official analytics for dashboard
academicAnalyticsSchema.index(
    { departmentId: 1, courseId: 1, semester: 1, academicYear: 1, isOfficial: 1 }
);

// Version history lookup
academicAnalyticsSchema.index(
    { departmentId: 1, semester: 1, academicYear: 1, version: -1 }
);

// Academic year filter
academicAnalyticsSchema.index({ academicYear: 1 });

// Generation tracking
academicAnalyticsSchema.index({ generatedAt: -1 });

// ==================== STATIC METHODS ====================

/**
 * Get official analytics for dashboard (read-only)
 */
academicAnalyticsSchema.statics.getOfficialAnalytics = async function (departmentId, semester, academicYear) {
    return this.findOne({
        departmentId,
        semester,
        academicYear,
        isOfficial: true
    }).lean();
};

/**
 * Get next version number for a given scope
 */
academicAnalyticsSchema.statics.getNextVersion = async function (departmentId, courseId, semester, academicYear) {
    const latest = await this.findOne({
        departmentId,
        courseId,
        semester,
        academicYear
    }).sort({ version: -1 }).select('version').lean();

    return latest ? latest.version + 1 : 1;
};

/**
 * Create new version and mark previous as non-official
 */
academicAnalyticsSchema.statics.createNewVersion = async function (analyticsData) {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        // Mark all previous versions as non-official
        await this.updateMany(
            {
                departmentId: analyticsData.departmentId,
                courseId: analyticsData.courseId,
                semester: analyticsData.semester,
                academicYear: analyticsData.academicYear,
                isOfficial: true
            },
            { $set: { isOfficial: false } },
            { session }
        );

        // Get next version
        const version = await this.getNextVersion(
            analyticsData.departmentId,
            analyticsData.courseId,
            analyticsData.semester,
            analyticsData.academicYear
        );

        // Create new official version
        const newAnalytics = await this.create([{
            ...analyticsData,
            version,
            isOfficial: true,
            generatedAt: new Date()
        }], { session });

        await session.commitTransaction();
        return newAnalytics[0];
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

module.exports = mongoose.model('AcademicAnalytics', academicAnalyticsSchema);
