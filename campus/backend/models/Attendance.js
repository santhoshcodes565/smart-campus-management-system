const mongoose = require('mongoose');

/**
 * Attendance V2 Schema
 * Enhanced for smart, strict, analytics-driven attendance
 * Backward compatible - old fields preserved
 */
const attendanceSchema = new mongoose.Schema({
    // ===== V1 LEGACY FIELDS (preserved for backward compatibility) =====
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        default: null  // Now optional - V2 uses records array
    },
    status: {
        type: String,
        enum: ['present', 'absent', 'late', 'excused'],
        default: null  // Now optional
    },
    subject: {
        type: String,
        default: null  // Legacy string field
    },
    markedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty',
        default: null
    },
    remarks: {
        type: String,
        default: ''
    },

    // ===== V2 ENHANCED FIELDS =====
    date: {
        type: Date,
        required: true
    },
    academicYear: {
        type: String,
        default: '2025-2026'
    },
    semester: {
        type: Number,
        min: 1,
        max: 8
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    },
    classSection: {
        type: String,  // "A", "B", "C", etc.
        default: 'A'
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject'
    },
    facultyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty'
    },
    // Statistics
    totalStudents: {
        type: Number,
        default: 0
    },
    presentCount: {
        type: Number,
        default: 0
    },
    absentCount: {
        type: Number,
        default: 0
    },
    // Student records (V2 embedded array)
    records: [{
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
            required: true
        },
        status: {
            type: String,
            enum: ['present', 'absent'],
            required: true
        },
        markedAt: {
            type: Date,
            default: Date.now
        }
    }],
    // Lock mechanism
    isLocked: {
        type: Boolean,
        default: false
    },
    isV2: {
        type: Boolean,
        default: true  // Flag to identify V2 records
    }
}, {
    timestamps: true
});

// ===== INDEXES =====

// V2 Unique constraint: One attendance per subject per day per class
attendanceSchema.index(
    { date: 1, subjectId: 1, semester: 1, classSection: 1 },
    { unique: true, sparse: true, partialFilterExpression: { isV2: true } }
);

// V1 Legacy index (preserved)
attendanceSchema.index({ studentId: 1, date: 1, subject: 1 }, { sparse: true });

// Performance indexes
attendanceSchema.index({ subjectId: 1 });
attendanceSchema.index({ facultyId: 1 });
attendanceSchema.index({ departmentId: 1, semester: 1 });
attendanceSchema.index({ 'records.studentId': 1 });
attendanceSchema.index({ date: -1 });

// ===== STATIC METHODS =====

/**
 * Check if attendance already exists for given date/subject/class
 */
attendanceSchema.statics.existsForDate = async function (date, subjectId, semester, classSection) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await this.findOne({
        date: { $gte: startOfDay, $lte: endOfDay },
        subjectId,
        semester,
        classSection,
        isV2: true
    });
};

/**
 * Get student attendance for a specific subject
 */
attendanceSchema.statics.getStudentSubjectAttendance = async function (studentId, subjectId) {
    const records = await this.find({
        'records.studentId': studentId,
        subjectId,
        isV2: true,
        isLocked: true
    }).lean();

    let present = 0, absent = 0;
    records.forEach(r => {
        const studentRecord = r.records.find(rec => rec.studentId.toString() === studentId.toString());
        if (studentRecord) {
            if (studentRecord.status === 'present') present++;
            else absent++;
        }
    });

    const total = present + absent;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(2) : 0;

    return { present, absent, total, percentage: parseFloat(percentage) };
};

module.exports = mongoose.model('Attendance', attendanceSchema);
