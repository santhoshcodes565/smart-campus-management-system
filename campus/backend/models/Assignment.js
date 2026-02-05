const mongoose = require('mongoose');

/**
 * Assignment Model
 * Stores student homework/assignments created by faculty
 */
const assignmentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Assignment title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
        type: String,
        required: [true, 'Assignment description is required'],
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    subjectName: {
        type: String,
        default: ''  // Cached for quick display
    },
    subjectCode: {
        type: String,
        default: ''  // Cached for quick lookup
    },
    facultyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty',
        required: true
    },
    facultyName: {
        type: String,
        default: ''  // Cached faculty name
    },
    // Target audience
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    semester: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    section: {
        type: String,
        required: true
    },
    year: {
        type: Number,
        required: true,
        min: 1,
        max: 6
    },
    // Dates
    assignedDate: {
        type: Date,
        default: Date.now
    },
    dueDate: {
        type: Date,
        required: [true, 'Due date is required']
    },
    // Status
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
    },
    // Priority
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    // Marks
    maxMarks: {
        type: Number,
        default: 0
    },
    // Attachments
    attachments: [{
        name: String,
        url: String,
        type: String
    }],
    // Instructions
    instructions: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Indexes for faster queries
assignmentSchema.index({ dueDate: 1, status: 1 });
assignmentSchema.index({ subjectId: 1, status: 1 });
assignmentSchema.index({ departmentId: 1, courseId: 1, semester: 1, section: 1 });
assignmentSchema.index({ facultyId: 1, createdAt: -1 });
assignmentSchema.index({ assignedDate: 1 });

/**
 * Get today's assignments for a student
 */
assignmentSchema.statics.getTodayAssignments = async function (studentInfo) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await this.find({
        departmentId: studentInfo.departmentId,
        courseId: studentInfo.courseId,
        semester: studentInfo.semester,
        section: studentInfo.section,
        status: 'active',
        assignedDate: { $gte: today, $lt: tomorrow }
    })
        .populate('subjectId', 'name code')
        .sort({ dueDate: 1 })
        .lean();
};

/**
 * Get assignments by subject
 */
assignmentSchema.statics.getBySubject = async function (subjectId, studentInfo) {
    return await this.find({
        subjectId,
        departmentId: studentInfo.departmentId,
        courseId: studentInfo.courseId,
        semester: studentInfo.semester,
        section: studentInfo.section,
        status: 'active'
    })
        .sort({ dueDate: 1 })
        .lean();
};

/**
 * Get upcoming assignments (due in next 7 days)
 */
assignmentSchema.statics.getUpcoming = async function (studentInfo) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    return await this.find({
        departmentId: studentInfo.departmentId,
        courseId: studentInfo.courseId,
        semester: studentInfo.semester,
        section: studentInfo.section,
        status: 'active',
        dueDate: { $gte: today, $lte: nextWeek }
    })
        .populate('subjectId', 'name code')
        .sort({ dueDate: 1 })
        .lean();
};

module.exports = mongoose.model('Assignment', assignmentSchema);
