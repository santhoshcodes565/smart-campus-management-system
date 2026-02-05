/**
 * Analytics Event Handlers
 * Registers event listeners for analytics generation
 * 
 * USAGE: Import and call registerEventHandlers() at server startup
 */

const { subscribe, EVENTS } = require('./eventEmitter');
const analyticsService = require('./academicAnalyticsService');

/**
 * Register all analytics event handlers
 * Called once at server startup
 */
function registerEventHandlers() {
    console.log('[Analytics] Registering event handlers...');

    // Handle result publication - trigger analytics chain
    subscribe(EVENTS.RESULT_PUBLISHED, async (payload) => {
        console.log('[Analytics] RESULT_PUBLISHED event received:', {
            examId: payload.examId,
            studentCount: payload.studentIds?.length
        });

        try {
            await analyticsService.handleResultPublished(payload);
        } catch (error) {
            console.error('[Analytics] Failed to handle RESULT_PUBLISHED:', error.message);
        }
    });

    // Handle analytics generated - could be used for notifications
    subscribe(EVENTS.ANALYTICS_GENERATED, (payload) => {
        console.log('[Analytics] Analytics generated:', {
            analyticsId: payload.analyticsId,
            version: payload.version,
            summary: payload.summary
        });
    });

    // Handle CGPA updates
    subscribe(EVENTS.CGPA_UPDATED, (payload) => {
        console.log('[Analytics] CGPA updated for', payload.studentCount, 'students');
    });

    // Handle placement eligibility updates
    subscribe(EVENTS.PLACEMENT_UPDATED, (payload) => {
        console.log('[Analytics] Placement eligibility updated:', payload.studentCount, 'eligible');
    });

    // Handle job lifecycle events
    subscribe(EVENTS.JOB_CREATED, (payload) => {
        console.log('[Analytics] Job created:', payload.jobId, payload.jobType);
    });

    subscribe(EVENTS.JOB_COMPLETED, (payload) => {
        console.log('[Analytics] Job completed:', payload.jobId);
    });

    subscribe(EVENTS.JOB_FAILED, (payload) => {
        console.error('[Analytics] Job failed:', payload.jobId, payload.error);
    });

    console.log('[Analytics] Event handlers registered successfully');
}

module.exports = {
    registerEventHandlers
};
