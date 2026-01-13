const Exam = require('../models/Exam');
const Question = require('../models/Question');
const ExamAttempt = require('../models/ExamAttempt');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// ==================== FACULTY FUNCTIONS ====================

// @desc    Create a new online exam
// @route   POST /api/faculty/online-exams
// @access  Faculty
const createExam = async (req, res, next) => {
    try {
        const { name, subjectId, courseId, classId, semester, duration, startTime, endTime, examMode, maxMarks, instructions } = req.body;

        const faculty = await Faculty.findOne({ userId: req.user._id });
        if (!faculty) {
            return errorResponse(res, 404, 'Faculty not found');
        }

        const exam = await Exam.create({
            name,
            subjectId,
            courseId,
            classId,
            facultyId: faculty._id,
            semester: semester || 1,
            examType: 'online',
            examMode: examMode || 'mcq',
            maxMarks: maxMarks || 100,
            duration: duration || 60,
            date: new Date(startTime) || new Date(),
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            instructions: instructions || '',
            status: 'draft',
            createdBy: req.user._id
        });

        return successResponse(res, 201, 'Exam created successfully', exam);
    } catch (error) {
        next(error);
    }
};

// @desc    Get faculty's online exams
// @route   GET /api/faculty/online-exams
// @access  Faculty
const getMyExams = async (req, res, next) => {
    try {
        const faculty = await Faculty.findOne({ userId: req.user._id });
        if (!faculty) {
            return errorResponse(res, 404, 'Faculty not found');
        }

        const { status, subjectId } = req.query;
        let query = { facultyId: faculty._id, examType: 'online' };

        if (status) query.status = status;
        if (subjectId) query.subjectId = subjectId;

        const exams = await Exam.find(query)
            .populate('subjectId', 'name code')
            .populate('courseId', 'name code')
            .sort({ createdAt: -1 });

        // Get question count for each exam
        const examsWithCount = await Promise.all(exams.map(async (exam) => {
            const questionCount = await Question.countDocuments({ examId: exam._id });
            const attemptCount = await ExamAttempt.countDocuments({ examId: exam._id });
            return { ...exam.toObject(), questionCount, attemptCount };
        }));

        return successResponse(res, 200, 'Exams retrieved', examsWithCount);
    } catch (error) {
        next(error);
    }
};

// @desc    Update exam
// @route   PUT /api/faculty/online-exams/:id
// @access  Faculty
const updateExam = async (req, res, next) => {
    try {
        const faculty = await Faculty.findOne({ userId: req.user._id });
        if (!faculty) {
            return errorResponse(res, 404, 'Faculty not found');
        }

        const exam = await Exam.findOne({ _id: req.params.id, facultyId: faculty._id });
        if (!exam) {
            return errorResponse(res, 404, 'Exam not found or not authorized');
        }

        if (exam.status !== 'draft') {
            return errorResponse(res, 400, 'Cannot update a published or completed exam');
        }

        const updates = req.body;
        Object.keys(updates).forEach(key => {
            if (key !== '_id' && key !== 'facultyId') {
                exam[key] = updates[key];
            }
        });

        await exam.save();
        return successResponse(res, 200, 'Exam updated successfully', exam);
    } catch (error) {
        next(error);
    }
};

// @desc    Publish exam
// @route   PUT /api/faculty/online-exams/:id/publish
// @access  Faculty
const publishExam = async (req, res, next) => {
    try {
        const faculty = await Faculty.findOne({ userId: req.user._id });
        if (!faculty) {
            return errorResponse(res, 404, 'Faculty not found');
        }

        const exam = await Exam.findOne({ _id: req.params.id, facultyId: faculty._id });
        if (!exam) {
            return errorResponse(res, 404, 'Exam not found or not authorized');
        }

        // Check if exam has questions
        const questionCount = await Question.countDocuments({ examId: exam._id });
        if (questionCount === 0) {
            return errorResponse(res, 400, 'Cannot publish exam without questions');
        }

        exam.status = 'published';
        await exam.save();

        return successResponse(res, 200, 'Exam published successfully', exam);
    } catch (error) {
        next(error);
    }
};

