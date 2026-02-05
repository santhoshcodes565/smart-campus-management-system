/**
 * Academic Analytics Service
 * Core analytics computation engine for university-scale academic intelligence
 * 
 * ARCHITECTURE:
 * - Pre-computed aggregates (never compute on dashboard request)
 * - Bulk MongoDB operations (no loops for 100K+ students)
 * - Queue-ready job processing
 * - Event-driven triggers
 * - Versioned, immutable analytics
 * 
 * TRIGGERED BY:
 * - Result publish events
 * - Manual regeneration by admin
 * - Scheduled background jobs
 */

const mongoose = require('mongoose');
const AcademicAnalytics = require('../models/AcademicAnalytics');
const StudentPerformance = require('../models/StudentPerformance');
const SubjectAnalytics = require('../models/SubjectAnalytics');
const AnalyticsJob = require('../models/AnalyticsJob');
const Student = require('../models/Student');
const Result = require('../models/Result');
const Exam = require('../models/Exam');
const Subject = require('../models/Subject');
const { emitEvent, EVENTS, getCurrentAcademicYear } = require('./eventEmitter');

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate dense rankings (1, 2, 2, 3 not 1, 2, 2, 4)
 * Universities prefer dense ranking for academic standings
 */
function calculateDenseRankings(students) {
    if (!students || students.length === 0) return [];

    // Sort by GPA descending
    const sorted = [...students].sort((a, b) => b.gpa - a.gpa);

    let currentRank = 1;
    let previousGPA = null;

    return sorted.map((student, index) => {
        // Only increment rank if GPA is different from previous
        if (previousGPA !== null && student.gpa < previousGPA) {
            currentRank++;
        }
        previousGPA = student.gpa;

        return {
            studentId: student.studentId,
            gpa: student.gpa,
            rank: currentRank
        };
    });
}

/**
 * Map percentage to grade
 */
function getGradeFromPercentage(percentage) {
    if (percentage >= 90) return 'O';
    if (percentage >= 80) return 'Aplus';
    if (percentage >= 70) return 'A';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
}

/**
 * Calculate GPA from percentage (10-point scale)
 */
function calculateGPA(percentage) {
    if (percentage >= 90) return 10.0;
    if (percentage >= 80) return 9.0;
    if (percentage >= 70) return 8.0;
    if (percentage >= 60) return 7.0;
    if (percentage >= 50) return 6.0;
    if (percentage >= 40) return 5.0;
    if (percentage >= 33) return 4.0;
    return 0;
}

/**
 * Calculate median from array of numbers
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
 * Calculate standard deviation
 */
function calculateStdDev(values, mean) {
    if (!values || values.length === 0) return 0;

    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
}

// ==================== CORE ANALYTICS FUNCTIONS ====================

/**
 * Generate semester analytics for a department/course/semester
 * Creates versioned, immutable analytics document
 */
