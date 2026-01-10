const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
    department: {
        type: String,
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    section: {
        type: String,
        required: true
    },
    day: {
        type: String,
        required: true,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    },
    slots: [{
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
        faculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Faculty'
        },
        room: {
            type: String,
            default: ''
        },
        type: {
            type: String,
            enum: ['lecture', 'lab', 'tutorial', 'break'],
            default: 'lecture'
        }
    }]
}, {
    timestamps: true
});

// Compound index for unique timetable per day/section
timetableSchema.index({ department: 1, year: 1, section: 1, day: 1 }, { unique: true });

module.exports = mongoose.model('Timetable', timetableSchema);
