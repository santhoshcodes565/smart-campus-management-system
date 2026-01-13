const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    employeeId: {
        type: String,
        required: [true, 'Employee ID is required'],
        unique: true
    },
    designation: {
        type: String,
        required: true,
        enum: ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Lab Assistant']
    },
    // Module 3 Extension: Academic Assignment
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        default: null
    },
    subjectIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject'
    }],
    classIds: [{
        type: String  // e.g., "CSE-3-A", "ECE-2-B"
    }],
    // Legacy field (kept for backward compatibility)
    subjects: [{
        type: String
    }],
    qualification: {
        type: String,
        default: ''
    },
    experience: {
        type: Number,
        default: 0
    },
    joiningDate: {
        type: Date,
        default: Date.now
    },
    salary: {
        type: Number,
        default: 0
    },
    address: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Index for faster queries
facultySchema.index({ departmentId: 1 });

module.exports = mongoose.model('Faculty', facultySchema);
