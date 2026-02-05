/**
 * Dashboard Event Manager
 * Centralized service for emitting real-time dashboard updates
 * 
 * EVENTS EMITTED:
 * - dashboard:update - Triggers frontend to refetch dashboard data
 * 
 * STRATEGY: Emit lightweight signals, frontend refetches via API
 * This prevents memory pressure from large socket payloads
 */

// Will be set by server.js after io is initialized
let io = null;

/**
 * Initialize with Socket.IO instance
 * Called from server.js after io is created
 */
function initDashboardEvents(socketIO) {
    io = socketIO;
    console.log('[DashboardEvents] Initialized');
}

/**
 * Emit dashboard update event
 * @param {string} type - Event type (ANALYTICS_UPDATED, STUDENT_ADDED, etc.)
 * @param {object} metadata - Optional lightweight metadata (scope, counts, etc.)
 */
function emitDashboardUpdate(type, metadata = {}) {
    if (!io) {
        console.warn('[DashboardEvents] Socket.IO not initialized');
        return;
    }

    const payload = {
        type,
        timestamp: new Date().toISOString(),
        ...metadata
    };

    // Emit to all connected admins
    io.to('admin').emit('dashboard:update', payload);

    console.log(`[DashboardEvents] Emitted dashboard:update (${type})`);
}

// ==================== EVENT TYPE CONSTANTS ====================

const DASHBOARD_EVENTS = {
    // Academic
    MARKS_PUBLISHED: 'MARKS_PUBLISHED',
    ANALYTICS_COMPUTED: 'ANALYTICS_COMPUTED',
    STUDENT_CREATED: 'STUDENT_CREATED',
    FACULTY_CREATED: 'FACULTY_CREATED',

    // Attendance
    ATTENDANCE_MARKED: 'ATTENDANCE_MARKED',
    ATTENDANCE_UPDATED: 'ATTENDANCE_UPDATED',

    // Fee
    FEE_COLLECTED: 'FEE_COLLECTED',
    FEE_UPDATED: 'FEE_UPDATED',

    // Notices
    NOTICE_POSTED: 'NOTICE_POSTED',

    // Timetable
    TIMETABLE_PUBLISHED: 'TIMETABLE_PUBLISHED',

    // General
    DATA_REFRESH: 'DATA_REFRESH'
};

// ==================== CONVENIENCE EMITTERS ====================

/**
 * Emit when marks are published
 */
function emitMarksPublished(scope) {
    emitDashboardUpdate(DASHBOARD_EVENTS.MARKS_PUBLISHED, {
        department: scope.department,
        semester: scope.semester,
        subject: scope.subject
    });
}

/**
 * Emit when analytics are computed
 */
function emitAnalyticsComputed(scope) {
    emitDashboardUpdate(DASHBOARD_EVENTS.ANALYTICS_COMPUTED, {
        department: scope.department,
        semester: scope.semester
    });
}

/**
 * Emit when student is created
 */
function emitStudentCreated(count = 1) {
    emitDashboardUpdate(DASHBOARD_EVENTS.STUDENT_CREATED, { count });
}

/**
 * Emit when faculty is created
 */
function emitFacultyCreated(count = 1) {
    emitDashboardUpdate(DASHBOARD_EVENTS.FACULTY_CREATED, { count });
}

/**
 * Emit when attendance is marked
 */
function emitAttendanceMarked(classId, date) {
    emitDashboardUpdate(DASHBOARD_EVENTS.ATTENDANCE_MARKED, { classId, date });
}

/**
 * Emit when fee is collected
 */
function emitFeeCollected(amount) {
    emitDashboardUpdate(DASHBOARD_EVENTS.FEE_COLLECTED, { amount });
}

/**
 * Emit when notice is posted
 */
function emitNoticePosted(noticeId, title) {
    emitDashboardUpdate(DASHBOARD_EVENTS.NOTICE_POSTED, { noticeId, title });
}

/**
 * Force a general dashboard refresh
 */
function emitDataRefresh() {
    emitDashboardUpdate(DASHBOARD_EVENTS.DATA_REFRESH);
}

module.exports = {
    initDashboardEvents,
    emitDashboardUpdate,
    DASHBOARD_EVENTS,
    // Convenience methods
    emitMarksPublished,
    emitAnalyticsComputed,
    emitStudentCreated,
    emitFacultyCreated,
    emitAttendanceMarked,
    emitFeeCollected,
    emitNoticePosted,
    emitDataRefresh
};
