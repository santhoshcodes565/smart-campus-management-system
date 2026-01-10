const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    permissions: [{
        type: String,
        enum: ['manage_students', 'manage_faculty', 'manage_timetable', 'manage_transport', 'manage_fees', 'manage_notices', 'view_reports', 'system_settings']
    }],
    isSuperAdmin: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Admin', adminSchema);
