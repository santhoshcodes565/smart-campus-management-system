/**
 * Analytics Compute Service
 * Pre-computes metrics on RESULTS_PUBLISHED event
 * 
 * LEAN METRICS: No standardDeviation
 * FAST: Optimized for < 100ms computation
 * FAULT-TOLERANT: Failures logged, retried, never block publish
 * 
 * FIXED: Now syncs to StudentPerformance for student dashboard
 */

const StudentMarks = require('../models/StudentMarks');
const SimplifiedAnalytics = require('../models/SimplifiedAnalytics');
const StudentPerformance = require('../models/StudentPerformance');
const Student = require('../models/Student');
const { MARKS_EVENTS, emitMarksEvent, subscribeMarksEvent } = require('./marksEventEmitter');

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate median from array
 */
function calculateMedian(values) {
    if (!values || values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
}

/**
 * Calculate difficulty index (0-1 scale)
 * Higher = more difficult
 */
function calculateDifficultyIndex(passPercentage) {
    return parseFloat((1 - (passPercentage / 100)).toFixed(3));
}

/**
 * Count grades from marks array
 */
function countGrades(marks) {
    const distribution = {
        O: 0, Aplus: 0, A: 0, Bplus: 0, B: 0, C: 0, D: 0, F: 0
    };

    for (const mark of marks) {
        switch (mark.grade) {
            case 'O': distribution.O++; break;
            case 'A+': distribution.Aplus++; break;
            case 'A': distribution.A++; break;
            case 'B+': distribution.Bplus++; break;
            case 'B': distribution.B++; break;
            case 'C': distribution.C++; break;
            case 'D': distribution.D++; break;
            case 'F': distribution.F++; break;
        }
    }

    return distribution;
}

/**
 * Convert marks to GPA (10-point scale)
 */
function marksToGPA(totalMarks) {
    if (totalMarks >= 90) return 10.0;
    if (totalMarks >= 80) return 9.0;
    if (totalMarks >= 70) return 8.0;
    if (totalMarks >= 60) return 7.0;
    if (totalMarks >= 55) return 6.0;
    if (totalMarks >= 50) return 5.5;
    if (totalMarks >= 40) return 5.0;
    return 0; // Fail
}

// ==================== STUDENT PERFORMANCE SYNC ====================

/**
 * Update StudentPerformance for all students in scope
 * CRITICAL: This is what makes marks visible on student dashboard
 */
async function updateStudentPerformances(scope) {
    const { department, academicYear, semester, subject } = scope;

    console.log(`[StudentPerfSync] Updating student performances for Sem-${semester}`);

    try {
        // Get all published marks for this scope
        const publishedMarks = await StudentMarks.find({
            department,
            academicYear,
            semester,
            subject,
            status: 'published'
        }).lean();

        if (publishedMarks.length === 0) {
            console.log('[StudentPerfSync] No published marks found');
            return;
        }

        console.log(`[StudentPerfSync] Processing ${publishedMarks.length} student marks`);

        // Process each student
        for (const mark of publishedMarks) {
            await updateSingleStudentPerformance(mark.studentId, academicYear);
        }

        console.log(`[StudentPerfSync] Completed updating ${publishedMarks.length} students`);

    } catch (error) {
        console.error('[StudentPerfSync] ERROR:', error);
        // Don't throw - let main analytics continue
    }
}

/**
 * Update performance for a single student
 * Aggregates all their published marks to calculate CGPA, semester GPA, etc.
 */
async function updateSingleStudentPerformance(studentId, academicYear) {
    try {
        // Get student info
        const student = await Student.findById(studentId)
            .select('departmentId courseId semester')
            .lean();

        if (!student) {
            console.warn(`[StudentPerfSync] Student not found: ${studentId}`);
            return;
        }

        // Get ALL published marks for this student
        const allMarks = await StudentMarks.find({
            studentId,
            status: 'published'
        }).lean();

        if (allMarks.length === 0) {
            return; // No marks to process
        }

        // Group marks by semester
        const semesterGroups = {};
        for (const mark of allMarks) {
            const sem = mark.semester;
            if (!semesterGroups[sem]) {
                semesterGroups[sem] = [];
            }
            semesterGroups[sem].push(mark);
        }

        // Calculate semester-wise GPA
        const semesterWiseGPA = [];
        let totalWeightedGPA = 0;
        let totalSubjects = 0;
        let totalPassed = 0;
        let totalFailed = 0;

        for (const sem of Object.keys(semesterGroups).sort((a, b) => a - b)) {
            const semMarks = semesterGroups[sem];
            const gpaValues = semMarks.map(m => marksToGPA(m.totalMarks));
            const semGPA = gpaValues.reduce((a, b) => a + b, 0) / gpaValues.length;

            const passed = semMarks.filter(m => m.resultStatus === 'pass').length;
            const failed = semMarks.filter(m => m.resultStatus === 'fail').length;

            semesterWiseGPA.push({
                semester: parseInt(sem),
                academicYear: semMarks[0]?.academicYear || academicYear,
                gpa: parseFloat(semGPA.toFixed(2)),
                credits: semMarks.length * 3, // Assume 3 credits per subject
                passedSubjects: passed,
                failedSubjects: failed,
                totalSubjects: semMarks.length,
                recordedAt: new Date()
            });

            totalWeightedGPA += semGPA * semMarks.length;
            totalSubjects += semMarks.length;
            totalPassed += passed;
            totalFailed += failed;
        }

        // Calculate CGPA
        const cgpa = totalSubjects > 0
            ? parseFloat((totalWeightedGPA / totalSubjects).toFixed(2))
            : 0;

        // Upsert StudentPerformance
        const updateData = {
            studentId,
            departmentId: student.departmentId,
            courseId: student.courseId,
            cgpa,
            totalCredits: totalSubjects * 3,
            creditsEarned: totalPassed * 3,
            totalSubjectsAttempted: totalSubjects,
            totalSubjectsPassed: totalPassed,
            semesterWiseGPA,
            currentSemester: Math.max(...Object.keys(semesterGroups).map(Number)),
            activeArrears: totalFailed,
            totalArrears: totalFailed,
            placementEligible: cgpa >= 7.0 && totalFailed === 0,
            placementEligibilityUpdatedAt: new Date()
        };

        const performance = await StudentPerformance.findOneAndUpdate(
            { studentId },
            { $set: updateData },
            { upsert: true, new: true }
        );

        // Calculate trend and risk
        if (performance.calculateTrend) {
            performance.calculateTrend();
            performance.calculateRiskLevel();
            await performance.save();
        }

        console.log(`[StudentPerfSync] Updated student ${studentId}: CGPA=${cgpa}`);

    } catch (error) {
        console.error(`[StudentPerfSync] Failed for student ${studentId}:`, error);
    }
}

// ==================== CORE COMPUTATION ====================

/**
 * Compute analytics for a given scope
 * Called after RESULTS_PUBLISHED event
 */
async function computeAnalytics(scope) {
    const startTime = Date.now();
    const { department, academicYear, semester, subject, subjectName } = scope;

    console.log(`[AnalyticsCompute] Starting computation for ${subject} Sem-${semester}`);

    try {
        // Step 1: Fetch published marks
        const marks = await StudentMarks.getPublishedForAnalytics(scope);

        if (marks.length === 0) {
            console.log('[AnalyticsCompute] No published marks found');
            return null;
        }

        const scores = marks.map(m => m.totalMarks);

        // Step 2: Calculate core metrics
        const totalStudents = marks.length;
        const passCount = marks.filter(m => m.resultStatus === 'pass').length;
        const failCount = marks.filter(m => m.resultStatus === 'fail').length;
        const passPercentage = parseFloat(((passCount / totalStudents) * 100).toFixed(2));

        // Step 3: Calculate statistical metrics
        const averageMarks = parseFloat((scores.reduce((a, b) => a + b, 0) / totalStudents).toFixed(2));
        const medianScore = calculateMedian(scores);
        const highestScore = Math.max(...scores);
        const lowestScore = Math.min(...scores);

        // Step 4: Calculate advanced metrics
        const distinctionCount = scores.filter(s => s >= 75).length;
        const atRiskCount = failCount;
        const difficultyIndex = calculateDifficultyIndex(passPercentage);

        // Step 5: Count grade distribution
        const gradeDistribution = countGrades(marks);

        // Step 6: Build metrics object
        const metrics = {
            subjectName,
            totalStudents,
            appearedStudents: totalStudents,
            passCount,
            failCount,
            passPercentage,
            averageMarks,
            medianScore,
            highestScore,
            lowestScore,
            distinctionCount,
            atRiskCount,
            difficultyIndex,
            gradeDistribution,
            computeDurationMs: Date.now() - startTime
        };

        // Step 7: Upsert subject analytics (SimplifiedAnalytics)
        const analytics = await SimplifiedAnalytics.upsertAnalytics(scope, metrics);

        // Step 8: CRITICAL - Update StudentPerformance for student dashboard
        await updateStudentPerformances(scope);

        const duration = Date.now() - startTime;
        console.log(`[AnalyticsCompute] Completed in ${duration}ms, version: ${analytics.version}`);

        // Emit completion event
        emitMarksEvent(MARKS_EVENTS.ANALYTICS_COMPLETE, {
            scope,
            version: analytics.version,
            duration
        });

        return analytics;

    } catch (error) {
        console.error('[AnalyticsCompute] Failed:', error);

        // Emit failure event
        emitMarksEvent(MARKS_EVENTS.ANALYTICS_FAILED, {
            scope,
            error: error.message
        });

        throw error;
    }
}

/**
 * Retry queue for failed computations
 */
const retryQueue = [];
const MAX_RETRIES = 3;

async function queueRetry(scope, retryCount = 0) {
    if (retryCount >= MAX_RETRIES) {
        console.error(`[AnalyticsCompute] Max retries reached for ${scope.subject}`);
        return;
    }

    retryQueue.push({ scope, retryCount });

    setTimeout(async () => {
        const item = retryQueue.shift();
        if (item) {
            try {
                await computeAnalytics(item.scope);
            } catch (error) {
                await queueRetry(item.scope, item.retryCount + 1);
            }
        }
    }, 5000 * (retryCount + 1));
}

// ==================== EVENT HANDLERS ====================

/**
 * Handle RESULTS_PUBLISHED event
 */
async function handleResultsPublished(payload) {
    const { scope, adminId } = payload;

    try {
        await computeAnalytics(scope);
    } catch (error) {
        console.error('[AnalyticsCompute] Initial compute failed, queuing retry');
        await queueRetry(scope);
    }
}

/**
 * Register event handlers
 * Call this at server startup
 */
function registerAnalyticsHandlers() {
    subscribeMarksEvent(
        MARKS_EVENTS.RESULTS_PUBLISHED,
        handleResultsPublished,
        'AnalyticsCompute'
    );

    console.log('[AnalyticsCompute] Event handlers registered');
}

module.exports = {
    computeAnalytics,
    queueRetry,
    registerAnalyticsHandlers,
    updateStudentPerformances,
    updateSingleStudentPerformance
};

