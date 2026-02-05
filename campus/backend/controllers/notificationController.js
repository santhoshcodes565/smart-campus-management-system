const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/responseHandler');

/**
 * @desc    Get notifications for logged-in user (JWT-based)
 * @route   GET /api/notifications/me
 * @access  Protected (All roles)
 */
const getMyNotifications = async (req, res, next) => {
    try {
        const { limit = 20, page = 1, unreadOnly = false } = req.query;

        const query = { userId: req.user._id };
        if (unreadOnly === 'true') {
            query.isRead = false;
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        const unreadCount = await Notification.countDocuments({
            userId: req.user._id,
            isRead: false
        });

        const total = await Notification.countDocuments({ userId: req.user._id });

        return successResponse(res, 200, 'Notifications retrieved', {
            notifications,
            unreadCount,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Mark notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Protected (Owner only)
 */
const markAsRead = async (req, res, next) => {
    try {
        const notification = await Notification.findOne({
            _id: req.params.id,
            userId: req.user._id  // Security: only owner can mark as read
        });

        if (!notification) {
            return errorResponse(res, 404, 'Notification not found');
        }

        notification.isRead = true;
        await notification.save();

        return successResponse(res, 200, 'Notification marked as read', notification);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/notifications/mark-all-read
 * @access  Protected (All roles)
 */
const markAllAsRead = async (req, res, next) => {
    try {
        const result = await Notification.updateMany(
            { userId: req.user._id, isRead: false },
            { isRead: true }
        );

        return successResponse(res, 200, 'All notifications marked as read', {
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete a notification
 * @route   DELETE /api/notifications/:id
 * @access  Protected (Owner only)
 */
const deleteNotification = async (req, res, next) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!notification) {
            return errorResponse(res, 404, 'Notification not found');
        }

        return successResponse(res, 200, 'Notification deleted');
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Create notification (internal use / admin)
 * @route   POST /api/notifications
 * @access  Admin only
 */
const createNotification = async (req, res, next) => {
    try {
        const { userId, role, title, message, type, link, priority, referenceId, referenceType } = req.body;

        if (!userId || !role || !title || !message) {
            return errorResponse(res, 400, 'userId, role, title, and message are required');
        }

        const notification = await Notification.create({
            userId,
            role,
            title,
            message,
            type: type || 'system',
            link,
            priority: priority || 'normal',
            referenceId,
            referenceType
        });

        return successResponse(res, 201, 'Notification created', notification);
    } catch (error) {
        next(error);
    }
};

/**
 * Helper: Create notification programmatically (for internal use)
 * @param {Object} data - Notification data
 * @returns {Promise<Object>} Created notification
 */
const createNotificationInternal = async (data) => {
    try {
        const notification = await Notification.create({
            userId: data.userId,
            role: data.role,
            title: data.title,
            message: data.message,
            type: data.type || 'system',
            link: data.link,
            priority: data.priority || 'normal',
            referenceId: data.referenceId,
            referenceType: data.referenceType
        });
        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
};

module.exports = {
    getMyNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
    createNotificationInternal
};
