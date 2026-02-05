/**
 * Notification Service - Helper for creating notifications programmatically
 * Use this in controllers when actions occur that need to notify users
 */
const Notification = require('../models/Notification');

/**
 * Create a notification
 * @param {Object} data - Notification data
 * @returns {Promise<Object>} Created notification
 */
const notify = async (data) => {
    try {
        const notification = await Notification.create({
            userId: data.userId,
            role: data.role,
            title: data.title,
            message: data.message,
            type: data.type || 'system',
            link: data.link || null,
            priority: data.priority || 'normal',
            referenceId: data.referenceId,
            referenceType: data.referenceType
        });

        return notification;
    } catch (error) {
        console.error('Notification service error:', error);
        return null;
    }
};

/**
 * Notify on leave status change
 */
const notifyLeaveStatusChange = async (leave, status, studentUserId, studentRole = 'student') => {
    const statusMessages = {
        approved: { title: 'Leave Approved ✅', message: `Your leave request from ${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()} has been approved.` },
        rejected: { title: 'Leave Rejected ❌', message: `Your leave request from ${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()} has been rejected.` },
        pending: { title: 'Leave Submitted', message: `Your leave request has been submitted for review.` }
    };

    const msg = statusMessages[status] || { title: 'Leave Update', message: 'Your leave status has been updated.' };

    return notify({
        userId: studentUserId,
        role: studentRole,
        title: msg.title,
        message: msg.message,
        type: 'leave',
        link: `/${studentRole}/leave`,
        referenceId: leave._id,
        referenceType: 'Leave'
    });
};

/**
 * Notify on timetable update
 */
const notifyTimetableUpdate = async (userId, role, message) => {
    return notify({
        userId,
        role,
        title: 'Timetable Updated 📅',
        message: message || 'Your timetable has been updated.',
        type: 'timetable',
        link: `/${role}/timetable`,
        priority: 'high'
    });
};

/**
 * Notify on exam scheduled
 */
const notifyExamScheduled = async (userId, role, examName, examDate) => {
    return notify({
        userId,
        role,
        title: 'New Exam Scheduled 📝',
        message: `${examName} is scheduled for ${new Date(examDate).toLocaleDateString()}.`,
        type: 'exam',
        link: `/${role}/exams`,
        priority: 'high'
    });
};

/**
 * Notify on fee due
 */
const notifyFeeDue = async (userId, amount, dueDate) => {
    return notify({
        userId,
        role: 'student',
        title: 'Fee Payment Due 💰',
        message: `A payment of ₹${amount} is due on ${new Date(dueDate).toLocaleDateString()}.`,
        type: 'fee',
        link: '/student/fees',
        priority: 'urgent'
    });
};

/**
 * Notify on marks published
 */
const notifyMarksPublished = async (userId, examName) => {
    return notify({
        userId,
        role: 'student',
        title: 'Marks Published 📊',
        message: `Results for ${examName} have been published.`,
        type: 'marks',
        link: '/student/results',
        priority: 'normal'
    });
};

/**
 * Notify on attendance alert
 */
const notifyAttendanceAlert = async (userId, percentage, subject) => {
    return notify({
        userId,
        role: 'student',
        title: 'Low Attendance Alert ⚠️',
        message: `Your attendance in ${subject || 'a subject'} is ${percentage}%. Minimum 75% required.`,
        type: 'attendance',
        link: '/student/attendance',
        priority: 'urgent'
    });
};

/**
 * Batch notify multiple users
 */
const notifyMany = async (userIds, role, title, message, type, link) => {
    const promises = userIds.map(userId =>
        notify({ userId, role, title, message, type, link })
    );
    return Promise.all(promises);
};

module.exports = {
    notify,
    notifyLeaveStatusChange,
    notifyTimetableUpdate,
    notifyExamScheduled,
    notifyFeeDue,
    notifyMarksPublished,
    notifyAttendanceAlert,
    notifyMany
};