async function generateSemesterAnalytics(departmentId, courseId, semester, academicYear, options = {}) {
    const startTime = Date.now();
    console.log(`[Analytics] Generating semester analytics for dept:${departmentId}, sem:${semester}, year:${academicYear}`);

    try {
        // Step 1: Get all students in this department/course/semester
        const students = await Student.find({
            departmentId,
            courseId,
            semester
        }).select('_id').lean();

        const studentIds = students.map(s => s._id);

        if (studentIds.length === 0) {
            console.log('[Analytics] No students found for this scope');
            return null;
        }

        // Step 2: Get published results for these students
        const results = await Result.aggregate([
            {
                $match: {
                    studentId: { $in: studentIds },
                    isPublished: true
                }
            },
            {
                $lookup: {
                    from: 'exams',
                    localField: 'examId',
                    foreignField: '_id',
                    as: 'exam'
                }
            },
            {
                $unwind: '$exam'
            },
            {
                $match: {
                    'exam.semester': semester
                }
            },
            {
                $group: {
                    _id: '$studentId',
                    totalMarks: { $sum: '$marksObtained' },
                    totalMaxMarks: { $sum: '$exam.maxMarks' },
                    subjectCount: { $sum: 1 },
                    passedCount: {
                        $sum: {
                            $cond: [
                                { $gte: ['$percentage', 40] },
                                1,
                                0
                            ]
                        }
                    },
                    failedCount: {
                        $sum: {
                            $cond: [
                                { $lt: ['$percentage', 40] },
                                1,
                                0
                            ]
                        }
                    },
                    grades: { $push: '$grade' },
                    percentages: { $push: '$percentage' }
                }
            }
        ]);

        if (results.length === 0) {
            console.log('[Analytics] No results found for this scope');
            return null;
        }

        // Step 3: Calculate aggregate metrics
        let passCount = 0;
        let failCount = 0;
        const gpas = [];
        const gradeDistribution = { O: 0, Aplus: 0, A: 0, B: 0, C: 0, D: 0, F: 0 };
        const studentGPAs = [];

        for (const studentResult of results) {
            const avgPercentage = studentResult.totalMaxMarks > 0
                ? (studentResult.totalMarks / studentResult.totalMaxMarks) * 100
                : 0;

            const gpa = calculateGPA(avgPercentage);
            gpas.push(gpa);

            studentGPAs.push({
                studentId: studentResult._id,
                gpa: parseFloat(gpa.toFixed(2))
            });

            // Student passes if no failed subjects
            if (studentResult.failedCount === 0) {
                passCount++;
            } else {
                failCount++;
            }

            // Count grades from all subjects
            for (const grade of studentResult.grades) {
                const mappedGrade = grade === 'A+' ? 'Aplus' : grade;
                if (gradeDistribution.hasOwnProperty(mappedGrade)) {
                    gradeDistribution[mappedGrade]++;
                }
            }
        }

        const totalStudents = results.length;
        const passPercentage = totalStudents > 0
            ? parseFloat(((passCount / totalStudents) * 100).toFixed(2))
            : 0;

        const averageGPA = gpas.length > 0
            ? parseFloat((gpas.reduce((a, b) => a + b, 0) / gpas.length).toFixed(2))
            : 0;

        const highestGPA = gpas.length > 0 ? Math.max(...gpas) : 0;
        const lowestGPA = gpas.length > 0 ? Math.min(...gpas) : 0;
        const medianGPA = calculateMedian(gpas);

        // Step 4: Calculate rankings (dense ranking)
        const rankedStudents = calculateDenseRankings(studentGPAs);
        const toppers = rankedStudents.slice(0, 10); // Top 10

        // Step 5: Create versioned analytics document
        const analyticsData = {
            departmentId,
            courseId,
            semester,
            academicYear,
            totalStudents,
            passCount,
            failCount,
            passPercentage,
            highestGPA,
            averageGPA,
            lowestGPA,
            medianGPA,
            toppers,
            gradeDistribution,
            triggerSource: options.triggerSource || 'result_publish',
            generatedBy: options.generatedBy
        };

        // Use static method for versioned creation
        const analytics = await AcademicAnalytics.createNewVersion(analyticsData);

        const duration = Date.now() - startTime;
        console.log(`[Analytics] Semester analytics generated in ${duration}ms, version: ${analytics.version}`);

        // Emit event
        emitEvent(EVENTS.ANALYTICS_GENERATED, {
            analyticsId: analytics._id,
            departmentId,
            semester,
            academicYear,
            version: analytics.version,
            summary: { totalStudents, passPercentage, averageGPA }
        });

        return analytics;

    } catch (error) {
        console.error('[Analytics] Error generating semester analytics:', error);
        throw error;
    }
}

/**
 * Generate subject-level analytics for failure detection
 */
