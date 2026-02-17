const asyncHandler = require('express-async-handler');
// Use V2 with OpenAI integration (fallback to keyword-based if OpenAI unavailable)
const ChatbotService = require('../services/ChatbotServiceV2');

/**
 * @desc    Process chat message
 * @route   POST /api/chat
 * @access  Private
 */
const processChat = asyncHandler(async (req, res) => {
    const { message } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Validate message
    if (!message || typeof message !== 'string') {
        res.status(400);
        throw new Error('Message is required');
    }

    // Trim and validate length
    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
        res.status(400);
        throw new Error('Message cannot be empty');
    }

    if (trimmedMessage.length > 500) {
        res.status(400);
        throw new Error('Message too long. Please keep it under 500 characters.');
    }

    // Process message through chatbot service
    const response = await ChatbotService.processMessage(
        trimmedMessage,
        userId.toString(),
        userRole
    );

    res.json(response);
});

/**
 * @desc    Get chatbot suggestions
 * @route   GET /api/chat/suggestions
 * @access  Private
 */
const getSuggestions = asyncHandler(async (req, res) => {
    const userRole = req.user.role;

    // Role-specific suggestions
    let suggestions;
    if (userRole === 'student') {
        suggestions = [
            { text: 'My Attendance', icon: '📊' },
            { text: 'My Marks', icon: '📝' },
            { text: 'Today Timetable', icon: '📅' },
            { text: 'Pending Fees', icon: '💰' },
            { text: 'Exam Dates', icon: '📋' },
            { text: 'Help', icon: '❓' }
        ];
    } else if (userRole === 'faculty') {
        suggestions = [
            { text: 'Today Timetable', icon: '📅' },
            { text: 'Announcements', icon: '📢' },
            { text: 'Department Info', icon: '🏛️' },
            { text: 'Help', icon: '❓' }
        ];
    } else {
        suggestions = [
            { text: 'Announcements', icon: '📢' },
            { text: 'Department Info', icon: '🏛️' },
            { text: 'Faculty Contact', icon: '👨‍🏫' },
            { text: 'Help', icon: '❓' }
        ];
    }

    res.json({
        success: true,
        suggestions
    });
});

/**
 * @desc    Clear conversation context
 * @route   POST /api/chat/clear
 * @access  Private
 */
const clearContext = asyncHandler(async (req, res) => {
    const userId = req.user._id.toString();

    // Clear context in service
    ChatbotService.conversationContext.delete(userId);

    res.json({
        success: true,
        message: 'Conversation context cleared'
    });
});

module.exports = {
    processChat,
    getSuggestions,
    clearContext
};
