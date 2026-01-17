/**
 * Global Error Normalizer Utility
 * Ensures all error values are safe strings - NEVER raw objects.
 * Use this utility whenever handling errors to prevent "[object Object]" crashes.
 */

/**
 * Normalizes any error value to a safe, human-readable string.
 * @param {any} err - The error to normalize (can be Error, string, object, etc.)
 * @returns {string} A human-readable error message string
 */
export const normalizeError = (err) => {
    // Handle null/undefined
    if (err === null || err === undefined) {
        return 'An unexpected error occurred';
    }

    // Handle Error instances
    if (err instanceof Error) {
        return err.message || 'An unexpected error occurred';
    }

    // Handle strings directly
    if (typeof err === 'string') {
        return err;
    }

    // Handle Axios error response structure
    if (err?.response?.data?.message) {
        const msg = err.response.data.message;
        return typeof msg === 'string' ? msg : JSON.stringify(msg);
    }

    if (err?.response?.data?.error) {
        const errData = err.response.data.error;
        // If error is a string, return it
        if (typeof errData === 'string') {
            return errData;
        }
        // If error is an object with message property
        if (errData?.message && typeof errData.message === 'string') {
            return errData.message;
        }
        // Stringify the error object
        try {
            return JSON.stringify(errData);
        } catch {
            return 'An unexpected error occurred';
        }
    }

    // Handle plain objects with message property
    if (typeof err === 'object' && err?.message) {
        return typeof err.message === 'string' ? err.message : JSON.stringify(err.message);
    }

    // Handle plain objects - try to stringify
    if (typeof err === 'object') {
        try {
            return JSON.stringify(err);
        } catch {
            return 'An unexpected error occurred';
        }
    }

    // Fallback for any other type
    return String(err) || 'An unexpected error occurred';
};

/**
 * Extracts a safe error message from an Axios error for toast notifications.
 * @param {any} error - The error from a catch block
 * @param {string} fallback - Fallback message if extraction fails
 * @returns {string} A safe error message string
 */
export const getErrorMessage = (error, fallback = 'Something went wrong') => {
    // If it's already a string, return it
    if (typeof error === 'string') {
        return error;
    }

    // Handle Error instances (from axios interceptor)
    if (error instanceof Error) {
        return error.message || fallback;
    }

    // Handle Axios error with response
    if (error?.response?.data) {
        const data = error.response.data;

        // Check for error field
        if (data.error) {
            if (typeof data.error === 'string') {
                return data.error;
            }
            if (data.error?.message && typeof data.error.message === 'string') {
                return data.error.message;
            }
        }

        // Check for message field
        if (data.message && typeof data.message === 'string') {
            return data.message;
        }
    }

    // Handle error.message directly
    if (error?.message && typeof error.message === 'string') {
        return error.message;
    }

    return fallback;
};

/**
 * Wraps an async function with standardized error handling.
 * @param {Function} fn - Async function to wrap
 * @param {Function} onError - Error handler callback receiving normalized error message
 * @returns {Function} Wrapped async function
 */
export const withErrorHandling = (fn, onError) => {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            const message = getErrorMessage(error);
            if (onError) {
                onError(message);
            }
            throw new Error(message);
        }
    };
};

export default { normalizeError, getErrorMessage, withErrorHandling };
