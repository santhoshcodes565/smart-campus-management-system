const Exam = require('../models/Exam');
const Result = require('../models/Result');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Subject = require('../models/Subject');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// ==================== ADMIN EXAM MANAGEMENT ====================

// @desc    Create exam
// @route   POST /api/admin/exams
// @access  Admin
const createExam = async (req, res, next) => {
    try {
        const { name, subjectId, courseId, semester, examType, maxMarks, passingMarks, date, duration } = req.body;

        const exam = await Exam.create({
            name,
            subjectId,
            courseId,
            semester,
            examType,
            maxMarks: maxMarks || 100,
            passingMarks: passingMarks || 40,
            date: new Date(date),
            duration: duration || 180,
            createdBy: req.user._id
        });

        return successResponse(res, 201, 'Exam created successfully', exam);
    } catch (error) {
        next(error);
    }
};

// @desc    Get all exams
// @route   GET /api/admin/exams
// @access  Admin
const getAllExams = async (req, res, next) => {
    try {
        const { courseId, semester, examType, status } = req.query;
        let query = {};

        if (courseId) query.courseId = courseId;
        if (semester) query.semester = parseInt(semester);
        if (examType) query.examType = examType;
        if (status) query.status = status;

        const exams = await Exam.find(query)
            .populate('subjectId', 'name code')
            .populate('courseId', 'name code')
            .sort({ date: -1 });

        return successResponse(res, 200, 'Exams retrieved', exams);
    } catch (error) {
        next(error);
    }
};

// @desc    Update exam
// @route   PUT /api/admin/exams/:id
// @access  Admin
const updateExam = async (req, res, next) => {
    try {
        const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!exam) {
            return errorResponse(res, 404, 'Exam not found');
        }
        return successResponse(res, 200, 'Exam updated successfully', exam);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete exam
// @route   DELETE /api/admin/exams/:id
// @access  Admin
const deleteExam = async (req, res, next) => {
    try {
        const exam = await Exam.findByIdAndDelete(req.params.id);
        if (!exam) {
            return errorResponse(res, 404, 'Exam not found');
        }
        // Also delete related results
        await Result.deleteMany({ examId: req.params.id });
        return successResponse(res, 200, 'Exam deleted successfully');
    } catch (error) {
        next(error);
    }
};

// @desc    Publish exam results
// @route   PUT /api/admin/exams/:id/publish
// @access  Admin
const publishResults = async (req, res, next) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam) {
            return errorResponse(res, 404, 'Exam not found');
        }

        exam.status = 'published';
        await exam.save();

        // Mark all results for this exam as published
        await Result.updateMany(
            { examId: req.params.id },
            { isPublished: true, publishedAt: new Date() }
        );

        return successResponse(res, 200, 'Results published successfully');
    } catch (error) {
        next(error);
    }
};

// ==================== FACULTY MARKS ENTRY ====================

// @desc    Get exams assigned to faculty (by subject)
// @route   GET /api/faculty/exams
// @access  Faculty
const getAssignedExams = async (req, res, next) => {
    try {
        const faculty = await Faculty.findOne({ userId: req.user._id });
        if (!faculty) {
            return errorResponse(res, 404, 'Faculty not found');
        }

        const exams = await Exam.find({
            subjectId: { $in: faculty.subjectIds || [] },
            status: { $in: ['scheduled', 'ongoing', 'completed'] }
        })
            .populate('subjectId', 'name code')
            .populate('courseId', 'name code')
            .sort({ date: -1 });

        return successResponse(res, 200, 'Assigned exams retrieved', exams);
    } catch (error) {
        next(error);
    }
};

// @desc    Enter marks for an exam
// @route   POST /api/faculty/exams/:id/marks
// @access  Faculty
const enterMarks = async (req, res, next) => {
    try {
        const { marks } = req.body; // Array of { studentId, marksObtained, remarks }

        if (!marks || !Array.isArray(marks)) {
            return errorResponse(res, 400, 'Marks array is required');
        }

        const faculty = await Faculty.findOne({ userId: req.user._id });
        if (!faculty) {
            return errorResponse(res, 404, 'Faculty not found');
        }

        const exam = await Exam.findById(req.params.id);
        if (!exam) {
            return errorResponse(res, 404, 'Exam not found');
        }

        const results = [];
        for (const mark of marks) {
            const result = await Result.findOneAndUpdate(
                { examId: req.params.id, studentId: mark.studentId },
                {
                    examId: req.params.id,
                    studentId: mark.studentId,
                    marksObtained: mark.marksObtained,
                    facultyId: faculty._id,
                    remarks: mark.remarks || ''
                },
                { upsert: true, new: true }
            );
            results.push(result);
        }

        // Update exam status if all marks entered
        exam.status = 'completed';
        await exam.save();

        return successResponse(res, 200, 'Marks entered successfully', { count: results.length });
    } catch (error) {
        next(error);
    }
};

// ==================== STUDENT RESULTS ====================

// @desc    Get student exam results
// @route   GET /api/student/results
// @access  Student
const getMyExamResults = async (req, res, next) => {
    try {
        const student = await Student.findOne({ userId: req.user._id });
        if (!student) {
            return errorResponse(res, 404, 'Student not found');
        }

        const { semester } = req.query;
        let query = { studentId: student._id, isPublished: true };

        const results = await Result.find(query)
            .populate({
                path: 'examId',
                match: semester ? { semester: parseInt(semester) } : {},
                populate: [
                    { path: 'subjectId', select: 'name code' },
                    { path: 'courseId', select: 'name code' }
                ]
            })
            .sort({ createdAt: -1 });

        // Filter out results where exam doesn't match semester filter
        const filteredResults = results.filter(r => r.examId !== null);

        return successResponse(res, 200, 'Results retrieved', filteredResults);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createExam,
    getAllExams,
    updateExam,
    deleteExam,
    publishResults,
    getAssignedExams,
    enterMarks,
    getMyExamResults
};
