/**
 * Academic Analytics Controller
 * API endpoints for academic intelligence dashboards
 * 
 * ACCESS CONTROL:
 * - Admin: Full access to all analytics
 * - Faculty: Subject/class analytics only
 * - Student: Personal performance only
 * 
 * PERFORMANCE:
 * - All endpoints read from pre-computed aggregates
 * - NEVER compute analytics on request
 * - Millisecond response times
 */

const AcademicAnalytics = require('../models/AcademicAnalytics');
const StudentPerformance = require('../models/StudentPerformance');
const SubjectAnalytics = require('../models/SubjectAnalytics');
const AnalyticsJob = require('../models/AnalyticsJob');
const Student = require('../models/Student');
const Department = require('../models/Department');
const Course = require('../models/Course');
const Subject = require('../models/Subject');
const Faculty = require('../models/Faculty');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const analyticsService = require('../services/academicAnalyticsService');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// ==================== ADMIN ENDPOINTS ====================

/**
 * @desc    Get dashboard overview KPIs
 * @route   GET /api/admin/academic-analytics/overview
 * @access  Admin
 */
const getOverviewKPIs = asyncHandler(async (req, res) => {
    const { academicYear, departmentId } = req.query;
    const currentYear = academicYear || analyticsService.getCurrentAcademicYear();

    // Build match condition
    const match = { academicYear: currentYear, isOfficial: true };
    if (departmentId) {
        match.departmentId = new mongoose.Types.ObjectId(departmentId);
    }

    // Aggregate KPIs from all official analytics
    const kpis = await AcademicAnalytics.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                totalStudents: { $sum: '$totalStudents' },
                totalPassed: { $sum: '$passCount' },
                totalFailed: { $sum: '$failCount' },
                avgGPA: { $avg: '$averageGPA' },
                maxGPA: { $max: '$highestGPA' },
                departmentCount: { $addToSet: '$departmentId' }
            }
        }
    ]);

    // Get placement eligible count
    const placementEligibleCount = await Student.countDocuments({
        placementEligible: true,
        ...(departmentId && { departmentId: new mongoose.Types.ObjectId(departmentId) })
    });

    // Get at-risk student count
    const atRiskCount = await StudentPerformance.countDocuments({
        atRisk: true,
        ...(departmentId && { departmentId: new mongoose.Types.ObjectId(departmentId) })
    });

    // Get grade distribution totals
    const gradeDistribution = await AcademicAnalytics.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                O: { $sum: '$gradeDistribution.O' },
                Aplus: { $sum: '$gradeDistribution.Aplus' },
                A: { $sum: '$gradeDistribution.A' },
                B: { $sum: '$gradeDistribution.B' },
                C: { $sum: '$gradeDistribution.C' },
                D: { $sum: '$gradeDistribution.D' },
                F: { $sum: '$gradeDistribution.F' }
            }
        }
    ]);

    const result = kpis[0] || {
        totalStudents: 0,
        totalPassed: 0,
        totalFailed: 0,
        avgGPA: 0,
        maxGPA: 0,
        departmentCount: []
    };

    const passPercentage = result.totalStudents > 0
        ? parseFloat(((result.totalPassed / result.totalStudents) * 100).toFixed(2))
        : 0;

    successResponse(res, 200, 'Overview KPIs fetched successfully', {
        academicYear: currentYear,
        totalStudents: result.totalStudents,
        passCount: result.totalPassed,
        failCount: result.totalFailed,
        passPercentage,
        averageGPA: parseFloat((result.avgGPA || 0).toFixed(2)),
        highestGPA: result.maxGPA || 0,
        departmentCount: result.departmentCount.length,
        placementEligibleCount,
        atRiskCount,
        gradeDistribution: gradeDistribution[0] || {
            O: 0, Aplus: 0, A: 0, B: 0, C: 0, D: 0, F: 0
        }
    });
});

/**
 * @desc    Get department-level analytics
 * @route   GET /api/admin/academic-analytics/department/:id
 * @access  Admin
 */
