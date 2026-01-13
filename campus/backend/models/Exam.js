const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Exam name is required'],
        trim: true
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    // Online Exam Extensions
    classId: {
        type: String, // Format: "DEPT-YEAR-SECTION" e.g., "CSE-3-A"
        default: null
    },
    facultyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty',
        default: null
    },
    semester: {
        type: Number,
        required: true,
        min: 1,
        max: 8
    },
    examType: {
        type: String,
        required: true,
        enum: ['internal', 'midterm', 'endterm', 'practical', 'assignment', 'quiz', 'online']
    },
    // Online exam mode
    examMode: {
        type: String,
        enum: ['mcq', 'descriptive', 'mixed'],
        default: 'mcq'
    },
    maxMarks: {
        type: Number,
        required: true,
        default: 100
    },
    passingMarks: {
        type: Number,
        default: 40
    },
    date: {
        type: Date,
        required: true
    },
    // Online exam time window
    startTime: {
        type: Date,
        default: null
    },
    endTime: {
        type: Date,
        default: null
    },
    duration: {
        type: Number, // in minutes
        default: 60
    },
    status: {
        type: String,
        enum: ['draft', 'scheduled', 'published', 'ongoing', 'completed', 'cancelled'],
        default: 'draft'
    },
    instructions: {
        type: String,
        default: ''
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes for faster queries
examSchema.index({ courseId: 1, semester: 1 });
examSchema.index({ subjectId: 1, examType: 1 });
examSchema.index({ date: 1 });
examSchema.index({ facultyId: 1, status: 1 });
examSchema.index({ classId: 1, status: 1 });

module.exports = mongoose.model('Exam', examSchema);

