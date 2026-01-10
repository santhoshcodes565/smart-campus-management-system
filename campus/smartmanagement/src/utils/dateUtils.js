/**
 * Safe date formatting utilities
 * Prevents RangeError crashes from invalid dates
 */

export const formatDateSafe = (date) => {
    if (!date || isNaN(new Date(date))) return "N/A";
    return new Date(date).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
};

export const getCurrentWeekday = () => {
    return new Date().toLocaleDateString("en-US", {
        weekday: "long"
    });
};
