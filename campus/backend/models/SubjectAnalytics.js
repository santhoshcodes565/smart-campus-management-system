/**
 * Subject Analytics Model
 * Subject-level failure intelligence for faculty and admin
 * 
 * Tracks:
 * - Pass/fail rates per subject
 * - Grade distribution
 * - Difficulty index calculation
 * - Faculty performance correlation
 */

const mongoose = require('mongoose');

const gradeDistributionSchema = new mongoose.Schema({
    O: { type: Number, default: 0 },
    Aplus: { type: Number, default: 0 },
    A: { type: Number, default: 0 },
    B: { type: Number, default: 0 },
    C: { type: Number, default: 0 },
    D: { type: Number, default: 0 },
    F: { type: Number, default: 0 }
}, { _id: false });

const subjectAnalyticsSchema = new mongoose.Schema({
    // Subject reference
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },

    // Scope
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
        required: true
    },

    // Faculty teaching this subject (for correlation analysis)
    facultyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty'
    },

    // ==================== ATTEMPT STATISTICS ====================
    totalAttempts: {
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

    // ==================== SCORE DISTRIBUTION ====================
    averageMarks: {
        type: Number,
        default: 0
    },
    highestMarks: {
        type: Number,
        default: 0
    },
    lowestMarks: {
        type: Number,
        default: 0
    },
    medianMarks: {
        type: Number,
        default: 0
    },
    standardDeviation: {
        type: Number,
        default: 0
    },

    // ==================== GRADE BREAKDOWN ====================
    gradeDistribution: {
        type: gradeDistributionSchema,
        default: () => ({})
    },

    // ==================== DIFFICULTY INDEX ====================
    // 0-100 scale: higher = more difficult
    // Calculated based on: pass rate, average score, grade distribution
    difficultyIndex: {
        type: Number,
        default: 50,
        min: 0,
        max: 100
    },
    difficultyLevel: {
        type: String,
        enum: ['easy', 'moderate', 'challenging', 'difficult', 'very_difficult'],
        default: 'moderate'
    },

    // ==================== TREND DATA ====================
    historicalPassRates: [{
        academicYear: String,
        passPercentage: Number,
        totalAttempts: Number
    }],

    // ==================== METADATA ====================
    generatedAt: {
        type: Date,
        default: Date.now
    },
    lastExamDate: {
        type: Date
    }
}, {
    timestamps: true
});

// ==================== INDEXES ====================

// Primary lookup
subjectAnalyticsSchema.index(
    { subjectId: 1, academicYear: 1 },
    { unique: true }
);

// Department-level queries for failure detection
subjectAnalyticsSchema.index({ departmentId: 1, passPercentage: 1 });

// Difficulty ranking
subjectAnalyticsSchema.index({ difficultyIndex: -1 });

// Faculty performance correlation
subjectAnalyticsSchema.index({ facultyId: 1, passPercentage: 1 });

// Course-semester filtering
subjectAnalyticsSchema.index({ courseId: 1, semester: 1 });

// ==================== METHODS ====================

/**
 * Calculate difficulty index based on multiple factors
 */
subjectAnalyticsSchema.methods.calculateDifficultyIndex = function () {
    // Base difficulty from failure rate (40% weight)
    const failureScore = (100 - this.passPercentage) * 0.4;

    // Average score penalty (30% weight)
    // Lower average = higher difficulty
    const avgScore = this.averageMarks || 50;
    const avgScoreContribution = (100 - avgScore) * 0.3;

    // Grade distribution penalty (30% weight)
    // More F grades = higher difficulty
    const total = Object.values(this.gradeDistribution.toObject()).reduce((a, b) => a + b, 0);
    const fPercentage = total > 0 ? (this.gradeDistribution.F / total) * 100 : 0;
    const gradeContribution = fPercentage * 0.3;

    this.difficultyIndex = Math.min(100, Math.round(
        failureScore + avgScoreContribution + gradeContribution
    ));

    // Set difficulty level
    if (this.difficultyIndex < 20) {
        this.difficultyLevel = 'easy';
    } else if (this.difficultyIndex < 40) {
        this.difficultyLevel = 'moderate';
    } else if (this.difficultyIndex < 60) {
        this.difficultyLevel = 'challenging';
    } else if (this.difficultyIndex < 80) {
        this.difficultyLevel = 'difficult';
    } else {
        this.difficultyLevel = 'very_difficult';
    }
};

/**
 * Add to historical trend
 */
subjectAnalyticsSchema.methods.addToHistory = function () {
    // Check if entry for this year already exists
    const existingIndex = this.historicalPassRates.findIndex(
        h => h.academicYear === this.academicYear
    );

    if (existingIndex >= 0) {
        this.historicalPassRates[existingIndex] = {
            academicYear: this.academicYear,
            passPercentage: this.passPercentage,
            totalAttempts: this.totalAttempts
        };
    } else {
        this.historicalPassRates.push({
            academicYear: this.academicYear,
            passPercentage: this.passPercentage,
            totalAttempts: this.totalAttempts
        });
    }

    // Keep only last 5 years
    if (this.historicalPassRates.length > 5) {
        this.historicalPassRates = this.historicalPassRates.slice(-5);
    }
};

// ==================== STATIC METHODS ====================

/**
 * Get top failed subjects for a department
 */
subjectAnalyticsSchema.statics.getTopFailedSubjects = async function (
    departmentId,
    academicYear,
    limit = 10
) {
    return this.find({
        departmentId,
        academicYear,
        passPercentage: { $lt: 50 }
    })
        .sort({ passPercentage: 1 })
        .limit(limit)
        .populate('subjectId', 'name code')
        .populate('facultyId', 'userId')
        .lean();
};

/**
 * Get difficulty ranking for all subjects
 */
subjectAnalyticsSchema.statics.getDifficultyRanking = async function (
    courseId,
    academicYear
) {
    return this.find({
        courseId,
        academicYear
    })
        .sort({ difficultyIndex: -1 })
        .populate('subjectId', 'name code semester')
        .lean();
};

module.exports = mongoose.model('SubjectAnalytics', subjectAnalyticsSchema);
