const FeedbackThread = require('../models/FeedbackThread');
const FeedbackMessage = require('../models/FeedbackMessage');
const FeedbackAudit = require('../models/FeedbackAudit');
const Feedback = require('../models/Feedback'); // V1 model for migration
const User = require('../models/User');
const Faculty = require('../models/Faculty');

// ==================== HELPER FUNCTIONS ====================

/**
 * Create audit log entry
 */
const createAuditLog = async (threadId, action, performedBy, performedByRole, previousValue = null, newValue = null, metadata = {}) => {
    try {
        await FeedbackAudit.create({
            threadId,
            action,
            performedBy,
            performedByRole,
            previousValue,
            newValue,
            metadata
        });
    } catch (error) {
        console.error('Audit log creation failed:', error);
    }
};

/**
 * Check if user can access thread
 */
const canAccessThread = (thread, userId, userRole) => {
    if (userRole === 'admin') return true;

    // Creator can access
    if (thread.createdBy.toString() === userId.toString()) return true;

    // Target user can access (faculty receiving feedback)
    if (thread.targetUserId && thread.targetUserId.toString() === userId.toString()) return true;

    return false;
};

/**
 * Check if user can reply to thread
 */
const canReplyToThread = (thread, userId, userRole) => {
    // Thread must be active
    if (!thread.isActive) return false;

    // Admin can always reply
    if (userRole === 'admin') return true;

    // Creator or target can reply
    return canAccessThread(thread, userId, userRole);
};

// ==================== STUDENT/FACULTY ROUTES ====================

/**
 * @desc    Create new feedback thread
 * @route   POST /api/student/feedback/threads OR /api/faculty/feedback/threads
 * @access  Private (Student, Faculty, Admin)
 */
exports.createThread = async (req, res) => {
    try {
        const { title, targetRole, targetUserId, type, message } = req.body;
        const createdBy = req.user._id;
        const createdByRole = req.user.role;

        // Validation: Faculty can only send to admin
        if (createdByRole === 'faculty' && targetRole !== 'admin') {
            return res.status(400).json({
                success: false,
                error: 'Faculty can only send feedback to admin'
            });
        }

        // Validation: targetRole must be admin or faculty
        if (!['admin', 'faculty'].includes(targetRole)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid target role. Must be admin or faculty'
            });
        }

        // Validation: If targeting faculty, targetUserId is required
        if (targetRole === 'faculty' && !targetUserId) {
            return res.status(400).json({
                success: false,
                error: 'Please select a faculty member'
            });
        }

        // Validate title and message
        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Title is required'
            });
        }

        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        // Create thread
        const thread = await FeedbackThread.create({
            title: title.trim(),
            createdBy,
            createdByRole,
            targetRole,
            targetUserId: targetRole === 'admin' ? null : targetUserId,
            type: type || 'general',
            priority: 'medium',
            status: 'open',
            lastMessageAt: new Date(),
            messageCount: 1
        });

        // Create initial message
        await FeedbackMessage.create({
            threadId: thread._id,
            senderId: createdBy,
            senderRole: createdByRole,
            message: message.trim(),
            isInitialMessage: true
        });

        // Create audit log
        await createAuditLog(
            thread._id,
            'created',
            createdBy,
            createdByRole,
            null,
            null,
            { title: title.trim(), targetRole }
        );

        // Populate and return
        await thread.populate('createdBy', 'name username');
        if (thread.targetUserId) {
            await thread.populate('targetUserId', 'name username');
        }

        res.status(201).json({
            success: true,
            message: 'Feedback thread created successfully',
            data: thread
        });

    } catch (error) {
        console.error('Create Thread Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create feedback thread'
        });
    }
};

/**
 * @desc    Get my feedback threads
 * @route   GET /api/student/feedback/threads OR /api/faculty/feedback/threads
 * @access  Private (Student, Faculty)
 */
exports.getMyThreads = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        const { status, type, page = 1, limit = 20 } = req.query;

        let query = { isDeleted: false };

        if (userRole === 'student') {
            // Students see only their created threads
            query.createdBy = userId;
        } else if (userRole === 'faculty') {
            // Faculty sees threads they created OR targeted at them
            query.$or = [
                { createdBy: userId },
                { targetUserId: userId }
            ];
        }

        // Apply filters
        if (status && ['open', 'in_review', 'waiting_for_user', 'resolved', 'closed'].includes(status)) {
            query.status = status;
        }
        if (type && ['academic', 'technical', 'complaint', 'suggestion', 'general'].includes(type)) {
            query.type = type;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const threads = await FeedbackThread.find(query)
            .populate('createdBy', 'name username')
            .populate('targetUserId', 'name username')
            .sort({ lastMessageAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await FeedbackThread.countDocuments(query);

        res.status(200).json({
            success: true,
            count: threads.length,
            total,
            pages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page),
            data: threads
        });

    } catch (error) {
        console.error('Get My Threads Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch threads'
        });
    }
};

