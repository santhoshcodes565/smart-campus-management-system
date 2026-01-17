/**
 * Leave Helpers - Shared utilities for Leave Management
 */

// Leave type options
export const LEAVE_TYPES = [
    { value: 'sick', label: 'Sick Leave', icon: '🤒', color: 'text-red-500' },
    { value: 'casual', label: 'Casual Leave', icon: '🏖️', color: 'text-blue-500' },
    { value: 'emergency', label: 'Emergency Leave', icon: '🚨', color: 'text-orange-500' },
    { value: 'academic', label: 'Academic Leave', icon: '📚', color: 'text-purple-500' },
    { value: 'personal', label: 'Personal Leave', icon: '👤', color: 'text-gray-500' },
    { value: 'other', label: 'Other', icon: '📝', color: 'text-secondary-500' }
];

// Leave status options
export const LEAVE_STATUS = {
    pending: { label: 'Pending', color: 'badge-warning', icon: '⏳' },
    approved: { label: 'Approved', color: 'badge-success', icon: '✅' },
    rejected: { label: 'Rejected', color: 'badge-danger', icon: '❌' }
};

/**
 * Validate leave dates
 * @param {string} fromDate - Start date
 * @param {string} toDate - End date
 * @returns {Object} { valid: boolean, error?: string }
 */
export const validateLeaveDates = (fromDate, toDate) => {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!fromDate || !toDate) {
        return { valid: false, error: 'Please select both start and end dates' };
    }

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { valid: false, error: 'Invalid date format' };
    }

    if (start > end) {
        return { valid: false, error: 'Start date cannot be after end date' };
    }

    if (start < today) {
        return { valid: false, error: 'Start date cannot be in the past' };
    }

    return { valid: true };
};

/**
 * Calculate days between two dates (inclusive)
 * @param {string} fromDate - Start date
 * @param {string} toDate - End date
 * @returns {number} Number of days
 */
export const getDaysBetween = (fromDate, toDate) => {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
};

/**
 * Format date for display
 * @param {string} dateString - Date string
 * @returns {string} Formatted date
 */
export const formatLeaveDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

/**
 * Get leave type info by value
 * @param {string} value - Leave type value
 * @returns {Object} Leave type info
 */
export const getLeaveTypeInfo = (value) => {
    return LEAVE_TYPES.find(t => t.value === value) || LEAVE_TYPES[LEAVE_TYPES.length - 1];
};

/**
 * Get status badge info
 * @param {string} status - Leave status
 * @returns {Object} Status info
 */
export const getStatusInfo = (status) => {
    return LEAVE_STATUS[status] || LEAVE_STATUS.pending;
};
