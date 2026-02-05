/**
 * Student Performance Model
 * Individual student performance trends for GPA progression analysis
 * 
 * Supports:
 * - CGPA calculation
 * - Semester-wise GPA tracking
 * - Performance trend detection (improving/declining/stable)
 * - At-risk student flagging
 * - Active arrears tracking
 */

const mongoose = require('mongoose');

const semesterGPASchema = new mongoose.Schema({
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
    gpa: {
        type: Number,
        required: true,
        min: 0,
        max: 10
    },
    credits: {
        type: Number,
        default: 0
    },
    passedSubjects: {
        type: Number,
        default: 0
    },
    failedSubjects: {
        type: Number,
        default: 0
    },
    totalSubjects: {
        type: Number,
        default: 0
    },
    recordedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const studentPerformanceSchema = new mongoose.Schema({
    // Student reference (unique per student)
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true,
        unique: true
    },

    // Academic scope
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

    // ==================== CUMULATIVE METRICS ====================
    cgpa: {
        type: Number,
        default: 0,
        min: 0,
        max: 10
    },
    totalCredits: {
        type: Number,
        default: 0
    },
    creditsEarned: {
        type: Number,
        default: 0
    },
    totalSubjectsAttempted: {
        type: Number,
        default: 0
    },
    totalSubjectsPassed: {
        type: Number,
        default: 0
    },

    // ==================== SEMESTER PROGRESSION ====================
    semesterWiseGPA: [semesterGPASchema],
    currentSemester: {
        type: Number,
        default: 1
    },

    // ==================== TREND ANALYSIS ====================
    performanceTrend: {
        type: String,
        enum: ['improving', 'declining', 'stable', 'new'],
        default: 'new'
    },
    trendScore: {
        type: Number,
        default: 0  // +ve = improving, -ve = declining
    },
    lastTrendCalculation: {
        type: Date
    },

    // ==================== RISK FLAGS ====================
    atRisk: {
        type: Boolean,
        default: false
    },
    riskLevel: {
        type: String,
        enum: ['none', 'low', 'medium', 'high', 'critical'],
        default: 'none'
    },
    riskFactors: [{
        type: String,
        enum: [
            'low_cgpa',
            'declining_trend',
            'multiple_arrears',
            'consecutive_failures',
            'attendance_low'
        ]
    }],

    // ==================== ARREARS TRACKING ====================
    activeArrears: {
        type: Number,
        default: 0
    },
    totalArrears: {
        type: Number,
        default: 0
    },
    clearedArrears: {
        type: Number,
        default: 0
    },
    arrearSubjects: [{
        subjectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subject'
        },
        semester: Number,
        attempts: Number,
        lastAttempt: Date
    }],

    // ==================== PLACEMENT ELIGIBILITY ====================
    placementEligible: {
        type: Boolean,
        default: false
    },
    placementEligibilityUpdatedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// ==================== INDEXES ====================

// Primary lookup
studentPerformanceSchema.index({ studentId: 1 }, { unique: true });

// Department analytics queries
studentPerformanceSchema.index({ departmentId: 1, cgpa: -1 });

// Course-level queries
studentPerformanceSchema.index({ courseId: 1, cgpa: -1 });

// Risk identification
studentPerformanceSchema.index({ atRisk: 1, riskLevel: 1 });

// Trend analysis
studentPerformanceSchema.index({ performanceTrend: 1 });

// Placement queries
studentPerformanceSchema.index({ placementEligible: 1, cgpa: -1 });

// Arrears tracking
studentPerformanceSchema.index({ activeArrears: 1 });

// ==================== INSTANCE METHODS ====================

/**
 * Calculate performance trend based on semester GPA progression
 */
studentPerformanceSchema.methods.calculateTrend = function () {
    const gpas = this.semesterWiseGPA
        .sort((a, b) => a.semester - b.semester)
        .map(s => s.gpa);

    if (gpas.length < 2) {
        this.performanceTrend = 'new';
        this.trendScore = 0;
        return;
    }

    // Calculate weighted trend (recent semesters matter more)
    let trendSum = 0;
    let weights = 0;

    for (let i = 1; i < gpas.length; i++) {
        const weight = i; // More recent = higher weight
        const diff = gpas[i] - gpas[i - 1];
        trendSum += diff * weight;
        weights += weight;
    }

    this.trendScore = weights > 0 ? (trendSum / weights) : 0;

    // Classify trend
    if (this.trendScore > 0.3) {
        this.performanceTrend = 'improving';
    } else if (this.trendScore < -0.3) {
        this.performanceTrend = 'declining';
    } else {
        this.performanceTrend = 'stable';
    }

    this.lastTrendCalculation = new Date();
};

/**
 * Calculate risk level based on multiple factors
 */
studentPerformanceSchema.methods.calculateRiskLevel = function () {
    const factors = [];

    // Low CGPA
    if (this.cgpa < 5.0) {
        factors.push('low_cgpa');
    }

    // Declining trend
    if (this.performanceTrend === 'declining') {
        factors.push('declining_trend');
    }

    // Multiple arrears
    if (this.activeArrears >= 3) {
        factors.push('multiple_arrears');
    }

    // Check for consecutive failures
    const recentSemesters = this.semesterWiseGPA.slice(-2);
    if (recentSemesters.length >= 2 &&
        recentSemesters.every(s => s.failedSubjects > 0)) {
        factors.push('consecutive_failures');
    }

    this.riskFactors = factors;

    // Determine risk level
    if (factors.length === 0) {
        this.riskLevel = 'none';
        this.atRisk = false;
    } else if (factors.length === 1) {
        this.riskLevel = 'low';
        this.atRisk = true;
    } else if (factors.length === 2) {
        this.riskLevel = 'medium';
        this.atRisk = true;
    } else if (factors.length === 3) {
        this.riskLevel = 'high';
        this.atRisk = true;
    } else {
        this.riskLevel = 'critical';
        this.atRisk = true;
    }
};

/**
 * Check placement eligibility
 * Eligible if: CGPA >= 7.0 AND activeArrears === 0
 */
studentPerformanceSchema.methods.checkPlacementEligibility = function () {
    this.placementEligible = (
        this.cgpa >= 7.0 &&
        this.activeArrears === 0
    );
    this.placementEligibilityUpdatedAt = new Date();
    return this.placementEligible;
};

// ==================== STATIC METHODS ====================

/**
 * Get or create performance record for a student
 */
studentPerformanceSchema.statics.getOrCreate = async function (studentId) {
    let performance = await this.findOne({ studentId });

    if (!performance) {
        const Student = mongoose.model('Student');
        const student = await Student.findById(studentId)
            .select('departmentId courseId')
            .lean();

        if (!student) {
            throw new Error('Student not found');
        }

        performance = await this.create({
            studentId,
            departmentId: student.departmentId,
            courseId: student.courseId
        });
    }

    return performance;
};

module.exports = mongoose.model('StudentPerformance', studentPerformanceSchema);