/**
 * @desc    Get single thread with messages
 * @route   GET /api/student/feedback/threads/:id OR /api/faculty/feedback/threads/:id
 * @access  Private (with ownership check)
 */
exports.getThreadById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const userRole = req.user.role;

        const thread = await FeedbackThread.findById(id)
            .populate('createdBy', 'name username role')
            .populate('targetUserId', 'name username');

        if (!thread) {
            return res.status(404).json({
                success: false,
                error: 'Thread not found'
            });
        }

        // Check access permission
        if (!canAccessThread(thread, userId, userRole)) {
            return res.status(403).json({
                success: false,
                error: 'You do not have permission to view this thread'
            });
        }

        // Get all messages for this thread
        const messages = await FeedbackMessage.find({ threadId: id })
            .populate('senderId', 'name username role')
            .sort({ createdAt: 1 });

        // Get audit log for admin
        let auditLog = [];
        if (userRole === 'admin') {
            auditLog = await FeedbackAudit.find({ threadId: id })
                .populate('performedBy', 'name username')
                .sort({ createdAt: -1 });
        }

        res.status(200).json({
            success: true,
            data: {
                thread,
                messages,
                auditLog
            }
        });

    } catch (error) {
        console.error('Get Thread By ID Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch thread'
        });
    }
};

/**
 * @desc    Reply to a thread
 * @route   POST /api/student/feedback/threads/:id/reply
 * @access  Private (with permission check)
 */
exports.replyToThread = async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;
        const userId = req.user._id;
        const userRole = req.user.role;

        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        const thread = await FeedbackThread.findById(id);

        if (!thread) {
            return res.status(404).json({
                success: false,
                error: 'Thread not found'
            });
        }

        if (thread.isDeleted) {
            return res.status(400).json({
                success: false,
                error: 'This thread has been deleted'
            });
        }

        // Check if user can reply
        if (!canReplyToThread(thread, userId, userRole)) {
            if (['resolved', 'closed'].includes(thread.status)) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot reply to a resolved or closed thread'
                });
            }
            return res.status(403).json({
                success: false,
                error: 'You do not have permission to reply to this thread'
            });
        }

        // Create message
        const newMessage = await FeedbackMessage.create({
            threadId: id,
            senderId: userId,
            senderRole: userRole,
            message: message.trim(),
            isInitialMessage: false
        });

        // Update thread metadata
        thread.lastMessageAt = new Date();
        thread.messageCount += 1;

        // If user replies to waiting_for_user, move back to in_review
        if (thread.status === 'waiting_for_user' && userRole !== 'admin') {
            thread.status = 'in_review';
        }

        await thread.save();

        // Create audit log
        await createAuditLog(
            id,
            'reply',
            userId,
            userRole,
            null,
            null,
            { messageLength: message.trim().length }
        );

        await newMessage.populate('senderId', 'name username role');

        res.status(201).json({
            success: true,
            message: 'Reply added successfully',
            data: newMessage
        });

    } catch (error) {
        console.error('Reply To Thread Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to add reply'
        });
    }
};

// ==================== ADMIN ROUTES ====================

/**
 * @desc    Get all feedback threads (Admin)
 * @route   GET /api/admin/feedback/threads
 * @access  Private (Admin)
 */
