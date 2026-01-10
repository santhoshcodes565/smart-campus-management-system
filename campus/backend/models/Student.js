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
    year: {
        type: Number,
        required: true,
        min: 1,
        max: 4
    },
    section: {
        type: String,
        required: true
    },
    course: {
        type: String,
        required: true
    },
    semester: {
        type: Number,
        default: 1
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

module.exports = mongoose.model('Student', studentSchema);
