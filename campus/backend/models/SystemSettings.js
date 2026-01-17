const mongoose = require('mongoose');

/**
 * SystemSettings Model
 * Stores system-wide configuration and integrity flags
 * Used to prevent data loss and track system state
 */
const systemSettingsSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    lastModified: {
        type: Date,
        default: Date.now
    },
    modifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, {
    timestamps: true
});

// Static method to get a setting value
systemSettingsSchema.statics.getSetting = async function (key, defaultValue = null) {
    const setting = await this.findOne({ key });
    return setting ? setting.value : defaultValue;
};

// Static method to set a setting value
systemSettingsSchema.statics.setSetting = async function (key, value, description = '', modifiedBy = null) {
    return await this.findOneAndUpdate(
        { key },
        {
            value,
            description: description || undefined,
            lastModified: new Date(),
            modifiedBy
        },
        { upsert: true, new: true }
    );
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