exports.getAllThreads = async (req, res) => {
    try {
        const {
            status,
            priority,
            type,
            createdByRole,
            includeDeleted,
            search,
            page = 1,
            limit = 20
        } = req.query;

        let query = {};

        // By default, exclude deleted unless explicitly requested
        if (includeDeleted !== 'true') {
            query.isDeleted = false;
        }

        // Apply filters
        if (status && ['open', 'in_review', 'waiting_for_user', 'resolved', 'closed'].includes(status)) {
            query.status = status;
        }
        if (priority && ['low', 'medium', 'high'].includes(priority)) {
            query.priority = priority;
        }
        if (type && ['academic', 'technical', 'complaint', 'suggestion', 'general'].includes(type)) {
            query.type = type;
        }
        if (createdByRole && ['student', 'faculty'].includes(createdByRole)) {
            query.createdByRole = createdByRole;
        }
        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const threads = await FeedbackThread.find(query)
            .populate('createdBy', 'name username role')
            .populate('targetUserId', 'name username')
            .populate('deletedBy', 'name')
            .sort({ lastMessageAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await FeedbackThread.countDocuments(query);

        // Get stats for dashboard
        const stats = await FeedbackThread.aggregate([
            { $match: { isDeleted: false } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const statusCounts = {
            open: 0,
            in_review: 0,
            waiting_for_user: 0,
            resolved: 0,
            closed: 0
        };
        stats.forEach(s => {
            statusCounts[s._id] = s.count;
        });

        res.status(200).json({
            success: true,
            count: threads.length,
            total,
            pages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page),
            stats: statusCounts,
            data: threads
        });

    } catch (error) {
        console.error('Get All Threads Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch threads'
        });
    }
};

/**
 * @desc    Update thread status (Admin)
 * @route   PUT /api/admin/feedback/threads/:id/status
 * @access  Private (Admin)
 */
exports.updateThreadStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const userId = req.user._id;

        const validStatuses = ['open', 'in_review', 'waiting_for_user', 'resolved', 'closed'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        const thread = await FeedbackThread.findById(id);

        if (!thread) {
            return res.status(404).json({
                success: false,
                error: 'Thread not found'
            });
        }

        const previousStatus = thread.status;

        if (previousStatus === status) {
            return res.status(200).json({
                success: true,
                message: 'Status unchanged',
                data: thread
            });
        }

        thread.status = status;
        await thread.save();

        // Create audit log
        await createAuditLog(
            id,
            'status_change',
            userId,
            'admin',
            previousStatus,
            status
        );

        await thread.populate('createdBy', 'name username');

        res.status(200).json({
            success: true,
            message: `Status updated to ${status}`,
            data: thread
        });

    } catch (error) {
        console.error('Update Thread Status Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update status'
        });
    }
};

/**
 * @desc    Update thread priority (Admin)
 * @route   PUT /api/admin/feedback/threads/:id/priority
 * @access  Private (Admin)
 */
exports.updateThreadPriority = async (req, res) => {
    try {
        const { id } = req.params;
        const { priority } = req.body;
        const userId = req.user._id;

        const validPriorities = ['low', 'medium', 'high'];
        if (!priority || !validPriorities.includes(priority)) {
            return res.status(400).json({
                success: false,
                error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`
            });
        }

        const thread = await FeedbackThread.findById(id);

        if (!thread) {
            return res.status(404).json({
                success: false,
                error: 'Thread not found'
            });
        }

        const previousPriority = thread.priority;

        if (previousPriority === priority) {
            return res.status(200).json({
                success: true,
                message: 'Priority unchanged',
                data: thread
            });
        }

        thread.priority = priority;
        await thread.save();

        // Create audit log
        await createAuditLog(
            id,
            'priority_change',
            userId,
            'admin',
            previousPriority,
            priority
        );

        await thread.populate('createdBy', 'name username');

        res.status(200).json({
            success: true,
            message: `Priority updated to ${priority}`,
            data: thread
        });

    } catch (error) {
        console.error('Update Thread Priority Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update priority'
        });
    }
};

/**
 * @desc    Soft delete thread (Admin)
 * @route   DELETE /api/admin/feedback/threads/:id
 * @access  Private (Admin)
 */
exports.softDeleteThread = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const thread = await FeedbackThread.findById(id);

        if (!thread) {
            return res.status(404).json({
                success: false,
                error: 'Thread not found'
            });
        }

        if (thread.isDeleted) {
            return res.status(400).json({
                success: false,
                error: 'Thread is already deleted'
            });
        }

        thread.isDeleted = true;
        thread.deletedAt = new Date();
        thread.deletedBy = userId;
        await thread.save();

        // Create audit log
        await createAuditLog(
            id,
            'deleted',
            userId,
            'admin',
            'active',
            'deleted'
        );

        res.status(200).json({
            success: true,
            message: 'Thread deleted successfully'
        });

    } catch (error) {
        console.error('Soft Delete Thread Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete thread'
        });
    }
};

// ==================== UTILITY ROUTES ====================

/**
 * @desc    Get faculty list for dropdown (Student)
 * @route   GET /api/student/feedback/faculty-list
 * @access  Private (Student)
 */
exports.getFacultyList = async (req, res) => {
    try {
        const facultyMembers = await Faculty.find()
            .populate({
                path: 'userId',
                select: 'name username status',
                match: { status: 'active' }
            })
            .populate('departmentId', 'name')
            .select('userId departmentId designation');

        const activeFaculty = facultyMembers
            .filter(f => f.userId)
            .map(f => ({
                _id: f.userId._id,
                name: f.userId.name,
                username: f.userId.username,
                department: f.departmentId?.name || 'N/A',
                designation: f.designation
            }));

        res.status(200).json({
            success: true,
            count: activeFaculty.length,
            data: activeFaculty
        });

    } catch (error) {
        console.error('Get Faculty List Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch faculty list'
        });
    }
};

/**
 * @desc    Migrate V1 feedback to V2 threads (Admin, one-time)
 * @route   POST /api/admin/feedback/migrate-v1
 * @access  Private (Admin)
 */
exports.migrateV1ToV2 = async (req, res) => {
    try {
        const userId = req.user._id;

        // Check if migration already happened
        const existingMigrated = await FeedbackThread.countDocuments({ migratedFromV1: true });

        // Get all V1 feedback
        const v1Feedbacks = await Feedback.find({})
            .populate('senderId', 'name username role')
            .populate('receiverId', 'name username');

        if (v1Feedbacks.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No V1 feedback to migrate',
                migrated: 0,
                alreadyMigrated: existingMigrated
            });
        }

        let migratedCount = 0;
        let skippedCount = 0;

        for (const v1 of v1Feedbacks) {
            // Check if already migrated
            const alreadyMigrated = await FeedbackThread.findOne({ originalV1Id: v1._id });
            if (alreadyMigrated) {
                skippedCount++;
                continue;
            }

            // Map V1 status to V2 status
            let v2Status = 'open';
            if (v1.status === 'viewed') v2Status = 'in_review';
            if (v1.status === 'resolved') v2Status = 'resolved';

            // Create thread
            const thread = await FeedbackThread.create({
                title: v1.subject,
                createdBy: v1.senderId._id,
                createdByRole: v1.senderRole,
                targetRole: v1.receiverRole,
                targetUserId: v1.receiverId?._id || null,
                type: 'general',
                priority: 'medium',
                status: v2Status,
                lastMessageAt: v1.createdAt,
                messageCount: 1,
                migratedFromV1: true,
                originalV1Id: v1._id,
                createdAt: v1.createdAt,
                updatedAt: v1.updatedAt
            });

            // Create initial message
            await FeedbackMessage.create({
                threadId: thread._id,
                senderId: v1.senderId._id,
                senderRole: v1.senderRole,
                message: v1.message,
                isInitialMessage: true,
                createdAt: v1.createdAt
            });

            // Create audit log
            await createAuditLog(
                thread._id,
                'migrated',
                userId,
                'admin',
                null,
                null,
                { originalV1Id: v1._id.toString() }
            );

            migratedCount++;
        }

        res.status(200).json({
            success: true,
            message: `Migration complete. ${migratedCount} threads migrated, ${skippedCount} skipped (already migrated)`,
            migrated: migratedCount,
            skipped: skippedCount,
            totalV1: v1Feedbacks.length
        });

    } catch (error) {
        console.error('Migrate V1 to V2 Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to migrate V1 feedback'
        });
    }
};

/**
 * @desc    Admin create thread (to send feedback to faculty or internal)
 * @route   POST /api/admin/feedback/threads
 * @access  Private (Admin)
 */
exports.adminCreateThread = async (req, res) => {
    try {
        const { title, targetRole, targetUserId, type, priority, message } = req.body;
        const createdBy = req.user._id;

        // Validation
        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Title is required'
            });
        }

        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        if (!['admin', 'faculty'].includes(targetRole)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid target role'
            });
        }

        if (targetRole === 'faculty' && !targetUserId) {
            return res.status(400).json({
                success: false,
                error: 'Please select a faculty member'
            });
        }

        // Create thread
        const thread = await FeedbackThread.create({
            title: title.trim(),
            createdBy,
            createdByRole: 'admin',
            targetRole,
            targetUserId: targetRole === 'admin' ? null : targetUserId,
            type: type || 'general',
            priority: priority || 'medium',
            status: 'open',
            lastMessageAt: new Date(),
            messageCount: 1
        });

        // Create initial message
        await FeedbackMessage.create({
            threadId: thread._id,
            senderId: createdBy,
            senderRole: 'admin',
            message: message.trim(),
            isInitialMessage: true
        });

        // Create audit log
        await createAuditLog(
            thread._id,
            'created',
            createdBy,
            'admin',
            null,
            null,
            { title: title.trim(), targetRole, priority }
        );

        await thread.populate('createdBy', 'name username');
        if (thread.targetUserId) {
            await thread.populate('targetUserId', 'name username');
        }

        res.status(201).json({
            success: true,
            message: 'Thread created successfully',
            data: thread
        });

    } catch (error) {
        console.error('Admin Create Thread Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create thread'
        });
    }
};