// @desc    Add question to exam
// @route   POST /api/faculty/online-exams/:id/questions
// @access  Faculty
const addQuestion = async (req, res, next) => {
    try {
        const faculty = await Faculty.findOne({ userId: req.user._id });
        if (!faculty) {
            return errorResponse(res, 404, 'Faculty not found');
        }

        const exam = await Exam.findOne({ _id: req.params.id, facultyId: faculty._id });
        if (!exam) {
            return errorResponse(res, 404, 'Exam not found or not authorized');
        }

        const { questionType, questionText, options, correctAnswer, marks, explanation } = req.body;

        // Get current question count for ordering
        const order = await Question.countDocuments({ examId: exam._id });

        const question = await Question.create({
            examId: exam._id,
            questionType,
            questionText,
            options: questionType === 'mcq' ? options : [],
            correctAnswer: questionType === 'mcq' ? correctAnswer : null,
            marks: marks || 1,
            order: order + 1,
            explanation: explanation || ''
        });

        return successResponse(res, 201, 'Question added successfully', question);
    } catch (error) {
        next(error);
    }
};

// @desc    Get exam questions
// @route   GET /api/faculty/online-exams/:id/questions
// @access  Faculty
const getQuestions = async (req, res, next) => {
    try {
        const faculty = await Faculty.findOne({ userId: req.user._id });
        if (!faculty) {
            return errorResponse(res, 404, 'Faculty not found');
        }

        const exam = await Exam.findOne({ _id: req.params.id, facultyId: faculty._id });
        if (!exam) {
            return errorResponse(res, 404, 'Exam not found or not authorized');
        }

        const questions = await Question.find({ examId: exam._id }).sort({ order: 1 });
        const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

        return successResponse(res, 200, 'Questions retrieved', { questions, totalMarks });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete question
// @route   DELETE /api/faculty/online-exams/:id/questions/:questionId
// @access  Faculty
const deleteQuestion = async (req, res, next) => {
    try {
        const faculty = await Faculty.findOne({ userId: req.user._id });
        if (!faculty) {
            return errorResponse(res, 404, 'Faculty not found');
        }

        const exam = await Exam.findOne({ _id: req.params.id, facultyId: faculty._id });
        if (!exam) {
            return errorResponse(res, 404, 'Exam not found or not authorized');
        }

        if (exam.status !== 'draft') {
            return errorResponse(res, 400, 'Cannot delete questions from published exam');
        }

        await Question.findByIdAndDelete(req.params.questionId);
        return successResponse(res, 200, 'Question deleted successfully');
    } catch (error) {
        next(error);
    }
};

// @desc    Get exam results (for faculty)
// @route   GET /api/faculty/online-exams/:id/results
// @access  Faculty
const getExamResults = async (req, res, next) => {
    try {
        const faculty = await Faculty.findOne({ userId: req.user._id });
        if (!faculty) {
            return errorResponse(res, 404, 'Faculty not found');
        }

        const exam = await Exam.findOne({ _id: req.params.id, facultyId: faculty._id })
            .populate('subjectId', 'name code');
        if (!exam) {
            return errorResponse(res, 404, 'Exam not found or not authorized');
        }

        const attempts = await ExamAttempt.find({ examId: exam._id })
            .populate({
                path: 'studentId',
                populate: { path: 'userId', select: 'name email' }
            })
            .sort({ submittedAt: -1 });

        // Calculate statistics
        const totalAttempts = attempts.length;
        const submittedAttempts = attempts.filter(a => a.status !== 'in_progress');
        const avgScore = submittedAttempts.length > 0
            ? (submittedAttempts.reduce((sum, a) => sum + a.totalScore, 0) / submittedAttempts.length).toFixed(2)
            : 0;
        const passCount = submittedAttempts.filter(a => a.percentage >= 40).length;

        return successResponse(res, 200, 'Results retrieved', {
            exam,
            attempts,
            stats: {
                totalAttempts,
                submitted: submittedAttempts.length,
                avgScore,
                passCount,
                failCount: submittedAttempts.length - passCount
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Evaluate descriptive answers
// @route   PUT /api/faculty/online-exams/:id/evaluate
// @access  Faculty
const evaluateDescriptive = async (req, res, next) => {
    try {
        const { attemptId, evaluations } = req.body;
        // evaluations: [{ questionId, marksObtained, feedback }]

        const faculty = await Faculty.findOne({ userId: req.user._id });
        if (!faculty) {
            return errorResponse(res, 404, 'Faculty not found');
        }

        const attempt = await ExamAttempt.findById(attemptId);
        if (!attempt) {
            return errorResponse(res, 404, 'Attempt not found');
        }

        const exam = await Exam.findOne({ _id: attempt.examId, facultyId: faculty._id });
        if (!exam) {
            return errorResponse(res, 403, 'Not authorized to evaluate this exam');
        }

        // Update evaluations
        for (const eval of evaluations) {
            const answerIndex = attempt.answers.findIndex(a => a.questionId.toString() === eval.questionId);
            if (answerIndex !== -1) {
                attempt.answers[answerIndex].marksObtained = eval.marksObtained;
                attempt.answers[answerIndex].feedback = eval.feedback || '';
                attempt.answers[answerIndex].evaluated = true;
            }
        }

        // Check if all answers are evaluated
        const allEvaluated = attempt.answers.every(a => a.evaluated);
        if (allEvaluated) {
            attempt.status = 'evaluated';
        }

        attempt.calculateTotal();
        await attempt.save();

        return successResponse(res, 200, 'Evaluation saved successfully', attempt);
    } catch (error) {
        next(error);
    }
};

// ==================== STUDENT FUNCTIONS ====================

// @desc    Get available exams for student
// @route   GET /api/student/online-exams
// @access  Student
const getAvailableExams = async (req, res, next) => {
    try {
        const student = await Student.findOne({ userId: req.user._id })
            .populate('departmentId', 'code');
        if (!student) {
            return errorResponse(res, 404, 'Student not found');
        }

        // Build class ID from student data (e.g., "CSE-3-A")
        const classId = `${student.departmentId?.code || 'GEN'}-${student.year}-${student.section}`;
        const now = new Date();

        const exams = await Exam.find({
            examType: 'online',
            status: { $in: ['published', 'ongoing', 'completed'] },
            $or: [
                { classId: classId },
                { classId: null } // Exams for all students
            ]
        })
            .populate('subjectId', 'name code')
            .populate('courseId', 'name code')
            .populate('facultyId')
            .sort({ startTime: -1 });

        // Check attempt status for each exam
        const examsWithStatus = await Promise.all(exams.map(async (exam) => {
            const attempt = await ExamAttempt.findOne({ examId: exam._id, studentId: student._id });
            const examObj = exam.toObject();

            // Determine exam availability
            const isUpcoming = now < new Date(exam.startTime);
            const isOngoing = now >= new Date(exam.startTime) && now <= new Date(exam.endTime);
            const isExpired = now > new Date(exam.endTime);

            return {
                ...examObj,
                attemptStatus: attempt?.status || null,
                canAttempt: isOngoing && (!attempt || attempt.status === 'in_progress'),
                isUpcoming,
                isOngoing,
                isExpired
            };
        }));

        return successResponse(res, 200, 'Exams retrieved', examsWithStatus);
    } catch (error) {
        next(error);
    }
};

// @desc    Get exam for attempt (with questions, no answers shown)
// @route   GET /api/student/online-exams/:id
// @access  Student
const getExamForAttempt = async (req, res, next) => {
    try {
        const student = await Student.findOne({ userId: req.user._id });
        if (!student) {
            return errorResponse(res, 404, 'Student not found');
        }

        const exam = await Exam.findById(req.params.id)
            .populate('subjectId', 'name code')
            .populate('courseId', 'name code');
        if (!exam) {
            return errorResponse(res, 404, 'Exam not found');
        }

        // Check time window
        const now = new Date();
        if (now < new Date(exam.startTime)) {
            return errorResponse(res, 400, 'Exam has not started yet');
        }
        if (now > new Date(exam.endTime)) {
            return errorResponse(res, 400, 'Exam has ended');
        }

        // Get questions (without correct answers for MCQ)
        const questions = await Question.find({ examId: exam._id })
            .select('-correctAnswer -explanation')
            .sort({ order: 1 });

        // Check for existing attempt
        let attempt = await ExamAttempt.findOne({ examId: exam._id, studentId: student._id });

        return successResponse(res, 200, 'Exam retrieved', {
            exam,
            questions,
            attempt: attempt || null,
            serverTime: now
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Start exam attempt
// @route   POST /api/student/online-exams/:id/start
// @access  Student
const startExam = async (req, res, next) => {
    try {
        const student = await Student.findOne({ userId: req.user._id });
        if (!student) {
            return errorResponse(res, 404, 'Student not found');
        }

        const exam = await Exam.findById(req.params.id);
        if (!exam) {
            return errorResponse(res, 404, 'Exam not found');
        }

        // Check time window
        const now = new Date();
        if (now < new Date(exam.startTime)) {
            return errorResponse(res, 400, 'Exam has not started yet');
        }
        if (now > new Date(exam.endTime)) {
            return errorResponse(res, 400, 'Exam has ended');
        }

        // Check for existing attempt
        let attempt = await ExamAttempt.findOne({ examId: exam._id, studentId: student._id });
        if (attempt && attempt.status !== 'in_progress') {
            return errorResponse(res, 400, 'You have already submitted this exam');
        }

        if (!attempt) {
            // Get questions for max score calculation
            const totalMarks = await Question.getExamTotalMarks(exam._id);

            attempt = await ExamAttempt.create({
                examId: exam._id,
                studentId: student._id,
                maxScore: totalMarks,
                startedAt: now,
                status: 'in_progress'
            });
        }

        return successResponse(res, 200, 'Exam started', {
            attempt,
            examEndTime: exam.endTime,
            duration: exam.duration
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Submit exam
// @route   POST /api/student/online-exams/:id/submit
// @access  Student
const submitExam = async (req, res, next) => {
    try {
        const { answers, autoSubmitted } = req.body;
        // answers: [{ questionId, answer }]

        const student = await Student.findOne({ userId: req.user._id });
        if (!student) {
            return errorResponse(res, 404, 'Student not found');
        }

        const exam = await Exam.findById(req.params.id);
        if (!exam) {
            return errorResponse(res, 404, 'Exam not found');
        }

        let attempt = await ExamAttempt.findOne({ examId: exam._id, studentId: student._id });
        if (!attempt) {
            return errorResponse(res, 400, 'No exam attempt found. Please start the exam first.');
        }
        if (attempt.status !== 'in_progress') {
            return errorResponse(res, 400, 'Exam already submitted');
        }

        // Get all questions for evaluation
        const questions = await Question.find({ examId: exam._id });
        const questionMap = {};
        questions.forEach(q => { questionMap[q._id.toString()] = q; });

        // Process answers and auto-evaluate MCQ
        const processedAnswers = answers.map(ans => {
            const question = questionMap[ans.questionId];
            if (!question) return null;

            let marksObtained = 0;
            let evaluated = false;

            if (question.questionType === 'mcq') {
                // Auto-evaluate MCQ
                if (ans.answer === question.correctAnswer) {
                    marksObtained = question.marks;
                }
                evaluated = true;
            }

            return {
                questionId: ans.questionId,
                answer: ans.answer,
                marksObtained,
                evaluated
            };
        }).filter(a => a !== null);

        attempt.answers = processedAnswers;
        attempt.submittedAt = new Date();
        attempt.autoSubmitted = autoSubmitted || false;

        // Check if all MCQ are evaluated (descriptive need manual eval)
        const allEvaluated = processedAnswers.every(a => a.evaluated);
        attempt.status = allEvaluated ? 'evaluated' : 'submitted';

        attempt.calculateTotal();
        await attempt.save();

        return successResponse(res, 200, 'Exam submitted successfully', {
            totalScore: attempt.totalScore,
            maxScore: attempt.maxScore,
            percentage: attempt.percentage,
            grade: attempt.grade,
            status: attempt.status
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get student's exam results
// @route   GET /api/student/online-exams/results
// @access  Student
const getStudentResults = async (req, res, next) => {
    try {
        const student = await Student.findOne({ userId: req.user._id });
        if (!student) {
            return errorResponse(res, 404, 'Student not found');
        }

        const attempts = await ExamAttempt.find({
            studentId: student._id,
            status: { $in: ['submitted', 'evaluated'] }
        })
            .populate({
                path: 'examId',
                populate: [
                    { path: 'subjectId', select: 'name code' },
                    { path: 'courseId', select: 'name code' }
                ]
            })
            .sort({ submittedAt: -1 });

        return successResponse(res, 200, 'Results retrieved', attempts);
    } catch (error) {
        next(error);
    }
};

// ==================== ADMIN FUNCTIONS ====================

// @desc    Get all online exams
// @route   GET /api/admin/online-exams
// @access  Admin
const getAllExams = async (req, res, next) => {
    try {
        const { status, facultyId, subjectId } = req.query;
        let query = { examType: 'online' };

        if (status) query.status = status;
        if (facultyId) query.facultyId = facultyId;
        if (subjectId) query.subjectId = subjectId;

        const exams = await Exam.find(query)
            .populate('subjectId', 'name code')
            .populate('courseId', 'name code')
            .populate({
                path: 'facultyId',
                populate: { path: 'userId', select: 'name' }
            })
            .sort({ createdAt: -1 });

        // Get stats for each exam
        const examsWithStats = await Promise.all(exams.map(async (exam) => {
            const questionCount = await Question.countDocuments({ examId: exam._id });
            const attemptCount = await ExamAttempt.countDocuments({ examId: exam._id });
            const submittedCount = await ExamAttempt.countDocuments({ examId: exam._id, status: { $ne: 'in_progress' } });
            return { ...exam.toObject(), questionCount, attemptCount, submittedCount };
        }));

        return successResponse(res, 200, 'Exams retrieved', examsWithStats);
    } catch (error) {
        next(error);
    }
};

// @desc    Get exam results (admin)
// @route   GET /api/admin/online-exams/:id/results
// @access  Admin
const getAdminExamResults = async (req, res, next) => {
    try {
        const exam = await Exam.findById(req.params.id)
            .populate('subjectId', 'name code')
            .populate('courseId', 'name code')
            .populate({
                path: 'facultyId',
                populate: { path: 'userId', select: 'name' }
            });

        if (!exam) {
            return errorResponse(res, 404, 'Exam not found');
        }

        const attempts = await ExamAttempt.find({ examId: exam._id })
            .populate({
                path: 'studentId',
                populate: { path: 'userId', select: 'name email' }
            })
            .sort({ submittedAt: -1 });

        // Calculate statistics
        const submittedAttempts = attempts.filter(a => a.status !== 'in_progress');
        const avgScore = submittedAttempts.length > 0
            ? (submittedAttempts.reduce((sum, a) => sum + a.totalScore, 0) / submittedAttempts.length).toFixed(2)
            : 0;
        const avgPercentage = submittedAttempts.length > 0
            ? (submittedAttempts.reduce((sum, a) => sum + parseFloat(a.percentage), 0) / submittedAttempts.length).toFixed(2)
            : 0;
        const passCount = submittedAttempts.filter(a => a.percentage >= 40).length;

        return successResponse(res, 200, 'Results retrieved', {
            exam,
            attempts,
            stats: {
                totalAttempts: attempts.length,
                submitted: submittedAttempts.length,
                avgScore,
                avgPercentage,
                passCount,
                failCount: submittedAttempts.length - passCount,
                passRate: submittedAttempts.length > 0 ? ((passCount / submittedAttempts.length) * 100).toFixed(1) : 0
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get exam analytics
// @route   GET /api/admin/online-exams/analytics
// @access  Admin
const getExamAnalytics = async (req, res, next) => {
    try {
        // Overall stats
        const totalExams = await Exam.countDocuments({ examType: 'online' });
        const publishedExams = await Exam.countDocuments({ examType: 'online', status: { $in: ['published', 'ongoing', 'completed'] } });
        const totalAttempts = await ExamAttempt.countDocuments();
        const completedAttempts = await ExamAttempt.countDocuments({ status: { $in: ['submitted', 'evaluated'] } });

        // Average scores by status
        const avgScoreData = await ExamAttempt.aggregate([
            { $match: { status: { $in: ['submitted', 'evaluated'] } } },
            { $group: { _id: null, avgScore: { $avg: '$totalScore' }, avgPercentage: { $avg: { $toDouble: '$percentage' } } } }
        ]);

        return successResponse(res, 200, 'Analytics retrieved', {
            totalExams,
            publishedExams,
            draftExams: totalExams - publishedExams,
            totalAttempts,
            completedAttempts,
            avgScore: avgScoreData.length > 0 ? avgScoreData[0].avgScore.toFixed(2) : 0,
            avgPercentage: avgScoreData.length > 0 ? avgScoreData[0].avgPercentage.toFixed(2) : 0
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    // Faculty
    createExam,
    getMyExams,
    updateExam,
    publishExam,
    addQuestion,
    getQuestions,
    deleteQuestion,
    getExamResults,
    evaluateDescriptive,
    // Student
    getAvailableExams,
    getExamForAttempt,
    startExam,
    submitExam,
    getStudentResults,
    // Admin
    getAllExams,
    getAdminExamResults,
    getExamAnalytics
};