async function generateSubjectAnalytics(subjectId, academicYear) {
    console.log(`[Analytics] Generating subject analytics for subject:${subjectId}, year:${academicYear}`);

    try {
        const subject = await Subject.findById(subjectId)
            .select('name code courseId semester facultyId')
            .populate('courseId', 'departmentId')
            .lean();

        if (!subject) {
            throw new Error('Subject not found');
        }

        // Get all results for this subject
        const results = await Result.aggregate([
            {
                $lookup: {
                    from: 'exams',
                    localField: 'examId',
                    foreignField: '_id',
                    as: 'exam'
                }
            },
            {
                $unwind: '$exam'
            },
            {
                $match: {
                    'exam.subjectId': new mongoose.Types.ObjectId(subjectId),
                    isPublished: true
                }
            },
            {
                $group: {
                    _id: null,
                    totalAttempts: { $sum: 1 },
                    passCount: {
                        $sum: { $cond: [{ $gte: ['$percentage', 40] }, 1, 0] }
                    },
                    failCount: {
                        $sum: { $cond: [{ $lt: ['$percentage', 40] }, 1, 0] }
                    },
                    totalMarks: { $sum: '$marksObtained' },
                    marks: { $push: '$marksObtained' },
                    percentages: { $push: '$percentage' },
                    grades: { $push: '$grade' }
                }
            }
        ]);

        if (results.length === 0) {
            console.log('[Analytics] No results found for this subject');
            return null;
        }

        const data = results[0];
        const avgMarks = data.totalAttempts > 0
            ? parseFloat((data.totalMarks / data.totalAttempts).toFixed(2))
            : 0;

        const avgPercentage = data.percentages.length > 0
            ? data.percentages.reduce((a, b) => a + b, 0) / data.percentages.length
            : 0;

        // Grade distribution
        const gradeDistribution = { O: 0, Aplus: 0, A: 0, B: 0, C: 0, D: 0, F: 0 };
        for (const grade of data.grades) {
            const mappedGrade = grade === 'A+' ? 'Aplus' : grade;
            if (gradeDistribution.hasOwnProperty(mappedGrade)) {
                gradeDistribution[mappedGrade]++;
            }
        }

        const passPercentage = data.totalAttempts > 0
            ? parseFloat(((data.passCount / data.totalAttempts) * 100).toFixed(2))
            : 0;

        // Upsert subject analytics
        const subjectAnalytics = await SubjectAnalytics.findOneAndUpdate(
            { subjectId, academicYear },
            {
                $set: {
                    departmentId: subject.courseId.departmentId,
                    courseId: subject.courseId._id,
                    semester: subject.semester,
                    facultyId: subject.facultyId,
                    totalAttempts: data.totalAttempts,
                    passCount: data.passCount,
                    failCount: data.failCount,
                    passPercentage,
                    averageMarks: avgMarks,
                    highestMarks: Math.max(...data.marks),
                    lowestMarks: Math.min(...data.marks),
                    medianMarks: calculateMedian(data.marks),
                    standardDeviation: calculateStdDev(data.marks, avgMarks),
                    gradeDistribution,
                    generatedAt: new Date()
                }
            },
            { upsert: true, new: true }
        );

        // Calculate difficulty index
        subjectAnalytics.calculateDifficultyIndex();
        subjectAnalytics.addToHistory();
        await subjectAnalytics.save();

        console.log(`[Analytics] Subject analytics generated: passRate=${passPercentage}%, difficulty=${subjectAnalytics.difficultyIndex}`);

        return subjectAnalytics;

    } catch (error) {
        console.error('[Analytics] Error generating subject analytics:', error);
        throw error;
    }
}

/**
 * Update student performance trends and CGPA
 * Uses BULK operations for scale
 */
