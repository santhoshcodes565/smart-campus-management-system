const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    processChat,
    getSuggestions,
    clearContext
} = require('../controllers/chatController');

// All routes require authentication
router.use(protect);

// POST /api/chat - Process chat message
router.post('/', processChat);

// GET /api/chat/suggestions - Get quick suggestions
router.get('/suggestions', getSuggestions);

// POST /api/chat/clear - Clear conversation context
router.post('/clear', clearContext);

module.exports = router;