const getDepartmentAnalytics = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { academicYear, semester } = req.query;
    const currentYear = academicYear || analyticsService.getCurrentAcademicYear();

    // Get department info
    const department = await Department.findById(id).lean();
    if (!department) {
        return errorResponse(res, 404, 'Department not found');
    }

    // Build match
    const match = {
        departmentId: new mongoose.Types.ObjectId(id),
        academicYear: currentYear,
        isOfficial: true
    };
    if (semester) {
        match.semester = parseInt(semester);
    }

    // Get all analytics for this department
    const analytics = await AcademicAnalytics.find(match)
        .populate('courseId', 'name code')
        .sort({ semester: 1 })
        .lean();

    // Aggregate totals
    const totals = analytics.reduce((acc, a) => ({
        totalStudents: acc.totalStudents + a.totalStudents,
        passCount: acc.passCount + a.passCount,
        failCount: acc.failCount + a.failCount,
        gpaSum: acc.gpaSum + (a.averageGPA * a.totalStudents),
        gradeDistribution: {
            O: acc.gradeDistribution.O + a.gradeDistribution.O,
            Aplus: acc.gradeDistribution.Aplus + a.gradeDistribution.Aplus,
            A: acc.gradeDistribution.A + a.gradeDistribution.A,
            B: acc.gradeDistribution.B + a.gradeDistribution.B,
            C: acc.gradeDistribution.C + a.gradeDistribution.C,
            D: acc.gradeDistribution.D + a.gradeDistribution.D,
            F: acc.gradeDistribution.F + a.gradeDistribution.F
        }
    }), {
        totalStudents: 0,
        passCount: 0,
        failCount: 0,
        gpaSum: 0,
        gradeDistribution: { O: 0, Aplus: 0, A: 0, B: 0, C: 0, D: 0, F: 0 }
    });

    const avgGPA = totals.totalStudents > 0 ? totals.gpaSum / totals.totalStudents : 0;
    const passPercentage = totals.totalStudents > 0
        ? (totals.passCount / totals.totalStudents) * 100
        : 0;

    // Get toppers for this department
    const toppers = await StudentPerformance.find({
        departmentId: new mongoose.Types.ObjectId(id)
    })
        .sort({ cgpa: -1 })
        .limit(10)
        .populate({
            path: 'studentId',
            select: 'rollNo userId',
            populate: { path: 'userId', select: 'name' }
        })
        .lean();

    successResponse(res, 200, 'Department analytics fetched successfully', {
        department: {
            _id: department._id,
            name: department.name,
            code: department.code
        },
        academicYear: currentYear,
        summary: {
            totalStudents: totals.totalStudents,
            passCount: totals.passCount,
            failCount: totals.failCount,
            passPercentage: parseFloat(passPercentage.toFixed(2)),
            averageGPA: parseFloat(avgGPA.toFixed(2))
        },
        gradeDistribution: totals.gradeDistribution,
        semesterWise: analytics.map(a => ({
            semester: a.semester,
            course: a.courseId,
            totalStudents: a.totalStudents,
            passPercentage: a.passPercentage,
            averageGPA: a.averageGPA,
            version: a.version
        })),
        toppers: toppers.map((t, idx) => ({
            rank: idx + 1,
            studentId: t.studentId?._id,
            name: t.studentId?.userId?.name || 'N/A',
            rollNo: t.studentId?.rollNo,
            cgpa: t.cgpa
        }))
    });
});

/**
 * @desc    Get semester-wise trend
 * @route   GET /api/admin/academic-analytics/semester-trend
 * @access  Admin
 */
const getSemesterTrend = asyncHandler(async (req, res) => {
    const { departmentId, courseId, academicYear } = req.query;
    const currentYear = academicYear || analyticsService.getCurrentAcademicYear();

    const match = { academicYear: currentYear, isOfficial: true };
    if (departmentId) match.departmentId = new mongoose.Types.ObjectId(departmentId);
    if (courseId) match.courseId = new mongoose.Types.ObjectId(courseId);

    const trend = await AcademicAnalytics.aggregate([
        { $match: match },
        {
            $group: {
                _id: '$semester',
                totalStudents: { $sum: '$totalStudents' },
                passCount: { $sum: '$passCount' },
                failCount: { $sum: '$failCount' },
                avgGPA: { $avg: '$averageGPA' }
            }
        },
        { $sort: { _id: 1 } },
        {
            $project: {
                semester: '$_id',
                totalStudents: 1,
                passCount: 1,
                failCount: 1,
                passPercentage: {
                    $cond: [
                        { $gt: ['$totalStudents', 0] },
                        { $multiply: [{ $divide: ['$passCount', '$totalStudents'] }, 100] },
                        0
                    ]
                },
                averageGPA: { $round: ['$avgGPA', 2] }
            }
        }
    ]);

    successResponse(res, 200, 'Semester trend fetched successfully', {
        academicYear: currentYear,
        trend
    });
});

