const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true
    },
    questionType: {
        type: String,
        required: true,
        enum: ['mcq', 'descriptive']
    },
    questionText: {
        type: String,
        required: [true, 'Question text is required'],
        trim: true
    },
    // MCQ specific fields
    options: [{
        type: String,
        trim: true
    }],
    correctAnswer: {
        type: String,
        default: null // For MCQ: the correct option value
    },
    marks: {
        type: Number,
        required: true,
        default: 1
    },
    order: {
        type: Number,
        default: 0
    },
    // Optional: hint or explanation shown after submission
    explanation: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Indexes
questionSchema.index({ examId: 1, order: 1 });

// Virtual to get total questions for an exam
questionSchema.statics.getExamQuestionCount = async function (examId) {
    return await this.countDocuments({ examId });
};

// Get total marks for an exam
questionSchema.statics.getExamTotalMarks = async function (examId) {
    const result = await this.aggregate([
        { $match: { examId: new mongoose.Types.ObjectId(examId) } },
        { $group: { _id: null, totalMarks: { $sum: '$marks' } } }
    ]);
    return result.length > 0 ? result[0].totalMarks : 0;
};

module.exports = mongoose.model('Question', questionSchema);
