const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Course name is required'],
        trim: true
    },
    code: {
        type: String,
        required: [true, 'Course code is required'],
        uppercase: true,
        trim: true,
        unique: true
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: [true, 'Department is required']
    },
    duration: {
        type: Number,
        required: [true, 'Duration is required'],
        min: 1,
        max: 6
    },
    durationType: {
        type: String,
        enum: ['year', 'semester'],
        default: 'year'
    },
    totalSemesters: {
        type: Number,
        default: function () {
            return this.durationType === 'year' ? this.duration * 2 : this.duration;
        }
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

// Compound index for unique course per department
courseSchema.index({ name: 1, departmentId: 1 }, { unique: true });

module.exports = mongoose.model('Course', courseSchema);