async function updateStudentPerformanceBulk(studentIds, semester, academicYear) {
    console.log(`[Analytics] Updating performance for ${studentIds.length} students`);

    const startTime = Date.now();
    const bulkPerformanceOps = [];
    const bulkStudentOps = [];

    try {
        // Get all results for these students in one query
        const allResults = await Result.aggregate([
            {
                $match: {
                    studentId: { $in: studentIds.map(id => new mongoose.Types.ObjectId(id)) },
                    isPublished: true
                }
            },
            {
                $lookup: {
                    from: 'exams',
                    localField: 'examId',
                    foreignField: '_id',
                    as: 'exam'
                }
            },
            {
                $unwind: '$exam'
            },
            {
                $group: {
                    _id: {
                        studentId: '$studentId',
                        semester: '$exam.semester'
                    },
                    totalMarks: { $sum: '$marksObtained' },
                    totalMaxMarks: { $sum: '$exam.maxMarks' },
                    passedSubjects: {
                        $sum: { $cond: [{ $gte: ['$percentage', 40] }, 1, 0] }
                    },
                    failedSubjects: {
                        $sum: { $cond: [{ $lt: ['$percentage', 40] }, 1, 0] }
                    },
                    totalSubjects: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: '$_id.studentId',
                    semesters: {
                        $push: {
                            semester: '$_id.semester',
                            totalMarks: '$totalMarks',
                            totalMaxMarks: '$totalMaxMarks',
                            passedSubjects: '$passedSubjects',
                            failedSubjects: '$failedSubjects',
                            totalSubjects: '$totalSubjects'
                        }
                    }
                }
            }
        ]);

        // Get student info for department/course
        const studentInfo = await Student.find({
            _id: { $in: studentIds }
        }).select('_id departmentId courseId').lean();

        const studentMap = new Map(studentInfo.map(s => [s._id.toString(), s]));

        // Process each student's results
        for (const studentData of allResults) {
            const studentId = studentData._id;
            const student = studentMap.get(studentId.toString());

            if (!student) continue;

            // Calculate semester-wise GPA
            const semesterWiseGPA = [];
            let totalWeightedGPA = 0;
            let totalCredits = 0;
            let activeArrears = 0;

            for (const sem of studentData.semesters.sort((a, b) => a.semester - b.semester)) {
                const percentage = sem.totalMaxMarks > 0
                    ? (sem.totalMarks / sem.totalMaxMarks) * 100
                    : 0;
                const gpa = calculateGPA(percentage);
                const credits = sem.totalSubjects * 3; // Assuming 3 credits per subject

                semesterWiseGPA.push({
                    semester: sem.semester,
                    academicYear,
                    gpa: parseFloat(gpa.toFixed(2)),
                    credits,
                    passedSubjects: sem.passedSubjects,
                    failedSubjects: sem.failedSubjects,
                    totalSubjects: sem.totalSubjects,
                    recordedAt: new Date()
                });

                totalWeightedGPA += gpa * credits;
                totalCredits += credits;
                activeArrears += sem.failedSubjects;
            }

            const cgpa = totalCredits > 0
                ? parseFloat((totalWeightedGPA / totalCredits).toFixed(2))
                : 0;

            // Check placement eligibility
            const placementEligible = cgpa >= 7.0 && activeArrears === 0;

            // Prepare bulk update for StudentPerformance
            bulkPerformanceOps.push({
                updateOne: {
                    filter: { studentId },
                    update: {
                        $set: {
                            studentId,
                            departmentId: student.departmentId,
                            courseId: student.courseId,
                            cgpa,
                            totalCredits,
                            creditsEarned: totalCredits,
                            semesterWiseGPA,
                            currentSemester: Math.max(...studentData.semesters.map(s => s.semester)),
                            activeArrears,
                            placementEligible,
                            placementEligibilityUpdatedAt: new Date(),
                            updatedAt: new Date()
                        }
                    },
                    upsert: true
                }
            });

            // Prepare bulk update for Student model
            bulkStudentOps.push({
                updateOne: {
                    filter: { _id: studentId },
                    update: {
                        $set: {
                            cgpa,
                            placementEligible,
                            activeArrears,
                            placementEligibilityUpdatedAt: new Date()
                        }
                    }
                }
            });
        }

        // Execute bulk operations
        if (bulkPerformanceOps.length > 0) {
            await StudentPerformance.bulkWrite(bulkPerformanceOps, { ordered: false });
        }

        if (bulkStudentOps.length > 0) {
            await Student.bulkWrite(bulkStudentOps, { ordered: false });
        }

        // Calculate trends in a separate pass (requires saved semester data)
        await updateTrendsBulk(studentIds);

        const duration = Date.now() - startTime;
        console.log(`[Analytics] Updated ${studentIds.length} students in ${duration}ms using bulk operations`);

        // Emit events
        emitEvent(EVENTS.CGPA_UPDATED, {
            studentCount: studentIds.length,
            semester,
            academicYear
        });

        emitEvent(EVENTS.PLACEMENT_UPDATED, {
            studentCount: bulkStudentOps.filter(op =>
                op.updateOne.update.$set.placementEligible
            ).length
        });

    } catch (error) {
        console.error('[Analytics] Error updating student performance:', error);
        throw error;
    }
}