/**
 * @desc    Get top performers (toppers)
 * @route   GET /api/admin/academic-analytics/toppers
 * @access  Admin
 */
const getToppers = asyncHandler(async (req, res) => {
    const { departmentId, limit = 20 } = req.query;

    const match = {};
    if (departmentId) {
        match.departmentId = new mongoose.Types.ObjectId(departmentId);
    }

    const toppers = await StudentPerformance.find(match)
        .sort({ cgpa: -1 })
        .limit(parseInt(limit))
        .populate({
            path: 'studentId',
            select: 'rollNo userId departmentId courseId semester',
            populate: [
                { path: 'userId', select: 'name email' },
                { path: 'departmentId', select: 'name code' },
                { path: 'courseId', select: 'name code' }
            ]
        })
        .lean();

    // Apply dense ranking
    const ranked = analyticsService.calculateDenseRankings(
        toppers.map(t => ({ studentId: t.studentId?._id, gpa: t.cgpa }))
    );

    const result = toppers.map((t, idx) => ({
        rank: ranked[idx]?.rank || idx + 1,
        studentId: t.studentId?._id,
        name: t.studentId?.userId?.name || 'N/A',
        rollNo: t.studentId?.rollNo,
        departmentName: t.studentId?.departmentId?.name,
        courseName: t.studentId?.courseId?.name,
        semester: t.studentId?.semester,
        cgpa: t.cgpa,
        performanceTrend: t.performanceTrend
    }));

    successResponse(res, 200, 'Toppers fetched successfully', { toppers: result });
});

/**
 * @desc    Get at-risk students
 * @route   GET /api/admin/academic-analytics/at-risk-students
 * @access  Admin
 */
