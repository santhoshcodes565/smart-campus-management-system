const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
        required: true
    },
    answer: {
        type: String,
        default: ''
    },
    marksObtained: {
        type: Number,
        default: 0
    },
    evaluated: {
        type: Boolean,
        default: false
    },
    feedback: {
        type: String,
        default: ''
    }
}, { _id: false });

const examAttemptSchema = new mongoose.Schema({
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    answers: [answerSchema],
    totalScore: {
        type: Number,
        default: 0
    },
    maxScore: {
        type: Number,
        default: 0
    },
    percentage: {
        type: Number,
        default: 0
    },
    grade: {
        type: String,
        enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F', '-'],
        default: '-'
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    submittedAt: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['in_progress', 'submitted', 'evaluated'],
        default: 'in_progress'
    },
    // Track if auto-submitted due to timeout
    autoSubmitted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Compound unique index - one attempt per student per exam
examAttemptSchema.index({ examId: 1, studentId: 1 }, { unique: true });
examAttemptSchema.index({ studentId: 1, status: 1 });

// Calculate grade based on percentage
examAttemptSchema.methods.calculateGrade = function () {
    const pct = this.percentage;
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B+';
    if (pct >= 60) return 'B';
    if (pct >= 50) return 'C+';
    if (pct >= 40) return 'C';
    if (pct >= 33) return 'D';
    return 'F';
};

// Calculate total score and update percentage/grade
examAttemptSchema.methods.calculateTotal = function () {
    this.totalScore = this.answers.reduce((sum, ans) => sum + (ans.marksObtained || 0), 0);
    if (this.maxScore > 0) {
        this.percentage = ((this.totalScore / this.maxScore) * 100).toFixed(2);
    }
    this.grade = this.calculateGrade();
};

module.exports = mongoose.model('ExamAttempt', examAttemptSchema);
