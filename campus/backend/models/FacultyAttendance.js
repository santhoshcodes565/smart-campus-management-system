/**
 * Faculty Attendance Model
 * 
 * Tracks faculty check-in/check-out times with one document per faculty per day.
 * Uses server timezone (Asia/Kolkata) for all time operations.
 * 
 * @module models/FacultyAttendance
 */

const mongoose = require('mongoose');

const facultyAttendanceSchema = new mongoose.Schema({
    // Reference to the User (faculty) document
    facultyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Faculty ID is required'],
        index: true
    },

    // Date in YYYY-MM-DD format (server timezone)
    date: {
        type: String,
        required: [true, 'Date is required'],
        match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
        index: true
    },

    // Check-in timestamp (server time)
    checkInTime: {
        type: Date,
        default: null
    },

    // Check-out timestamp (server time)
    checkOutTime: {
        type: Date,
        default: null
    },

    // Total working hours (calculated on check-out)
    totalWorkingHours: {
        type: Number,
        default: 0,
        min: 0
    },

    // Attendance status
    status: {
        type: String,
        enum: ['PRESENT', 'ABSENT', 'PARTIAL'],
        default: 'PRESENT'
    },

    // Optional note from faculty (read-only after save)
    note: {
        type: String,
        maxlength: [500, 'Note cannot exceed 500 characters'],
        trim: true,
        default: ''
    },

    // Admin can add/edit notes
    adminNote: {
        type: String,
        maxlength: [500, 'Admin note cannot exceed 500 characters'],
        trim: true,
        default: ''
    }
}, {
    timestamps: true
});

// Compound index for one document per faculty per day (enforces uniqueness)
facultyAttendanceSchema.index({ facultyId: 1, date: 1 }, { unique: true });

// Index for efficient date-based queries
facultyAttendanceSchema.index({ date: 1, status: 1 });

// Index for analytics queries
facultyAttendanceSchema.index({ facultyId: 1, createdAt: -1 });

/**
 * Virtual to get formatted check-in time
 */
facultyAttendanceSchema.virtual('formattedCheckIn').get(function () {
    if (!this.checkInTime) return null;
    return this.checkInTime.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
    });
});

/**
 * Virtual to get formatted check-out time
 */
facultyAttendanceSchema.virtual('formattedCheckOut').get(function () {
    if (!this.checkOutTime) return null;
    return this.checkOutTime.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
    });
});

// Enable virtuals in JSON output
facultyAttendanceSchema.set('toJSON', { virtuals: true });
facultyAttendanceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('FacultyAttendance', facultyAttendanceSchema);