const getAtRiskStudents = asyncHandler(async (req, res) => {
    const { departmentId, riskLevel, limit = 50, page = 1 } = req.query;

    const match = { atRisk: true };
    if (departmentId) match.departmentId = new mongoose.Types.ObjectId(departmentId);
    if (riskLevel) match.riskLevel = riskLevel;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [students, total] = await Promise.all([
        StudentPerformance.find(match)
            .sort({ riskLevel: -1, cgpa: 1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate({
                path: 'studentId',
                select: 'rollNo userId departmentId semester',
                populate: [
                    { path: 'userId', select: 'name email' },
                    { path: 'departmentId', select: 'name' }
                ]
            })
            .lean(),
        StudentPerformance.countDocuments(match)
    ]);

    const result = students.map(s => ({
        studentId: s.studentId?._id,
        name: s.studentId?.userId?.name || 'N/A',
        email: s.studentId?.userId?.email,
        rollNo: s.studentId?.rollNo,
        department: s.studentId?.departmentId?.name,
        semester: s.studentId?.semester,
        cgpa: s.cgpa,
        riskLevel: s.riskLevel,
        riskFactors: s.riskFactors,
        activeArrears: s.activeArrears,
        performanceTrend: s.performanceTrend
    }));

    successResponse(res, 200, 'At-risk students fetched successfully', {
        students: result,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * @desc    Get top failed subjects
 * @route   GET /api/admin/academic-analytics/failed-subjects
 * @access  Admin
 */
const getTopFailedSubjects = asyncHandler(async (req, res) => {
    const { departmentId, academicYear, limit = 10 } = req.query;
    const currentYear = academicYear || analyticsService.getCurrentAcademicYear();

    const match = {
        academicYear: currentYear,
        passPercentage: { $lt: 50 }
    };
    if (departmentId) {
        match.departmentId = new mongoose.Types.ObjectId(departmentId);
    }

    const subjects = await SubjectAnalytics.find(match)
        .sort({ passPercentage: 1 })
        .limit(parseInt(limit))
        .populate('subjectId', 'name code semester')
        .populate('facultyId', 'userId')
        .lean();

    // Get faculty names
    const result = await Promise.all(subjects.map(async (s) => {
        let facultyName = 'Not Assigned';
        if (s.facultyId?.userId) {
            const user = await User.findById(s.facultyId.userId).select('name').lean();
            facultyName = user?.name || 'N/A';
        }

        return {
            subjectId: s.subjectId?._id,
            subjectName: s.subjectId?.name,
            subjectCode: s.subjectId?.code,
            semester: s.subjectId?.semester,
            facultyName,
            totalAttempts: s.totalAttempts,
            passCount: s.passCount,
            failCount: s.failCount,
            passPercentage: s.passPercentage,
            difficultyLevel: s.difficultyLevel,
            difficultyIndex: s.difficultyIndex
        };
    }));

    successResponse(res, 200, 'Failed subjects fetched successfully', {
        academicYear: currentYear,
        subjects: result
    });
});

/**
 * @desc    Get placement eligible students
 * @route   GET /api/admin/academic-analytics/placement-eligibility
 * @access  Admin
 */
const getPlacementEligibleStudents = asyncHandler(async (req, res) => {
    const { departmentId, minCGPA = 7.0, limit = 100, page = 1 } = req.query;

    const match = {
        placementEligible: true,
        cgpa: { $gte: parseFloat(minCGPA) }
    };
    if (departmentId) {
        match.departmentId = new mongoose.Types.ObjectId(departmentId);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [students, total] = await Promise.all([
        Student.find(match)
            .sort({ cgpa: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('userId', 'name email')
            .populate('departmentId', 'name code')
            .populate('courseId', 'name code')
            .lean(),
        Student.countDocuments(match)
    ]);

    const result = students.map(s => ({
        studentId: s._id,
        name: s.userId?.name || 'N/A',
        email: s.userId?.email,
        rollNo: s.rollNo,
        department: s.departmentId?.name,
        course: s.courseId?.name,
        semester: s.semester,
        cgpa: s.cgpa,
        activeArrears: s.activeArrears
    }));

    successResponse(res, 200, 'Placement eligible students fetched successfully', {
        students: result,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * @desc    Trigger manual analytics generation
 * @route   POST /api/admin/academic-analytics/generate
 * @access  Admin
 */
const triggerAnalyticsGeneration = asyncHandler(async (req, res) => {
    const { departmentId, courseId, semester, academicYear, fullRefresh } = req.body;
    const currentYear = academicYear || analyticsService.getCurrentAcademicYear();

    try {
        if (fullRefresh) {
            // Full system refresh
            const result = await analyticsService.triggerFullAnalyticsRefresh(currentYear);
            return successResponse(res, 200, 'Full analytics refresh initiated', result);
        }

        if (!departmentId || !courseId || !semester) {
            return errorResponse(res, 400, 'departmentId, courseId, and semester are required');
        }

        // Create job for specific scope
        const job = await analyticsService.createAnalyticsJob('semester_analytics', {
            departmentId,
            courseId,
            semester: parseInt(semester),
            academicYear: currentYear,
            triggerSource: 'manual_regeneration'
        }, { createdBy: req.user._id });

        successResponse(res, 200, 'Analytics generation job created', {
            jobId: job._id,
            status: job.status
        });

    } catch (error) {
        console.error('[Analytics Controller] Generation error:', error);
        errorResponse(res, 500, 'Failed to trigger analytics generation');
    }
});

// ==================== FACULTY ENDPOINTS ====================

/**
 * @desc    Get subject analytics (faculty view)
 * @route   GET /api/faculty/subject-analytics/:subjectId
 * @access  Faculty
 */
const getSubjectAnalytics = asyncHandler(async (req, res) => {
    const { subjectId } = req.params;
    const { academicYear } = req.query;
    const currentYear = academicYear || analyticsService.getCurrentAcademicYear();

    // Verify faculty has access to this subject
    const faculty = await Faculty.findOne({ userId: req.user._id }).lean();
    if (!faculty) {
        return errorResponse(res, 404, 'Faculty profile not found');
    }

    const subject = await Subject.findById(subjectId).lean();
    if (!subject) {
        return errorResponse(res, 404, 'Subject not found');
    }

    // Check if faculty is assigned to this subject
    if (subject.facultyId && subject.facultyId.toString() !== faculty._id.toString()) {
        return errorResponse(res, 403, 'You do not have access to this subject analytics');
    }

    const analytics = await SubjectAnalytics.findOne({
        subjectId,
        academicYear: currentYear
    }).lean();

    if (!analytics) {
        return successResponse(res, 200, 'No analytics data available', {
            subject: {
                _id: subject._id,
                name: subject.name,
                code: subject.code,
                semester: subject.semester
            },
            analytics: null
        });
    }

    successResponse(res, 200, 'Subject analytics fetched successfully', {
        subject: {
            _id: subject._id,
            name: subject.name,
            code: subject.code,
            semester: subject.semester
        },
        analytics: {
            academicYear: analytics.academicYear,
            totalAttempts: analytics.totalAttempts,
            passCount: analytics.passCount,
            failCount: analytics.failCount,
            passPercentage: analytics.passPercentage,
            averageMarks: analytics.averageMarks,
            highestMarks: analytics.highestMarks,
            lowestMarks: analytics.lowestMarks,
            medianMarks: analytics.medianMarks,
            gradeDistribution: analytics.gradeDistribution,
            difficultyLevel: analytics.difficultyLevel,
            difficultyIndex: analytics.difficultyIndex,
            historicalPassRates: analytics.historicalPassRates
        }
    });
});

/**
 * @desc    Get class analytics (faculty view)
 * @route   GET /api/faculty/class-analytics
 * @access  Faculty
 */
const getClassAnalytics = asyncHandler(async (req, res) => {
    const { departmentId, semester, section } = req.query;

    const faculty = await Faculty.findOne({ userId: req.user._id })
        .select('departmentId')
        .lean();

    if (!faculty) {
        return errorResponse(res, 404, 'Faculty profile not found');
    }

    // Use faculty's department if not specified
    const deptId = departmentId || faculty.departmentId;

    // Get students in this class
    const match = { departmentId: deptId };
    if (semester) match.semester = parseInt(semester);
    if (section) match.section = section;

    const performances = await StudentPerformance.find(match)
        .populate({
            path: 'studentId',
            select: 'rollNo userId section',
            populate: { path: 'userId', select: 'name' }
        })
        .lean();

    // Calculate class metrics
    const cgpas = performances.map(p => p.cgpa).filter(c => c > 0);
    const avgCGPA = cgpas.length > 0
        ? cgpas.reduce((a, b) => a + b, 0) / cgpas.length
        : 0;

    const atRiskCount = performances.filter(p => p.atRisk).length;

    // Get top performers
    const topPerformers = performances
        .sort((a, b) => b.cgpa - a.cgpa)
        .slice(0, 10)
        .map((p, idx) => ({
            rank: idx + 1,
            name: p.studentId?.userId?.name || 'N/A',
            rollNo: p.studentId?.rollNo,
            cgpa: p.cgpa
        }));

    // Get weak students
    const weakStudents = performances
        .filter(p => p.cgpa < 5.0 || p.atRisk)
        .sort((a, b) => a.cgpa - b.cgpa)
        .slice(0, 10)
        .map(p => ({
            name: p.studentId?.userId?.name || 'N/A',
            rollNo: p.studentId?.rollNo,
            cgpa: p.cgpa,
            riskLevel: p.riskLevel,
            activeArrears: p.activeArrears
        }));

    successResponse(res, 200, 'Class analytics fetched successfully', {
        classInfo: {
            departmentId: deptId,
            semester: semester || 'All',
            section: section || 'All'
        },
        summary: {
            totalStudents: performances.length,
            averageCGPA: parseFloat(avgCGPA.toFixed(2)),
            atRiskCount
        },
        topPerformers,
        weakStudents
    });
});

/**
 * @desc    Get weak students for faculty
 * @route   GET /api/faculty/weak-students
 * @access  Faculty
 */
const getWeakStudents = asyncHandler(async (req, res) => {
    const { threshold = 5.0, limit = 50 } = req.query;

    const faculty = await Faculty.findOne({ userId: req.user._id })
        .select('departmentId')
        .lean();

    if (!faculty) {
        return errorResponse(res, 404, 'Faculty profile not found');
    }

    const students = await StudentPerformance.find({
        departmentId: faculty.departmentId,
        $or: [
            { cgpa: { $lt: parseFloat(threshold) } },
            { atRisk: true }
        ]
    })
        .sort({ cgpa: 1, riskLevel: -1 })
        .limit(parseInt(limit))
        .populate({
            path: 'studentId',
            select: 'rollNo userId semester section',
            populate: { path: 'userId', select: 'name email' }
        })
        .lean();

    const result = students.map(s => ({
        studentId: s.studentId?._id,
        name: s.studentId?.userId?.name || 'N/A',
        email: s.studentId?.userId?.email,
        rollNo: s.studentId?.rollNo,
        semester: s.studentId?.semester,
        section: s.studentId?.section,
        cgpa: s.cgpa,
        riskLevel: s.riskLevel,
        riskFactors: s.riskFactors,
        activeArrears: s.activeArrears,
        performanceTrend: s.performanceTrend
    }));

    successResponse(res, 200, 'Weak students fetched successfully', { students: result });
});

// ==================== STUDENT ENDPOINTS ====================

/**
 * @desc    Get personal performance (student view)
 * @route   GET /api/student/performance
 * @access  Student
 */
const getMyPerformance = asyncHandler(async (req, res) => {
    const student = await Student.findOne({ userId: req.user._id })
        .select('_id rollNo departmentId courseId semester')
        .populate('departmentId', 'name')
        .populate('courseId', 'name')
        .lean();

    if (!student) {
        return errorResponse(res, 404, 'Student profile not found');
    }

    const performance = await StudentPerformance.findOne({
        studentId: student._id
    }).lean();

    if (!performance) {
        return successResponse(res, 200, 'No performance data available', {
            student: {
                rollNo: student.rollNo,
                department: student.departmentId?.name,
                course: student.courseId?.name,
                semester: student.semester
            },
            performance: null
        });
    }

    successResponse(res, 200, 'Performance fetched successfully', {
        student: {
            rollNo: student.rollNo,
            department: student.departmentId?.name,
            course: student.courseId?.name,
            semester: student.semester
        },
        performance: {
            cgpa: performance.cgpa,
            totalCredits: performance.totalCredits,
            creditsEarned: performance.creditsEarned,
            semesterWiseGPA: performance.semesterWiseGPA.map(s => ({
                semester: s.semester,
                gpa: s.gpa,
                passedSubjects: s.passedSubjects,
                failedSubjects: s.failedSubjects,
                totalSubjects: s.totalSubjects
            })),
            performanceTrend: performance.performanceTrend,
            activeArrears: performance.activeArrears
        }
    });
});

/**
 * @desc    Get placement eligibility status (student view)
 * @route   GET /api/student/placement-status
 * @access  Student
 */
const getPlacementStatus = asyncHandler(async (req, res) => {
    const student = await Student.findOne({ userId: req.user._id })
        .select('_id cgpa placementEligible activeArrears placementEligibilityUpdatedAt')
        .lean();

    if (!student) {
        return errorResponse(res, 404, 'Student profile not found');
    }

    const requirements = {
        minCGPA: 7.0,
        maxArrears: 0
    };

    const details = {
        cgpa: {
            required: requirements.minCGPA,
            current: student.cgpa,
            met: student.cgpa >= requirements.minCGPA
        },
        arrears: {
            required: requirements.maxArrears,
            current: student.activeArrears,
            met: student.activeArrears === requirements.maxArrears
        }
    };

    successResponse(res, 200, 'Placement status fetched successfully', {
        eligible: student.placementEligible,
        cgpa: student.cgpa,
        activeArrears: student.activeArrears,
        lastUpdated: student.placementEligibilityUpdatedAt,
        requirements,
        details
    });
});

// ==================== EXPORTS ====================

module.exports = {
    // Admin endpoints
    getOverviewKPIs,
    getDepartmentAnalytics,
    getSemesterTrend,
    getToppers,
    getAtRiskStudents,
    getTopFailedSubjects,
    getPlacementEligibleStudents,
    triggerAnalyticsGeneration,

    // Faculty endpoints
    getSubjectAnalytics,
    getClassAnalytics,
    getWeakStudents,

    // Student endpoints
    getMyPerformance,
    getPlacementStatus
};
