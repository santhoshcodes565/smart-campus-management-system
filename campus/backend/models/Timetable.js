const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
    // === Academic Context ===
    academicYear: {
        type: String,
        required: true,
        default: '2025-26'  // e.g., "2025-26"
    },
    semester: {
        type: Number,
        required: true,
        default: 1,
        min: 1,
        max: 12
    },

    // === Class Identification (supports both string and ObjectId for backward compatibility) ===
    department: {
        type: String,
        required: true
    },
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
    year: {
        type: Number,
        required: true,
        min: 1,
        max: 6
    },
    section: {
        type: String,
        required: true
    },

    // === Day Configuration ===
    day: {
        type: String,
        required: true,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    },

    // === Period Slots ===
    slots: [{
        periodNumber: {
            type: Number,
            default: 1
        },
        startTime: {
            type: String,
            required: true
        },
        endTime: {
            type: String,
            required: true
        },
        subject: {
            type: String,
            required: true
        },
        subjectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subject',
            default: null
        },
        faculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Faculty'
        },
        facultyName: {
            type: String,
            default: ''  // Cached faculty name for quick display
        },
        room: {
            type: String,
            default: ''
        },
        type: {
            type: String,
            enum: ['lecture', 'lab', 'tutorial', 'break', 'free'],
            default: 'lecture'
        }
    }],

    // === Lifecycle Management ===
    status: {
        type: String,
        enum: ['draft', 'published', 'locked'],
        default: 'draft'
    },
    publishedAt: {
        type: Date,
        default: null
    },
    lockedAt: {
        type: Date,
        default: null
    },

    // === Audit Trail ===
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, {
    timestamps: true
});

// Compound index: One timetable per class per day per semester
timetableSchema.index(
    { academicYear: 1, semester: 1, department: 1, year: 1, section: 1, day: 1 },
    { unique: true }
);

// Faculty schedule lookup index (for conflict detection)
timetableSchema.index({ 'slots.faculty': 1, day: 1, status: 1 });

// Room lookup index (for conflict detection)
timetableSchema.index({ 'slots.room': 1, day: 1, 'slots.startTime': 1 });

module.exports = mongoose.model('Timetable', timetableSchema);
