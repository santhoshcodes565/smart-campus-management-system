const mongoose = require('mongoose');

const transportSchema = new mongoose.Schema({
    busNumber: {
        type: String,
        required: [true, 'Bus number is required'],
        unique: true
    },
    routeName: {
        type: String,
        required: true
    },
    stops: [{
        stopName: {
            type: String,
            required: true
        },
        arrivalTime: {
            type: String,
            required: true
        },
        order: {
            type: Number,
            required: true
        }
    }],
    driver: {
        name: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        licenseNo: {
            type: String,
            default: ''
        }
    },
    capacity: {
        type: Number,
        default: 40
    },
    currentOccupancy: {
        type: Number,
        default: 0
    },
    departureTime: {
        type: String,
        required: true
    },
    returnTime: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Transport', transportSchema);
