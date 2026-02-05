/**
 * Marks Event Emitter
 * Lightweight in-process event system using Node.js EventEmitter
 * 
 * NO Kafka, NO RabbitMQ, NO Redis
 * Simple, fast, and sufficient for current scale
 */

const EventEmitter = require('events');

// Single instance
const marksEvents = new EventEmitter();
marksEvents.setMaxListeners(10);

// ==================== EVENT TYPES ====================
const MARKS_EVENTS = {
    // Triggered when admin publishes results
    RESULTS_PUBLISHED: 'marks.results.published',

    // Triggered when analytics computation completes
    ANALYTICS_COMPLETE: 'marks.analytics.complete',

    // Triggered when analytics computation fails
    ANALYTICS_FAILED: 'marks.analytics.failed',

    // Triggered when results are reopened
    RESULTS_REOPENED: 'marks.results.reopened'
};

/**
 * Emit event with error handling
 */
function emitMarksEvent(eventType, payload) {
    try {
        console.log(`[MarksEvent] Emitting: ${eventType}`, {
            timestamp: new Date().toISOString(),
            scope: payload.scope || {}
        });
        marksEvents.emit(eventType, payload);
    } catch (error) {
        console.error(`[MarksEvent] Error emitting ${eventType}:`, error);
    }
}

/**
 * Subscribe to event with error handling
 */
function subscribeMarksEvent(eventType, handler, name = 'anonymous') {
    marksEvents.on(eventType, async (payload) => {
        try {
            console.log(`[MarksEvent] ${name} handling: ${eventType}`);
            await handler(payload);
        } catch (error) {
            console.error(`[MarksEvent] ${name} error handling ${eventType}:`, error);
        }
    });
    console.log(`[MarksEvent] ${name} subscribed to: ${eventType}`);
}

module.exports = {
    marksEvents,
    MARKS_EVENTS,
    emitMarksEvent,
    subscribeMarksEvent
};
