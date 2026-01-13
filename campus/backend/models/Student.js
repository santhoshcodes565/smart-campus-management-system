const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rollNo: {
        type: String,
        required: [true, 'Roll number is required'],
        unique: true
    },
    // Academic Assignment Fields (Module 2 Extension)
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        default: null
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        default: null
    },
    batch: {
        type: String,
        default: ''  // e.g., "2021-2025"
    },
    year: {
        type: Number,
        required: true,
        min: 1,
        max: 4
    },
    semester: {
        type: Number,
        default: 1,
        min: 1
    },
    section: {
        type: String,
        required: true
    },
    course: {
        type: String,
        required: true  // Keep for backward compatibility (e.g., "B.Tech")
    },
    admissionDate: {
        type: Date,
        default: Date.now
    },
    guardianName: {
        type: String,
        default: ''
    },
    guardianPhone: {
        type: String,
        default: ''
    },
    address: {
        type: String,
        default: ''
    },
    bloodGroup: {
        type: String,
        default: ''
    },
    transportId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transport',
        default: null
    }
}, {
    timestamps: true
});

// Index for faster queries
studentSchema.index({ departmentId: 1, courseId: 1, year: 1, section: 1 });
module.exports = mongoose.model('Student', studentSchema);
