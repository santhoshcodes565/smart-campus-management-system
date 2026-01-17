const Feedback = require('../models/Feedback');
const User = require('../models/User');
const Faculty = require('../models/Faculty');

// @desc    Submit new feedback
// @route   POST /api/student/feedback OR /api/faculty/feedback
// @access  Private (Student, Faculty)
exports.submitFeedback = async (req, res) => {
    try {
        const { receiverRole, receiverId, subject, message, rating } = req.body;
        const senderId = req.user._id;
        const senderRole = req.user.role;

        // Validation: Sender role must be student or faculty
        if (!['student', 'faculty'].includes(senderRole)) {
            return res.status(403).json({
                success: false,
                error: 'Only students and faculty can submit feedback'
            });
        }

        // Validation: Faculty can only send to admin
        if (senderRole === 'faculty' && receiverRole !== 'admin') {
            return res.status(400).json({
                success: false,
                error: 'Faculty can only send feedback to admin'
            });
        }

        // Validation: receiverRole must be admin or faculty
        if (!['admin', 'faculty'].includes(receiverRole)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid receiver role. Must be admin or faculty'
            });
        }

        // Validation: If sending to faculty, receiverId is required
        if (receiverRole === 'faculty' && !receiverId) {
            return res.status(400).json({
                success: false,
                error: 'Please select a faculty member to send feedback to'
            });
        }

        // Validation: If sending to admin, receiverId should be null
        const finalReceiverId = receiverRole === 'admin' ? null : receiverId;

        // Validate subject and message
        if (!subject || !subject.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Subject is required'
            });
        }

        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        // Create feedback
        const feedback = await Feedback.create({
            senderId,
            senderRole,
            receiverRole,
            receiverId: finalReceiverId,
            subject: subject.trim(),
            message: message.trim(),
            rating: rating || null,
            status: 'new'
        });

        // Populate sender info for response
        await feedback.populate('senderId', 'name username');

        res.status(201).json({
            success: true,
            message: 'Feedback submitted successfully',
            data: feedback
        });

    } catch (error) {
        console.error('Submit Feedback Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to submit feedback'
        });
    }
};

// @desc    Get my feedback based on role
// @route   GET /api/student/feedback/my OR /api/faculty/feedback/my
// @access  Private (Student, Faculty)
exports.getMyFeedback = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        let feedback = [];

        if (userRole === 'student') {
            // Students see only their own submitted feedback
            feedback = await Feedback.find({ senderId: userId })
                .populate('senderId', 'name username')
                .populate('receiverId', 'name username')
                .sort({ createdAt: -1 });
        } else if (userRole === 'faculty') {
            // Faculty sees:
            // 1. Feedback addressed to them
            // 2. Feedback sent by them
            feedback = await Feedback.find({
                $or: [
                    { receiverId: userId },  // Received
                    { senderId: userId }     // Sent
                ]
            })
                .populate('senderId', 'name username')
                .populate('receiverId', 'name username')
                .sort({ createdAt: -1 });
        }

        res.status(200).json({
            success: true,
            count: feedback.length,
            data: feedback
        });

    } catch (error) {
        console.error('Get My Feedback Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch feedback'
        });
    }
};

// @desc    Get all feedback (Admin only)
// @route   GET /api/admin/feedback
// @access  Private (Admin)
exports.getAllFeedback = async (req, res) => {
    try {
        const { senderRole, receiverId, status, startDate, endDate, page = 1, limit = 20 } = req.query;

        // Build query
        let query = {};

        if (senderRole && ['student', 'faculty'].includes(senderRole)) {
            query.senderRole = senderRole;
        }

        if (receiverId) {
            query.receiverId = receiverId;
        }

        if (status && ['new', 'viewed', 'resolved'].includes(status)) {
            query.status = status;
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                query.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                query.createdAt.$lte = new Date(endDate);
            }
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const feedback = await Feedback.find(query)
            .populate('senderId', 'name username role')
            .populate('receiverId', 'name username')
            .populate('viewedBy', 'name')
            .populate('resolvedBy', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Feedback.countDocuments(query);

        res.status(200).json({
            success: true,
            count: feedback.length,
            total,
            pages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page),
            data: feedback
        });

    } catch (error) {
        console.error('Get All Feedback Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch feedback'
        });
    }
};

// @desc    Mark feedback as viewed
// @route   PUT /api/admin/feedback/:id/view OR /api/faculty/feedback/:id/view
// @access  Private (Admin, Target Faculty)
exports.markAsViewed = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const userRole = req.user.role;

        const feedback = await Feedback.findById(id);

        if (!feedback) {
            return res.status(404).json({
                success: false,
                error: 'Feedback not found'
            });
        }

        // Authorization check
        // Admin can view any feedback
        // Faculty can only view feedback addressed to them
        if (userRole === 'faculty') {
            if (!feedback.receiverId || feedback.receiverId.toString() !== userId.toString()) {
                return res.status(403).json({
                    success: false,
                    error: 'You can only mark feedback addressed to you as viewed'
                });
            }
        }

        // Already viewed or resolved? Don't change status
        if (feedback.status !== 'new') {
            return res.status(200).json({
                success: true,
                message: 'Feedback already viewed',
                data: feedback
            });
        }

        // Update status
        feedback.status = 'viewed';
        feedback.viewedAt = new Date();
        feedback.viewedBy = userId;
        await feedback.save();

        await feedback.populate('senderId', 'name username');
        await feedback.populate('receiverId', 'name username');

        res.status(200).json({
            success: true,
            message: 'Feedback marked as viewed',
            data: feedback
        });

    } catch (error) {
        console.error('Mark As Viewed Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update feedback'
        });
    }
};

// @desc    Mark feedback as resolved
// @route   PUT /api/admin/feedback/:id/resolve
// @access  Private (Admin only)
exports.markAsResolved = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        // Only admin can resolve (route is already admin-protected, but double-check)
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Only admin can mark feedback as resolved'
            });
        }

        const feedback = await Feedback.findById(id);

        if (!feedback) {
            return res.status(404).json({
                success: false,
                error: 'Feedback not found'
            });
        }

        // Already resolved?
        if (feedback.status === 'resolved') {
            return res.status(200).json({
                success: true,
                message: 'Feedback already resolved',
                data: feedback
            });
        }

        // Update status
        feedback.status = 'resolved';
        feedback.resolvedAt = new Date();
        feedback.resolvedBy = userId;

        // Also set viewed if not already
        if (!feedback.viewedAt) {
            feedback.viewedAt = new Date();
            feedback.viewedBy = userId;
        }

        await feedback.save();

        await feedback.populate('senderId', 'name username');
        await feedback.populate('receiverId', 'name username');

        res.status(200).json({
            success: true,
            message: 'Feedback marked as resolved',
            data: feedback
        });

    } catch (error) {
        console.error('Mark As Resolved Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update feedback'
        });
    }
};

// @desc    Get list of faculty (for student dropdown)
// @route   GET /api/student/feedback/faculty-list
// @access  Private (Student)
exports.getFacultyList = async (req, res) => {
    try {
        // Get all faculty with their user info
        const facultyMembers = await Faculty.find()
            .populate({
                path: 'userId',
                select: 'name username status',
                match: { status: 'active' }  // Only active users
            })
            .populate('departmentId', 'name')
            .select('userId departmentId designation');

        // Filter out faculty with inactive/null users and format response
        const activeFaculty = facultyMembers
            .filter(f => f.userId)  // Only include if userId populated (active user)
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
