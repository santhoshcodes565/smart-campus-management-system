/**
 * Simplified Academic Analytics Model
 * Pre-computed metrics for sub-200ms dashboard reads
 * 
 * DESIGN: Lean metrics, no standardDeviation
 * VERSIONED: Increments on republish for audit trail
 */

const mongoose = require('mongoose');

const gradeDistributionSchema = new mongoose.Schema({
    O: { type: Number, default: 0 },
    Aplus: { type: Number, default: 0 },
    A: { type: Number, default: 0 },
    Bplus: { type: Number, default: 0 },
    B: { type: Number, default: 0 },
    C: { type: Number, default: 0 },
    D: { type: Number, default: 0 },
    F: { type: Number, default: 0 }
}, { _id: false });

const simplifiedAnalyticsSchema = new mongoose.Schema({
    // Scope (compound unique)
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
        index: true
    },
    subject: {
        type: String,
        required: true,
        index: true
    },
    subjectName: {
        type: String
    },

    // Core Metrics
    totalStudents: {
        type: Number,
        default: 0
    },
    appearedStudents: {
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

    // Statistical Metrics (no standardDeviation - lean)
    averageMarks: {
        type: Number,
        default: 0
    },
    medianScore: {
        type: Number,
        default: 0
    },
    highestScore: {
        type: Number,
        default: 0
    },
    lowestScore: {
        type: Number,
        default: 0
    },

    // Advanced Metrics
    distinctionCount: {
        type: Number,
        default: 0
    },
    atRiskCount: {
        type: Number,
        default: 0
    },
    difficultyIndex: {
        type: Number,
        default: 0,
        min: 0,
        max: 1
    },

    // Grade Histogram
    gradeDistribution: {
        type: gradeDistributionSchema,
        default: () => ({})
    },

    // Metadata
    generatedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    computeDurationMs: {
        type: Number,
        default: 0
    },

    // Versioning (increments on republish)
    version: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true
});

// ==================== INDEXES (Critical for < 150ms) ====================

// Primary lookup - Dashboard queries
simplifiedAnalyticsSchema.index(
    { department: 1, academicYear: 1, semester: 1, subject: 1 },
    { unique: true }
);

// Overview queries
simplifiedAnalyticsSchema.index({ academicYear: 1, semester: 1 });

// Recent analytics
simplifiedAnalyticsSchema.index({ generatedAt: -1 });

// ==================== STATIC METHODS ====================

/**
 * Get dashboard overview (aggregated across subjects)
 */
simplifiedAnalyticsSchema.statics.getDashboardOverview = async function (filters = {}) {
    const match = {};
    if (filters.department) match.department = filters.department;
    if (filters.academicYear) match.academicYear = filters.academicYear;
    if (filters.semester) match.semester = parseInt(filters.semester);

    const result = await this.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                totalStudents: { $sum: '$totalStudents' },
                totalPassed: { $sum: '$passCount' },
                totalFailed: { $sum: '$failCount' },
                avgPassPercentage: { $avg: '$passPercentage' },
                avgMarks: { $avg: '$averageMarks' },
                maxScore: { $max: '$highestScore' },
                minScore: { $min: '$lowestScore' },
                totalDistinction: { $sum: '$distinctionCount' },
                totalAtRisk: { $sum: '$atRiskCount' },
                subjectCount: { $sum: 1 },
                gradeO: { $sum: '$gradeDistribution.O' },
                gradeAplus: { $sum: '$gradeDistribution.Aplus' },
                gradeA: { $sum: '$gradeDistribution.A' },
                gradeBplus: { $sum: '$gradeDistribution.Bplus' },
                gradeB: { $sum: '$gradeDistribution.B' },
                gradeC: { $sum: '$gradeDistribution.C' },
                gradeD: { $sum: '$gradeDistribution.D' },
                gradeF: { $sum: '$gradeDistribution.F' }
            }
        }
    ]);

    if (result.length === 0) {
        return null;
    }

    const data = result[0];
    return {
        totalStudents: data.totalStudents,
        passCount: data.totalPassed,
        failCount: data.totalFailed,
        passPercentage: parseFloat((data.avgPassPercentage || 0).toFixed(2)),
        averageMarks: parseFloat((data.avgMarks || 0).toFixed(2)),
        highestScore: data.maxScore || 0,
        lowestScore: data.minScore || 0,
        distinctionCount: data.totalDistinction,
        atRiskCount: data.totalAtRisk,
        subjectCount: data.subjectCount,
        gradeDistribution: {
            O: data.gradeO || 0,
            Aplus: data.gradeAplus || 0,
            A: data.gradeA || 0,
            Bplus: data.gradeBplus || 0,
            B: data.gradeB || 0,
            C: data.gradeC || 0,
            D: data.gradeD || 0,
            F: data.gradeF || 0
        }
    };
};

/**
 * Get semester trend data
 */
simplifiedAnalyticsSchema.statics.getSemesterTrend = async function (filters = {}) {
    const match = {};
    if (filters.department) match.department = filters.department;
    if (filters.academicYear) match.academicYear = filters.academicYear;

    return this.aggregate([
        { $match: match },
        {
            $group: {
                _id: '$semester',
                avgPassPercentage: { $avg: '$passPercentage' },
                avgMarks: { $avg: '$averageMarks' },
                totalStudents: { $sum: '$totalStudents' },
                subjectCount: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } },
        {
            $project: {
                semester: '$_id',
                passPercentage: { $round: ['$avgPassPercentage', 2] },
                averageMarks: { $round: ['$avgMarks', 2] },
                totalStudents: 1,
                subjectCount: 1,
                _id: 0
            }
        }
    ]);
};

/**
 * Get subject difficulty ranking
 */
simplifiedAnalyticsSchema.statics.getSubjectDifficulty = async function (filters = {}) {
    const match = {};
    if (filters.department) match.department = filters.department;
    if (filters.academicYear) match.academicYear = filters.academicYear;
    if (filters.semester) match.semester = parseInt(filters.semester);

    return this.find(match)
        .select('subject subjectName passPercentage difficultyIndex averageMarks')
        .sort({ difficultyIndex: -1 })
        .limit(10)
        .lean();
};

/**
 * Upsert analytics (atomic)
 */
simplifiedAnalyticsSchema.statics.upsertAnalytics = async function (scope, metrics) {
    const existing = await this.findOne({
        department: scope.department,
        academicYear: scope.academicYear,
        semester: scope.semester,
        subject: scope.subject
    });

    const version = existing ? existing.version + 1 : 1;

    return this.findOneAndUpdate(
        {
            department: scope.department,
            academicYear: scope.academicYear,
            semester: scope.semester,
            subject: scope.subject
        },
        {
            $set: {
                ...metrics,
                version,
                generatedAt: new Date()
            }
        },
        { upsert: true, new: true }
    );
};

module.exports = mongoose.model('SimplifiedAnalytics', simplifiedAnalyticsSchema);