/**
 * Update performance trends for students
 */
async function updateTrendsBulk(studentIds) {
    const performances = await StudentPerformance.find({
        studentId: { $in: studentIds }
    });

    const bulkOps = [];

    for (const performance of performances) {
        performance.calculateTrend();
        performance.calculateRiskLevel();

        bulkOps.push({
            updateOne: {
                filter: { _id: performance._id },
                update: {
                    $set: {
                        performanceTrend: performance.performanceTrend,
                        trendScore: performance.trendScore,
                        lastTrendCalculation: performance.lastTrendCalculation,
                        atRisk: performance.atRisk,
                        riskLevel: performance.riskLevel,
                        riskFactors: performance.riskFactors
                    }
                }
            }
        });
    }

    if (bulkOps.length > 0) {
        await StudentPerformance.bulkWrite(bulkOps, { ordered: false });
    }
}

// ==================== JOB QUEUE PROCESSING ====================

/**
 * Create an analytics job (queue-ready architecture)
 */
async function createAnalyticsJob(jobType, payload, options = {}) {
    const job = await AnalyticsJob.createJob(jobType, payload, options);

    emitEvent(EVENTS.JOB_CREATED, {
        jobId: job._id,
        jobType,
        payload
    });

    // If no external queue processor, process immediately
    // This allows seamless upgrade to Redis/BullMQ later
    if (!options.deferProcessing) {
        setImmediate(() => processAnalyticsJob(job._id));
    }

    return job;
}

/**
 * Process a single analytics job
 */
async function processAnalyticsJob(jobId) {
    const job = await AnalyticsJob.findById(jobId);
    if (!job || job.status === 'completed' || job.status === 'cancelled') {
        return;
    }

    await AnalyticsJob.findByIdAndUpdate(jobId, {
        status: 'processing',
        startedAt: new Date()
    });

    try {
        let result;

        switch (job.jobType) {
            case 'semester_analytics':
                result = await generateSemesterAnalytics(
                    job.payload.departmentId,
                    job.payload.courseId,
                    job.payload.semester,
                    job.payload.academicYear,
                    { triggerSource: job.payload.triggerSource }
                );
                break;

            case 'cgpa_update':
            case 'placement_eligibility':
                await updateStudentPerformanceBulk(
                    job.payload.studentIds,
                    job.payload.semester,
                    job.payload.academicYear
                );
                result = { studentsProcessed: job.payload.studentIds.length };
                break;

            case 'subject_analytics':
                result = await generateSubjectAnalytics(
                    job.payload.subjectId,
                    job.payload.academicYear
                );
                break;

            case 'full_refresh':
                result = await triggerFullAnalyticsRefresh(job.payload.academicYear);
                break;

            default:
                throw new Error(`Unknown job type: ${job.jobType}`);
        }

        await AnalyticsJob.completeJob(jobId, {
            summary: 'Job completed successfully',
            recordsProcessed: result?.studentsProcessed || 1
        });

        emitEvent(EVENTS.JOB_COMPLETED, { jobId, jobType: job.jobType });

    } catch (error) {
        await AnalyticsJob.failJob(jobId, error);
        emitEvent(EVENTS.JOB_FAILED, { jobId, jobType: job.jobType, error: error.message });
        throw error;
    }
}

