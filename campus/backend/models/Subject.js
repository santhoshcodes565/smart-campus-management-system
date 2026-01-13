const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Subject name is required'],
        trim: true
    },
    code: {
        type: String,
        required: [true, 'Subject code is required'],
        uppercase: true,
        trim: true,
        unique: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: [true, 'Course is required']
    },
    semester: {
        type: Number,
        required: [true, 'Semester is required'],
        min: 1,
        max: 12
    },
    credits: {
        type: Number,
        default: 3,
        min: 1,
        max: 6
    },
    type: {
        type: String,
        enum: ['theory', 'practical', 'elective'],
        default: 'theory'
    },
    facultyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty',
        default: null
    },
    description: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Compound index for unique subject per course per semester
subjectSchema.index({ name: 1, courseId: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);
