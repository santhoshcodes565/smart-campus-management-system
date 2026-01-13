const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Department name is required'],
        trim: true,
        unique: true
    },
    code: {
        type: String,
        required: [true, 'Department code is required'],
        uppercase: true,
        trim: true,
        unique: true
    },
    description: {
        type: String,
        default: ''
    },
    headOfDepartment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty',
        default: null
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Department', departmentSchema);
