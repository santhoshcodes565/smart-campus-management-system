/**
 * Analytics Job Model
 * Queue-ready job tracking for async analytics processing
 * 
 * Designed for future integration with Redis/BullMQ
 * Currently uses MongoDB as job queue (works without Redis)
 * 
 * Features:
 * - Retry mechanism with max attempts
 * - Job status tracking
 * - Error logging
 * - Priority queue support
 */

const mongoose = require('mongoose');

const analyticsJobSchema = new mongoose.Schema({
    // Job type identifier
    jobType: {
        type: String,
        required: true,
        enum: [
            'semester_analytics',
            'cgpa_update',
            'placement_eligibility',
            'subject_analytics',
            'student_trend',
            'full_refresh',
            'department_rollup'
        ]
    },

    // Job status
    status: {
        type: String,
        required: true,
        enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
        default: 'pending'
    },

    // Priority for processing order
    priority: {
        type: Number,
        default: 5,  // 1 = highest, 10 = lowest
        min: 1,
        max: 10
    },

    // Job payload (flexible for different job types)
    payload: {
        // Common fields
        departmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department'
        },
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course'
        },
        semester: Number,
        academicYear: String,

        // For batch student updates
        studentIds: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student'
        }],

        // For subject analytics
        subjectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subject'
        },

        // For exam-triggered analytics
        examId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Exam'
        },

        // Additional data
        triggerSource: String,
        options: mongoose.Schema.Types.Mixed
    },

    // Retry mechanism
    attempts: {
        type: Number,
        default: 0
    },
    maxAttempts: {
        type: Number,
        default: 3
    },

    // Error tracking
    error: {
        type: String,
        default: ''
    },
    errorStack: {
        type: String,
        default: ''
    },
    lastErrorAt: {
        type: Date
    },

    // Timing
    scheduledFor: {
        type: Date,
        default: Date.now
    },
    startedAt: {
        type: Date
    },
    completedAt: {
        type: Date
    },
    processingTimeMs: {
        type: Number
    },

    // Result tracking
    result: {
        recordsProcessed: Number,
        recordsCreated: Number,
        recordsUpdated: Number,
        summary: String
    },

    // Creator tracking
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    processedBy: {
        type: String  // Worker ID or hostname
    }
}, {
    timestamps: true
});

// ==================== INDEXES ====================

// Job queue polling (get pending jobs in priority order)
analyticsJobSchema.index(
    { status: 1, priority: 1, scheduledFor: 1 }
);

// Job type stats
analyticsJobSchema.index({ jobType: 1, status: 1 });

// Cleanup old completed jobs
analyticsJobSchema.index({ completedAt: 1 }, { expireAfterSeconds: 604800 }); // 7 days

// Failed job monitoring
analyticsJobSchema.index({ status: 1, lastErrorAt: -1 });

// ==================== STATIC METHODS ====================

/**
 * Create a new job
 */
analyticsJobSchema.statics.createJob = async function (jobType, payload, options = {}) {
    return this.create({
        jobType,
        payload,
        priority: options.priority || 5,
        scheduledFor: options.scheduledFor || new Date(),
        createdBy: options.createdBy,
        maxAttempts: options.maxAttempts || 3
    });
};

/**
 * Get next pending job for processing
 */
analyticsJobSchema.statics.getNextPendingJob = async function () {
    return this.findOneAndUpdate(
        {
            status: 'pending',
            scheduledFor: { $lte: new Date() }
        },
        {
            $set: {
                status: 'processing',
                startedAt: new Date()
            },
            $inc: { attempts: 1 }
        },
        {
            new: true,
            sort: { priority: 1, scheduledFor: 1 }
        }
    );
};

/**
 * Mark job as completed
 */
analyticsJobSchema.statics.completeJob = async function (jobId, result = {}) {
    const job = await this.findById(jobId);
    if (!job) return null;

    const processingTimeMs = job.startedAt
        ? Date.now() - job.startedAt.getTime()
        : 0;

    return this.findByIdAndUpdate(
        jobId,
        {
            $set: {
                status: 'completed',
                completedAt: new Date(),
                processingTimeMs,
                result
            }
        },
        { new: true }
    );
};

/**
 * Mark job as failed (with retry logic)
 */
analyticsJobSchema.statics.failJob = async function (jobId, error) {
    const job = await this.findById(jobId);
    if (!job) return null;

    const shouldRetry = job.attempts < job.maxAttempts;

    return this.findByIdAndUpdate(
        jobId,
        {
            $set: {
                status: shouldRetry ? 'pending' : 'failed',
                error: error.message || String(error),
                errorStack: error.stack || '',
                lastErrorAt: new Date(),
                // Exponential backoff for retry
                scheduledFor: shouldRetry
                    ? new Date(Date.now() + Math.pow(2, job.attempts) * 1000 * 60)
                    : undefined
            }
        },
        { new: true }
    );
};

/**
 * Get job statistics
 */
analyticsJobSchema.statics.getStats = async function () {
    return this.aggregate([
        {
            $group: {
                _id: { status: '$status', jobType: '$jobType' },
                count: { $sum: 1 },
                avgProcessingTime: { $avg: '$processingTimeMs' }
            }
        }
    ]);
};

/**
 * Cleanup stuck jobs (processing for too long)
 */
analyticsJobSchema.statics.cleanupStuckJobs = async function (maxProcessingMinutes = 30) {
    const threshold = new Date(Date.now() - maxProcessingMinutes * 60 * 1000);

    return this.updateMany(
        {
            status: 'processing',
            startedAt: { $lt: threshold }
        },
        {
            $set: { status: 'pending' },
            $inc: { attempts: 1 }
        }
    );
};

module.exports = mongoose.model('AnalyticsJob', analyticsJobSchema);