/**
 * Process pending jobs (worker function)
 * Can be called by cron job or external worker
 */
async function processPendingJobs(limit = 10) {
    const jobs = await AnalyticsJob.find({
        status: 'pending',
        scheduledFor: { $lte: new Date() }
    })
        .sort({ priority: 1, scheduledFor: 1 })
        .limit(limit);

    for (const job of jobs) {
        try {
            await processAnalyticsJob(job._id);
        } catch (error) {
            console.error(`[Analytics] Job ${job._id} failed:`, error.message);
        }
    }

    return jobs.length;
}

/**
 * Trigger full analytics refresh for an academic year
 */
async function triggerFullAnalyticsRefresh(academicYear) {
    console.log(`[Analytics] Triggering full refresh for ${academicYear}`);

    // Get all unique department/course/semester combinations
    const scopes = await Student.aggregate([
        {
            $group: {
                _id: {
                    departmentId: '$departmentId',
                    courseId: '$courseId',
                    semester: '$semester'
                },
                studentCount: { $sum: 1 }
            }
        }
    ]);

    const jobs = [];

    for (const scope of scopes) {
        if (!scope._id.departmentId || !scope._id.courseId) continue;

        const job = await createAnalyticsJob('semester_analytics', {
            departmentId: scope._id.departmentId,
            courseId: scope._id.courseId,
            semester: scope._id.semester,
            academicYear,
            triggerSource: 'scheduled_job'
        }, { deferProcessing: true });

        jobs.push(job._id);
    }

    console.log(`[Analytics] Created ${jobs.length} refresh jobs`);
    return { jobsCreated: jobs.length };
}

// ==================== EVENT HANDLERS ====================

/**
 * Handle result published event
 * Main entry point for analytics generation
 */
async function handleResultPublished(payload) {
    const { examId, departmentId, courseId, semester, studentIds, publishedBy } = payload;
    const academicYear = payload.academicYear || getCurrentAcademicYear();

    console.log(`[Analytics] Handling RESULT_PUBLISHED event for exam:${examId}`);

    // Create jobs for all analytics types
    await Promise.all([
        // Semester-level analytics
        createAnalyticsJob('semester_analytics', {
            departmentId,
            courseId,
            semester,
            academicYear,
            examId,
            triggerSource: 'result_publish'
        }, { priority: 1, createdBy: publishedBy }),

        // Student CGPA & placement updates
        createAnalyticsJob('cgpa_update', {
            studentIds,
            semester,
            academicYear
        }, { priority: 2, createdBy: publishedBy })
    ]);

    // Get subjects from exam for subject analytics
    const exam = await Exam.findById(examId).select('subjectId').lean();
    if (exam?.subjectId) {
        await createAnalyticsJob('subject_analytics', {
            subjectId: exam.subjectId,
            academicYear
        }, { priority: 3, createdBy: publishedBy });
    }
}

// ==================== EXPORTS ====================

module.exports = {
    // Core analytics functions
    generateSemesterAnalytics,
    generateSubjectAnalytics,
    updateStudentPerformanceBulk,

    // Helper functions
    calculateDenseRankings,
    calculateGPA,
    getGradeFromPercentage,

    // Job queue functions
    createAnalyticsJob,
    processAnalyticsJob,
    processPendingJobs,
    triggerFullAnalyticsRefresh,

    // Event handlers
    handleResultPublished,

    // Constants
    getCurrentAcademicYear
};
