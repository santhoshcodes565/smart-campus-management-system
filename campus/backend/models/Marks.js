const mongoose = require('mongoose');

const marksSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    examType: {
        type: String,
        required: true,
        enum: ['internal1', 'internal2', 'internal3', 'midterm', 'final', 'assignment', 'practical']
    },
    marks: {
        type: Number,
        required: true,
        min: 0
    },
    maxMarks: {
        type: Number,
        required: true
    },
    semester: {
        type: Number,
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty',
        required: true
    },
    remarks: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Compound index for unique marks per student per subject per exam
marksSchema.index({ studentId: 1, subject: 1, examType: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model('Marks', marksSchema);
