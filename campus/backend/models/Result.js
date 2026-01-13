const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
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
    marksObtained: {
        type: Number,
        required: true,
        min: 0
    },
    grade: {
        type: String,
        enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F', 'AB', '-'],
        default: '-'
    },
    percentage: {
        type: Number,
        default: 0
    },
    facultyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty'
    },
    remarks: {
        type: String,
        default: ''
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    publishedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Compound unique index - one result per student per exam
resultSchema.index({ examId: 1, studentId: 1 }, { unique: true });

// Calculate grade before saving
resultSchema.pre('save', async function (next) {
    if (this.isModified('marksObtained')) {
        const Exam = mongoose.model('Exam');
        const exam = await Exam.findById(this.examId);
        if (exam) {
            this.percentage = ((this.marksObtained / exam.maxMarks) * 100).toFixed(2);

            // Auto-calculate grade
            const pct = this.percentage;
            if (pct >= 90) this.grade = 'A+';
            else if (pct >= 80) this.grade = 'A';
            else if (pct >= 70) this.grade = 'B+';
            else if (pct >= 60) this.grade = 'B';
            else if (pct >= 50) this.grade = 'C+';
            else if (pct >= 40) this.grade = 'C';
            else if (pct >= 33) this.grade = 'D';
            else this.grade = 'F';
        }
    }
    next();
});

module.exports = mongoose.model('Result', resultSchema);
