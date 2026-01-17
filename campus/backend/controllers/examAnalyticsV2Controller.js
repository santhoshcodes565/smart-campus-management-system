/**
 * Exam Analytics V2 Controller
 * Provides comprehensive analytics for admin exam monitoring
 * Uses MongoDB Aggregation Pipelines for optimal performance
 */

const Exam = require('../models/Exam');
const ExamAttempt = require('../models/ExamAttempt');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Subject = require('../models/Subject');
const Course = require('../models/Course');
const Department = require('../models/Department');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const mongoose = require('mongoose');

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate difficulty index based on average score percentage
 */
const getDifficultyLabel = (avgPercentage) => {
    if (avgPercentage >= 70) return 'Easy';
    if (avgPercentage >= 50) return 'Moderate';
    return 'Hard';
};

/**
 * Calculate standard deviation
 */
const calculateStdDev = (values) => {
    if (!values || values.length === 0) return 0;
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    return Math.sqrt(variance);
};

/**
 * Calculate median
 */
const calculateMedian = (values) => {
    if (!values || values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Build filter match stage from query params
 */
const buildFilterMatch = (query) => {
    const match = {};

    if (query.department) {
        match['subject.department'] = new mongoose.Types.ObjectId(query.department);
    }
    if (query.course) {
        match.courseId = new mongoose.Types.ObjectId(query.course);
    }
    if (query.semester) {
        match.semester = parseInt(query.semester);
    }
    if (query.subject) {
        match.subjectId = new mongoose.Types.ObjectId(query.subject);
    }
    if (query.faculty) {
        match.facultyId = new mongoose.Types.ObjectId(query.faculty);
    }
    if (query.examType) {
        match.examType = query.examType;
    }
    if (query.status) {
        match.status = query.status;
    }

    return match;
};

// ==================== CONTROLLER FUNCTIONS ====================

/**
 * @desc    Get filter options for dropdowns
 * @route   GET /api/admin/exam-analytics/v2/filters
 * @access  Admin
 */
const getFilterOptions = async (req, res, next) => {
    try {
        const [departments, courses, subjects, faculty, exams] = await Promise.all([
            Department.find({}).select('name code').lean(),
            Course.find({}).select('name code departmentId').lean(),
            Subject.find({}).select('name code courseId').lean(),
            Faculty.find({}).populate('userId', 'name').lean(),
            Exam.distinct('examType')
        ]);

        // Get unique semesters from exams
        const semesters = await Exam.distinct('semester');

        return successResponse(res, 200, 'Filter options fetched', {
            departments,
            courses,
            subjects,
            faculty: faculty.map(f => ({
                _id: f._id,
                name: f.userId?.name || 'Unknown',
                department: f.departmentId
            })),
            semesters: semesters.sort((a, b) => a - b),
            examTypes: exams
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get dashboard KPIs
 * @route   GET /api/admin/exam-analytics/v2/kpis
 * @access  Admin
 */
const getDashboardKPIs = async (req, res, next) => {
    try {
        const filterMatch = buildFilterMatch(req.query);

        // Base match for completed/published exams
        const examMatch = {
            status: { $in: ['published', 'completed', 'ongoing'] },
            ...filterMatch
        };

        // Get exams with their attempts aggregated
        const examStats = await Exam.aggregate([
            { $match: examMatch },
            {
                $lookup: {
                    from: 'examattempts',
                    localField: '_id',
                    foreignField: 'examId',
                    as: 'attempts'
                }
            },
            {
                $lookup: {
                    from: 'subjects',
                    localField: 'subjectId',
                    foreignField: '_id',
                    as: 'subject'
                }
            },
            { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    name: 1,
                    maxMarks: 1,
                    passingMarks: 1,
                    totalAttempts: { $size: '$attempts' },
                    submittedAttempts: {
                        $size: {
                            $filter: {
                                input: '$attempts',
                                as: 'att',
                                cond: { $in: ['$$att.status', ['submitted', 'evaluated']] }
                            }
                        }
                    },
                    passedCount: {
                        $size: {
                            $filter: {
                                input: '$attempts',
                                as: 'att',
                                cond: {
                                    $and: [
                                        { $in: ['$$att.status', ['submitted', 'evaluated']] },
                                        { $gte: ['$$att.percentage', { $multiply: [{ $divide: ['$passingMarks', '$maxMarks'] }, 100] }] }
                                    ]
                                }
                            }
                        }
                    },
                    scores: {
                        $map: {
                            input: {
                                $filter: {
                                    input: '$attempts',
                                    as: 'att',
                                    cond: { $in: ['$$att.status', ['submitted', 'evaluated']] }
                                }
                            },
                            as: 'att',
                            in: '$$att.percentage'
                        }
                    }
                }
            }
        ]);

        // Calculate aggregated KPIs
        const totalExams = examStats.length;
        let totalAppeared = 0;
        let totalPassed = 0;
        let allScores = [];

        examStats.forEach(exam => {
            totalAppeared += exam.submittedAttempts;
            totalPassed += exam.passedCount;
            allScores = allScores.concat(exam.scores || []);
        });

        const totalFailed = totalAppeared - totalPassed;
        const avgScore = allScores.length > 0
            ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2)
            : 0;
        const medianScore = calculateMedian(allScores).toFixed(2);
        const stdDeviation = calculateStdDev(allScores).toFixed(2);

        // Get unique students enrolled (based on class matching - simplified)
        const totalStudents = await Student.countDocuments({});

        return successResponse(res, 200, 'KPIs fetched', {
            totalExams,
            totalStudentsEnrolled: totalStudents,
            studentsAppeared: totalAppeared,
            absentCount: 0, // Would need enrollment data per exam
            passPercentage: totalAppeared > 0 ? ((totalPassed / totalAppeared) * 100).toFixed(2) : 0,
            failPercentage: totalAppeared > 0 ? ((totalFailed / totalAppeared) * 100).toFixed(2) : 0,
            averageScore: parseFloat(avgScore),
            medianScore: parseFloat(medianScore),
            standardDeviation: parseFloat(stdDeviation),
            improvementPercentage: 0 // Would need historical comparison
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get exam table data with performance metrics
 * @route   GET /api/admin/exam-analytics/v2/exams
 * @access  Admin
 */
const getExamTableData = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const filterMatch = buildFilterMatch(req.query);
        const examMatch = {
            status: { $in: ['published', 'completed', 'ongoing', 'scheduled'] },
            ...filterMatch
        };

        const exams = await Exam.aggregate([
            { $match: examMatch },
            {
                $lookup: {
                    from: 'examattempts',
                    localField: '_id',
                    foreignField: 'examId',
                    as: 'attempts'
                }
            },
            {
                $lookup: {
                    from: 'subjects',
                    localField: 'subjectId',
                    foreignField: '_id',
                    as: 'subject'
                }
            },
            { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'faculties',
                    localField: 'facultyId',
                    foreignField: '_id',
                    as: 'faculty'
                }
            },
            { $unwind: { path: '$faculty', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'faculty.userId',
                    foreignField: '_id',
                    as: 'facultyUser'
                }
            },
            { $unwind: { path: '$facultyUser', preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    submittedAttempts: {
                        $filter: {
                            input: '$attempts',
                            as: 'att',
                            cond: { $in: ['$$att.status', ['submitted', 'evaluated']] }
                        }
                    }
                }
            },
            {
                $project: {
                    name: 1,
                    subjectName: '$subject.name',
                    subjectCode: '$subject.code',
                    semester: 1,
                    examType: 1,
                    maxMarks: 1,
                    passingMarks: 1,
                    status: 1,
                    date: 1,
                    facultyName: '$facultyUser.name',
                    facultyId: '$faculty._id',
                    totalAttempts: { $size: '$attempts' },
                    appearedCount: { $size: '$submittedAttempts' },
                    passedCount: {
                        $size: {
                            $filter: {
                                input: '$submittedAttempts',
                                as: 'att',
                                cond: { $gte: ['$$att.percentage', { $multiply: [{ $divide: ['$passingMarks', '$maxMarks'] }, 100] }] }
                            }
                        }
                    },
                    avgPercentage: { $avg: '$submittedAttempts.percentage' },
                    highestScore: { $max: '$submittedAttempts.totalScore' },
                    lowestScore: { $min: '$submittedAttempts.totalScore' },
                    highestPercentage: { $max: '$submittedAttempts.percentage' },
                    lowestPercentage: { $min: '$submittedAttempts.percentage' }
                }
            },
            { $sort: { date: -1 } },
            { $skip: skip },
            { $limit: limit }
        ]);

        // Transform results with difficulty index
        const transformedExams = exams.map(exam => ({
            _id: exam._id,
            name: exam.name,
            subject: exam.subjectName || 'N/A',
            subjectCode: exam.subjectCode || '',
            semester: exam.semester,
            examType: exam.examType,
            faculty: exam.facultyName || 'Unknown',
            facultyId: exam.facultyId,
            appeared: exam.appearedCount,
            total: exam.totalAttempts,
            passPercentage: exam.appearedCount > 0
                ? ((exam.passedCount / exam.appearedCount) * 100).toFixed(1)
                : 0,
            avgMarks: exam.avgPercentage ? exam.avgPercentage.toFixed(1) : 0,
            highest: exam.highestPercentage ? exam.highestPercentage.toFixed(1) : 0,
            lowest: exam.lowestPercentage ? exam.lowestPercentage.toFixed(1) : 0,
            difficultyIndex: getDifficultyLabel(exam.avgPercentage || 0),
            status: exam.status,
            date: exam.date
        }));

        // Get total count for pagination
        const totalCount = await Exam.countDocuments(examMatch);

        return successResponse(res, 200, 'Exams fetched', {
            exams: transformedExams,
            pagination: {
                page,
                limit,
                total: totalCount,
                pages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get detailed exam drill-down
 * @route   GET /api/admin/exam-analytics/v2/exam/:id
 * @access  Admin
 */
const getExamDrillDown = async (req, res, next) => {
    try {
        const examId = req.params.id;

        // Get exam with full details
        const exam = await Exam.findById(examId)
            .populate('subjectId', 'name code')
            .populate('courseId', 'name code')
            .populate({
                path: 'facultyId',
                populate: { path: 'userId', select: 'name email' }
            })
            .lean();

        if (!exam) {
            return errorResponse(res, 404, 'Exam not found');
        }

        // Get all attempts with student details
        const attempts = await ExamAttempt.find({ examId })
            .populate({
                path: 'studentId',
                populate: { path: 'userId', select: 'name email' }
            })
            .sort({ percentage: -1 })
            .lean();

        // Calculate grade distribution
        const gradeDistribution = {
            'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'D': 0, 'F': 0
        };

        const studentResults = attempts.map(att => {
            const isPassed = att.percentage >= ((exam.passingMarks / exam.maxMarks) * 100);
            if (att.grade && gradeDistribution.hasOwnProperty(att.grade)) {
                gradeDistribution[att.grade]++;
            }

            // Calculate time taken
            let timeTaken = 'N/A';
            if (att.startedAt && att.submittedAt) {
                const diffMs = new Date(att.submittedAt) - new Date(att.startedAt);
                const diffMins = Math.floor(diffMs / 60000);
                timeTaken = `${diffMins} mins`;
            }

            return {
                studentId: att.studentId?._id,
                name: att.studentId?.userId?.name || 'Unknown',
                registerNo: att.studentId?.rollNo || att.studentId?.registrationNumber || 'N/A',
                marks: att.totalScore,
                maxMarks: att.maxScore,
                percentage: att.percentage,
                grade: att.grade,
                passed: isPassed,
                timeTaken,
                status: att.status,
                submittedAt: att.submittedAt
            };
        });

        // Calculate marks distribution for histogram
        const marksRanges = [
            { range: '0-20', count: 0 },
            { range: '21-40', count: 0 },
            { range: '41-60', count: 0 },
            { range: '61-80', count: 0 },
            { range: '81-100', count: 0 }
        ];

        attempts.forEach(att => {
            const pct = att.percentage || 0;
            if (pct <= 20) marksRanges[0].count++;
            else if (pct <= 40) marksRanges[1].count++;
            else if (pct <= 60) marksRanges[2].count++;
            else if (pct <= 80) marksRanges[3].count++;
            else marksRanges[4].count++;
        });

        return successResponse(res, 200, 'Exam details fetched', {
            exam: {
                _id: exam._id,
                name: exam.name,
                subject: exam.subjectId?.name || 'N/A',
                subjectCode: exam.subjectId?.code || '',
                course: exam.courseId?.name || 'N/A',
                semester: exam.semester,
                examType: exam.examType,
                maxMarks: exam.maxMarks,
                passingMarks: exam.passingMarks,
                duration: exam.duration,
                date: exam.date,
                status: exam.status,
                faculty: {
                    name: exam.facultyId?.userId?.name || 'Unknown',
                    email: exam.facultyId?.userId?.email || ''
                }
            },
            statistics: {
                totalStudents: attempts.length,
                submitted: attempts.filter(a => a.status === 'submitted' || a.status === 'evaluated').length,
                passed: studentResults.filter(s => s.passed).length,
                failed: studentResults.filter(s => !s.passed && s.status !== 'in_progress').length,
                avgPercentage: attempts.length > 0
                    ? (attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / attempts.length).toFixed(2)
                    : 0
            },
            gradeDistribution,
            marksDistribution: marksRanges,
            students: studentResults
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get department-wise comparison
 * @route   GET /api/admin/exam-analytics/v2/departments
 * @access  Admin
 */
const getDepartmentComparison = async (req, res, next) => {
    try {
        const comparison = await Exam.aggregate([
            {
                $match: { status: { $in: ['published', 'completed'] } }
            },
            {
                $lookup: {
                    from: 'examattempts',
                    localField: '_id',
                    foreignField: 'examId',
                    as: 'attempts'
                }
            },
            {
                $lookup: {
                    from: 'subjects',
                    localField: 'subjectId',
                    foreignField: '_id',
                    as: 'subject'
                }
            },
            { $unwind: '$subject' },
            {
                $lookup: {
                    from: 'courses',
                    localField: 'subject.courseId',
                    foreignField: '_id',
                    as: 'course'
                }
            },
            { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'departments',
                    localField: 'course.departmentId',
                    foreignField: '_id',
                    as: 'department'
                }
            },
            { $unwind: { path: '$department', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$attempts', preserveNullAndEmptyArrays: true } },
            {
                $match: {
                    'attempts.status': { $in: ['submitted', 'evaluated'] }
                }
            },
            {
                $group: {
                    _id: '$department._id',
                    departmentName: { $first: '$department.name' },
                    departmentCode: { $first: '$department.code' },
                    totalAttempts: { $sum: 1 },
                    totalScore: { $sum: '$attempts.percentage' },
                    passedCount: {
                        $sum: {
                            $cond: [{ $gte: ['$attempts.percentage', 40] }, 1, 0]
                        }
                    }
                }
            },
            {
                $project: {
                    department: { $ifNull: ['$departmentName', 'Unknown'] },
                    code: { $ifNull: ['$departmentCode', 'UNK'] },
                    totalStudents: '$totalAttempts',
                    avgMarks: {
                        $round: [{ $divide: ['$totalScore', { $max: ['$totalAttempts', 1] }] }, 2]
                    },
                    passPercentage: {
                        $round: [
                            { $multiply: [{ $divide: ['$passedCount', { $max: ['$totalAttempts', 1] }] }, 100] },
                            2
                        ]
                    }
                }
            },
            { $sort: { avgMarks: -1 } }
        ]);

        return successResponse(res, 200, 'Department comparison fetched', comparison);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get semester-wise trend
 * @route   GET /api/admin/exam-analytics/v2/semesters
 * @access  Admin
 */
const getSemesterTrend = async (req, res, next) => {
    try {
        const trend = await Exam.aggregate([
            {
                $match: { status: { $in: ['published', 'completed'] } }
            },
            {
                $lookup: {
                    from: 'examattempts',
                    localField: '_id',
                    foreignField: 'examId',
                    as: 'attempts'
                }
            },
            { $unwind: { path: '$attempts', preserveNullAndEmptyArrays: true } },
            {
                $match: {
                    'attempts.status': { $in: ['submitted', 'evaluated'] }
                }
            },
            {
                $group: {
                    _id: '$semester',
                    totalAttempts: { $sum: 1 },
                    totalScore: { $sum: '$attempts.percentage' },
                    passedCount: {
                        $sum: {
                            $cond: [{ $gte: ['$attempts.percentage', 40] }, 1, 0]
                        }
                    }
                }
            },
            {
                $project: {
                    semester: '$_id',
                    totalStudents: '$totalAttempts',
                    avgMarks: {
                        $round: [{ $divide: ['$totalScore', { $max: ['$totalAttempts', 1] }] }, 2]
                    },
                    passPercentage: {
                        $round: [
                            { $multiply: [{ $divide: ['$passedCount', { $max: ['$totalAttempts', 1] }] }, 100] },
                            2
                        ]
                    }
                }
            },
            { $sort: { semester: 1 } }
        ]);

        return successResponse(res, 200, 'Semester trend fetched', trend);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get faculty performance metrics
 * @route   GET /api/admin/exam-analytics/v2/faculty
 * @access  Admin
 */
const getFacultyPerformance = async (req, res, next) => {
    try {
        const performance = await Exam.aggregate([
            {
                $match: {
                    status: { $in: ['published', 'completed'] },
                    facultyId: { $ne: null }
                }
            },
            {
                $lookup: {
                    from: 'examattempts',
                    localField: '_id',
                    foreignField: 'examId',
                    as: 'attempts'
                }
            },
            {
                $lookup: {
                    from: 'faculties',
                    localField: 'facultyId',
                    foreignField: '_id',
                    as: 'faculty'
                }
            },
            { $unwind: '$faculty' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'faculty.userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $addFields: {
                    submittedAttempts: {
                        $filter: {
                            input: '$attempts',
                            as: 'att',
                            cond: { $in: ['$$att.status', ['submitted', 'evaluated']] }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$facultyId',
                    facultyName: { $first: '$user.name' },
                    examsCount: { $sum: 1 },
                    allAttempts: { $push: '$submittedAttempts' },
                    avgScores: { $push: { $avg: '$submittedAttempts.percentage' } }
                }
            },
            {
                $project: {
                    facultyName: 1,
                    examsCount: 1,
                    totalAttempts: {
                        $reduce: {
                            input: '$allAttempts',
                            initialValue: 0,
                            in: { $add: ['$$value', { $size: '$$this' }] }
                        }
                    },
                    avgStudentScore: { $round: [{ $avg: '$avgScores' }, 2] },
                    difficultyConsistency: {
                        $round: [{ $stdDevPop: '$avgScores' }, 2]
                    }
                }
            },
            {
                $addFields: {
                    passPercentage: {
                        $cond: [
                            { $gte: ['$avgStudentScore', 40] },
                            { $round: [{ $multiply: [{ $divide: ['$avgStudentScore', 100] }, 100] }, 2] },
                            0
                        ]
                    }
                }
            },
            { $sort: { examsCount: -1 } }
        ]);

        return successResponse(res, 200, 'Faculty performance fetched', performance);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get at-risk and critical students
 * @route   GET /api/admin/exam-analytics/v2/risk-students
 * @access  Admin
 */
const getStudentRiskAnalysis = async (req, res, next) => {
    try {
        // Aggregate student performance across all exams
        const studentPerformance = await ExamAttempt.aggregate([
            {
                $match: { status: { $in: ['submitted', 'evaluated'] } }
            },
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
                $lookup: {
                    from: 'students',
                    localField: 'studentId',
                    foreignField: '_id',
                    as: 'student'
                }
            },
            { $unwind: '$student' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'student.userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $lookup: {
                    from: 'subjects',
                    localField: 'exam.subjectId',
                    foreignField: '_id',
                    as: 'subject'
                }
            },
            { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    isPassed: {
                        $gte: ['$percentage', { $multiply: [{ $divide: ['$exam.passingMarks', '$exam.maxMarks'] }, 100] }]
                    }
                }
            },
            {
                $group: {
                    _id: '$studentId',
                    studentName: { $first: '$user.name' },
                    registerNo: { $first: '$student.rollNo' },
                    totalExams: { $sum: 1 },
                    passedExams: { $sum: { $cond: ['$isPassed', 1, 0] } },
                    failedExams: { $sum: { $cond: ['$isPassed', 0, 1] } },
                    avgPercentage: { $avg: '$percentage' },
                    subjectsAttempted: { $addToSet: '$exam.subjectId' },
                    failedSubjects: {
                        $push: {
                            $cond: [
                                { $not: '$isPassed' },
                                { subject: '$subject.name', percentage: '$percentage' },
                                '$$REMOVE'
                            ]
                        }
                    }
                }
            },
            {
                $project: {
                    studentName: 1,
                    registerNo: 1,
                    totalExams: 1,
                    passedExams: 1,
                    failedExams: 1,
                    avgPercentage: { $round: ['$avgPercentage', 2] },
                    passPercentage: {
                        $round: [
                            { $multiply: [{ $divide: ['$passedExams', { $max: ['$totalExams', 1] }] }, 100] },
                            2
                        ]
                    },
                    subjectsCount: { $size: '$subjectsAttempted' },
                    failedSubjectsCount: { $size: '$failedSubjects' },
                    failedSubjects: 1
                }
            },
            {
                $addFields: {
                    riskLevel: {
                        $cond: [
                            {
                                $or: [
                                    { $gte: ['$failedExams', 3] },
                                    { $lt: ['$avgPercentage', 40] }
                                ]
                            },
                            'critical',
                            {
                                $cond: [
                                    {
                                        $or: [
                                            { $gte: ['$failedExams', 2] },
                                            { $lt: ['$passPercentage', 50] }
                                        ]
                                    },
                                    'at_risk',
                                    'normal'
                                ]
                            }
                        ]
                    }
                }
            },
            {
                $match: {
                    riskLevel: { $in: ['critical', 'at_risk'] }
                }
            },
            { $sort: { riskLevel: 1, avgPercentage: 1 } }
        ]);

        // Separate into categories
        const critical = studentPerformance.filter(s => s.riskLevel === 'critical');
        const atRisk = studentPerformance.filter(s => s.riskLevel === 'at_risk');

        return successResponse(res, 200, 'Risk analysis fetched', {
            summary: {
                criticalCount: critical.length,
                atRiskCount: atRisk.length,
                totalFlagged: studentPerformance.length
            },
            critical,
            atRisk
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getFilterOptions,
    getDashboardKPIs,
    getExamTableData,
    getExamDrillDown,
    getDepartmentComparison,
    getSemesterTrend,
    getFacultyPerformance,
    getStudentRiskAnalysis
};
