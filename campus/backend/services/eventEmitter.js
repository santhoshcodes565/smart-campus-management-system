/**
 * Analytics Event Emitter
 * Domain event system for decoupled analytics architecture
 * 
 * Events emitted:
 * - RESULT_PUBLISHED: Triggers analytics generation
 * - ANALYTICS_GENERATED: Notifies completion
 * - PLACEMENT_UPDATED: Triggers placement team notification
 * 
 * Subscribers:
 * - Analytics Generator
 * - CGPA Updater
 * - Placement Eligibility Engine
 * - Notification Service
 * 
 * This design allows adding new subscribers without modifying the exam controller
 */

const EventEmitter = require('events');

// Create a single event emitter instance
const analyticsEvents = new EventEmitter();

// Increase max listeners for scalability
analyticsEvents.setMaxListeners(20);

// ==================== EVENT TYPES ====================
const EVENTS = {
    // Triggered when admin publishes exam results
    RESULT_PUBLISHED: 'result.published',

    // Triggered when semester analytics generation completes
    ANALYTICS_GENERATED: 'analytics.generated',

    // Triggered when CGPA updates are complete
    CGPA_UPDATED: 'cgpa.updated',

    // Triggered when placement eligibility is recalculated
    PLACEMENT_UPDATED: 'placement.updated',

    // Triggered when subject analytics complete
    SUBJECT_ANALYTICS_GENERATED: 'subject.analytics.generated',

    // Triggered when at-risk students are identified
    RISK_ASSESSMENT_COMPLETE: 'risk.assessment.complete',

    // Analytics job events
    JOB_CREATED: 'job.created',
    JOB_COMPLETED: 'job.completed',
    JOB_FAILED: 'job.failed'
};

// ==================== EVENT PAYLOADS ====================

/**
 * @typedef {Object} ResultPublishedPayload
 * @property {string} examId - Published exam ID
 * @property {string} departmentId - Department ID
 * @property {string} courseId - Course ID
 * @property {number} semester - Semester number
 * @property {string} academicYear - Academic year (e.g., "2025-26")
 * @property {string[]} studentIds - Affected student IDs
 * @property {string} publishedBy - Admin user ID
 * @property {Date} publishedAt - Timestamp
 */

/**
 * @typedef {Object} AnalyticsGeneratedPayload
 * @property {string} analyticsId - Generated analytics document ID
 * @property {string} departmentId - Department ID
 * @property {number} semester - Semester number
 * @property {string} academicYear - Academic year
 * @property {number} version - Analytics version
 * @property {Object} summary - Generation summary
 */

// ==================== HELPER FUNCTIONS ====================

/**
 * Emit an event with error handling
 */
function emitEvent(eventType, payload) {
    try {
        console.log(`[Analytics Event] Emitting: ${eventType}`, {
            timestamp: new Date().toISOString(),
            payloadKeys: Object.keys(payload || {})
        });
        analyticsEvents.emit(eventType, payload);
    } catch (error) {
        console.error(`[Analytics Event] Error emitting ${eventType}:`, error);
    }
}

/**
 * Register an event subscriber with error handling
 */
function subscribe(eventType, handler, name = 'unnamed') {
    analyticsEvents.on(eventType, async (payload) => {
        try {
            console.log(`[Analytics Event] ${name} handling: ${eventType}`);
            await handler(payload);
        } catch (error) {
            console.error(`[Analytics Event] ${name} error handling ${eventType}:`, error);
        }
    });
    console.log(`[Analytics Event] ${name} subscribed to: ${eventType}`);
}

/**
 * Get current academic year based on date
 * July onwards = next academic year start
 */
function getCurrentAcademicYear() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    // Academic year starts in July (month 6)
    if (month >= 6) {
        return `${year}-${(year + 1).toString().slice(2)}`;
    } else {
        return `${year - 1}-${year.toString().slice(2)}`;
    }
}

module.exports = {
    analyticsEvents,
    EVENTS,
    emitEvent,
    subscribe,
    getCurrentAcademicYear
};
