const Notice = require('../models/Notice');
const User = require('../models/User');
const Faculty = require('../models/Faculty');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// ==================== ADMIN NOTICE FUNCTIONS ====================

/**
 * @desc    Create notice (Admin can target all audiences)
 * @route   POST /api/admin/notices
 * @access  Admin
 */
const adminCreateNotice = async (req, res, next) => {
    try {
        const {
            title,
            content,
            targetAudience,
            type,
            priority,
            departmentId,
            courseId,
            isImportant,
            expiresAt
        } = req.body;

        if (!title || !content) {
            return errorResponse(res, 400, 'Title and content are required');
        }

        // Validate target audience for admin - can be 'all', 'faculty', or 'students'
        const validAudiences = ['all', 'faculty', 'students'];
        if (targetAudience && !validAudiences.includes(targetAudience)) {
            return errorResponse(res, 400, 'Invalid target audience');
        }

        const notice = await Notice.create({
            title,
            content,
            createdBy: req.user._id,
            createdByRole: 'admin',
            targetAudience: targetAudience || 'all',
            type: type || 'global',
            priority: priority || 'medium',
            departmentId: departmentId || null,
            courseId: courseId || null,
            isImportant: isImportant || false,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            isActive: true
        });

        const populatedNotice = await Notice.findById(notice._id)
            .populate('createdBy', 'name username role');

        return successResponse(res, 201, 'Notice created successfully', populatedNotice);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all notices (Admin sees all notices)
 * @route   GET /api/admin/notices
 * @access  Admin
 */
const adminGetNotices = async (req, res, next) => {
    try {
        const { targetAudience, createdByRole, isActive, search, page = 1, limit = 50 } = req.query;

        let query = {};

        if (targetAudience) query.targetAudience = targetAudience;
        if (createdByRole) query.createdByRole = createdByRole;
        if (isActive !== undefined) query.isActive = isActive === 'true';
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }

        const notices = await Notice.find(query)
            .populate('createdBy', 'name username role')
            .populate('departmentId', 'name code')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Notice.countDocuments(query);

        return successResponse(res, 200, 'Notices retrieved', {
            notices,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete notice (Admin can delete any notice)
 * @route   DELETE /api/admin/notices/:id
 * @access  Admin
 */
const adminDeleteNotice = async (req, res, next) => {
    try {
        const notice = await Notice.findById(req.params.id);

        if (!notice) {
            return errorResponse(res, 404, 'Notice not found');
        }

        await Notice.findByIdAndDelete(req.params.id);

        return successResponse(res, 200, 'Notice deleted successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update notice (Admin)
 * @route   PUT /api/admin/notices/:id
 * @access  Admin
 */
const adminUpdateNotice = async (req, res, next) => {
    try {
        const notice = await Notice.findById(req.params.id);

        if (!notice) {
            return errorResponse(res, 404, 'Notice not found');
        }

        const {
            title,
            content,
            targetAudience,
            type,
            priority,
            departmentId,
            courseId,
            isImportant,
            expiresAt,
            isActive
        } = req.body;

        // Update fields
        Object.assign(notice, {
            title: title !== undefined ? title : notice.title,
            content: content !== undefined ? content : notice.content,
            targetAudience: targetAudience !== undefined ? targetAudience : notice.targetAudience,
            type: type !== undefined ? type : notice.type,
            priority: priority !== undefined ? priority : notice.priority,
            departmentId: departmentId !== undefined ? departmentId : notice.departmentId,
            courseId: courseId !== undefined ? courseId : notice.courseId,
            isImportant: isImportant !== undefined ? isImportant : notice.isImportant,
            expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : notice.expiresAt,
            isActive: isActive !== undefined ? isActive : notice.isActive
        });

        await notice.save();

        const populatedNotice = await Notice.findById(notice._id)
            .populate('createdBy', 'name username role');

        return successResponse(res, 200, 'Notice updated successfully', populatedNotice);
    } catch (error) {
        next(error);
    }
};

// ==================== FACULTY NOTICE FUNCTIONS ====================

/**
 * @desc    Create notice (Faculty can only target students)
 * @route   POST /api/faculty/notices
 * @access  Faculty
 */
const facultyCreateNotice = async (req, res, next) => {
    try {
        const {
            title,
            content,
            type,
            priority,
            departmentId,
            courseId,
            isImportant,
            expiresAt
        } = req.body;

        if (!title || !content) {
            return errorResponse(res, 400, 'Title and content are required');
        }

        // Get faculty details for department info
        const faculty = await Faculty.findOne({ userId: req.user._id });

        const notice = await Notice.create({
            title,
            content,
            createdBy: req.user._id,
            createdByRole: 'faculty',
            targetAudience: 'students', // Faculty can ONLY send to students
            type: type || 'department',
            priority: priority || 'medium',
            department: req.user.department,
            departmentId: departmentId || (faculty ? faculty.departmentId : null),
            courseId: courseId || null,
            isImportant: isImportant || false,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            isActive: true
        });

        const populatedNotice = await Notice.findById(notice._id)
            .populate('createdBy', 'name username role');

        return successResponse(res, 201, 'Notice posted successfully', populatedNotice);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get notices for faculty (Admin notices + own notices)
 * @route   GET /api/faculty/notices
 * @access  Faculty
 */
const facultyGetNotices = async (req, res, next) => {
    try {
        const { search, page = 1, limit = 50 } = req.query;

        // Faculty sees:
        // 1. Admin notices targeting 'all' or 'faculty'
        // 2. Own notices (created by this faculty)
        let query = {
            isActive: true,
            $or: [
                // Admin notices for all or faculty
                {
                    createdByRole: 'admin',
                    targetAudience: { $in: ['all', 'faculty'] }
                },
                // Own notices
                { createdBy: req.user._id }
            ]
        };

        // Filter out expired notices
        const now = new Date();
        query.$and = [
            {
                $or: [
                    { expiresAt: null },
                    { expiresAt: { $gt: now } }
                ]
            }
        ];

        if (search) {
            query.$and.push({
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { content: { $regex: search, $options: 'i' } }
                ]
            });
        }

        const notices = await Notice.find(query)
            .populate('createdBy', 'name username role')
            .populate('departmentId', 'name code')
            .sort({ isImportant: -1, createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Notice.countDocuments(query);

        return successResponse(res, 200, 'Notices retrieved', {
            notices,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete notice (Faculty can only delete own notices)
 * @route   DELETE /api/faculty/notices/:id
 * @access  Faculty
 */
const facultyDeleteNotice = async (req, res, next) => {
    try {
        const notice = await Notice.findById(req.params.id);

        if (!notice) {
            return errorResponse(res, 404, 'Notice not found');
        }

        // Faculty can only delete their own notices
        if (notice.createdBy.toString() !== req.user._id.toString()) {
            return errorResponse(res, 403, 'You can only delete your own notices');
        }

        await Notice.findByIdAndDelete(req.params.id);

        return successResponse(res, 200, 'Notice deleted successfully');
    } catch (error) {
        next(error);
    }
};

// ==================== STUDENT NOTICE FUNCTIONS ====================

/**
 * @desc    Get notices for student (Admin notices + Faculty notices targeting students)
 * @route   GET /api/student/notices
 * @access  Student
 */
const studentGetNotices = async (req, res, next) => {
    try {
        const { search, page = 1, limit = 50 } = req.query;

        // Students see:
        // 1. Admin notices targeting 'all' or 'students'
        // 2. Faculty notices (which always target 'students')
        const now = new Date();

        let query = {
            isActive: true,
            $or: [
                // Admin notices for all or students
                {
                    createdByRole: 'admin',
                    targetAudience: { $in: ['all', 'students'] }
                },
                // Faculty notices (always for students)
                { createdByRole: 'faculty' }
            ],
            // Filter out expired notices
            $and: [
                {
                    $or: [
                        { expiresAt: null },
                        { expiresAt: { $gt: now } }
                    ]
                }
            ]
        };

        // Optional: Filter by department
        // If student has department, show department-specific notices + global
        if (req.user.department) {
            query.$and.push({
                $or: [
                    { department: '' },
                    { department: null },
                    { department: req.user.department },
                    { type: 'global' }
                ]
            });
        }

        if (search) {
            query.$and.push({
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { content: { $regex: search, $options: 'i' } }
                ]
            });
        }

        const notices = await Notice.find(query)
            .populate('createdBy', 'name username role')
            .populate('departmentId', 'name code')
            .sort({ isImportant: -1, createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Notice.countDocuments(query);

        return successResponse(res, 200, 'Notices retrieved', {
            notices,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Mark notice as read
 * @route   PUT /api/student/notices/:id/read
 * @access  Student/Faculty
 */
const markNoticeAsRead = async (req, res, next) => {
    try {
        const notice = await Notice.findById(req.params.id);

        if (!notice) {
            return errorResponse(res, 404, 'Notice not found');
        }

        // Check if already read
        const alreadyRead = notice.readBy.some(
            r => r.userId.toString() === req.user._id.toString()
        );

        if (!alreadyRead) {
            notice.readBy.push({
                userId: req.user._id,
                readAt: new Date()
            });
            await notice.save();
        }

        return successResponse(res, 200, 'Notice marked as read');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    // Admin
    adminCreateNotice,
    adminGetNotices,
    adminDeleteNotice,
    adminUpdateNotice,
    // Faculty
    facultyCreateNotice,
    facultyGetNotices,
    facultyDeleteNotice,
    // Student
    studentGetNotices,
    // Common
    markNoticeAsRead
};
