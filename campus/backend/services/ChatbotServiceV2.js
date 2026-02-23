/**
 * ChatbotServiceV2
 * Enhanced Smart Campus Chatbot with OpenAI Integration
 * 
 * ARCHITECTURE FLOW:
 * 1. Extract userId and role from JWT (already done by controller)
 * 2. Check campus scope (domain control)
 * 3. Detect intent
 * 4. Run authorization check
 * 5. Retrieve LIVE MongoDB data
 * 6. Generate OpenAI response (or fallback)
 * 7. Return structured response
 * 
 * SECURITY:
 * - Authorization runs BEFORE data retrieval
 * - AI NEVER decides permissions
 * - Data is grounded - no hallucinations
 */

const openaiService = require('./openaiService');
const authorizationService = require('./authorizationService');
const intentService = require('./intentService');
const retrievalService = require('./retrievalService');

class ChatbotServiceV2 {
    constructor() {
        // Conversation context for follow-up queries
        this.conversationContext = new Map(); // userId -> { lastIntent, lastData }
    }

    /**
     * Process a chat message with AI integration
     * @param {string} message - User's message
     * @param {string} userId - User ID from JWT
     * @param {string} userRole - User role (student/faculty/admin)
     * @returns {Object} Response object
     */
    async processMessage(message, userId, userRole) {
        try {
            const normalizedMessage = message.toLowerCase().trim();

            // ==================== STEP 1: DOMAIN CONTROL ====================
            // Check if query is campus-related BEFORE any processing
            if (!intentService.isCampusQuery(normalizedMessage)) {
                console.log(`[ChatbotV2] Out of scope query from ${userRole}`);
                return {
                    success: true,
                    intent: 'out_of_scope',
                    response: intentService.getScopeRestrictionMessage(),
                    suggestions: this.getDefaultSuggestions(userRole)
                };
            }

            // ==================== STEP 2: DETECT INTENT ====================
            const intentResult = intentService.detectIntent(normalizedMessage);
            const { intent, category, entities } = intentResult;

            console.log(`[ChatbotV2] Intent: ${intent}, Category: ${category}, User: ${userRole}`);

            // Handle greetings specially (normalize greeting_short → greeting)
            if (intent === 'greeting' || intent === 'greeting_short') {
                return this.getGreetingResponse(userRole, userId);
            }

            // Handle help specially
            if (intent === 'help') {
                return {
                    success: true,
                    intent: 'help',
                    response: intentService.getHelpMessage(userRole),
                    suggestions: this.getDefaultSuggestions(userRole)
                };
            }

            // Handle unrecognized/general intent — don't fall through to data retrieval
            if (intent === 'general' || intent === 'unknown') {
                return {
                    success: true,
                    intent: intent,
                    response: 'I didn\'t understand that query. Try asking about attendance, timetable, assignments, marks, fees, or announcements.',
                    suggestions: this.getDefaultSuggestions(userRole)
                };
            }

            // ==================== STEP 3: AUTHORIZATION CHECK ====================
            // Check permissions BEFORE data retrieval
            const authResult = authorizationService.authorize(userRole, intent, {
                requestingUserId: userId
            });

            if (!authResult.authorized) {
                console.log(`[ChatbotV2] Authorization denied: ${authResult.reason}`);
                return {
                    success: true,
                    intent: intent,
                    response: authorizationService.getDenialMessage(),
                    suggestions: this.getDefaultSuggestions(userRole)
                };
            }

            // ==================== STEP 4: RETRIEVE LIVE DATA ====================
            // Only retrieve data AFTER authorization passes
            const startTime = Date.now();
            const campusData = await retrievalService.getData(intent, userId, userRole, entities);
            const retrievalTime = Date.now() - startTime;
            console.log(`[ChatbotV2] MongoDB retrieval: ${retrievalTime}ms`);

            // Check if retrieval failed
            if (campusData.error && Object.keys(campusData).length === 1) {
                return {
                    success: true,
                    intent: intent,
                    response: campusData.error,
                    suggestions: this.getDefaultSuggestions(userRole)
                };
            }

            // Update conversation context
            this.conversationContext.set(userId, {
                lastIntent: intent,
                lastData: campusData,
                timestamp: Date.now()
            });

            // ==================== STEP 5: OPTIONAL AI ====================
            // PERFORMANCE: Only use AI when truly needed
            // Structured data returns INSTANTLY without AI formatting

            const useAI = this.shouldUseAI(intent, campusData);
            let response;

            if (useAI && openaiService.isConfigured()) {
                // Complex query - use AI for natural language formatting
                response = await openaiService.generateResponse(message, campusData, userRole);
            } else {
                // INSTANT PATH: Format structured data directly
                response = openaiService.formatFallbackResponse(campusData);
            }

            const totalTime = Date.now() - startTime;
            console.log(`[ChatbotV2] Total response time: ${totalTime}ms (AI: ${useAI})`);

            return {
                success: true,
                intent: intent,
                response: response,
                data: this.sanitizeDataForClient(campusData),
                suggestions: this.getSuggestionsForIntent(intent, userRole)
            };

        } catch (error) {
            console.error('[ChatbotV2] Error processing message:', error);
            return {
                success: false,
                intent: 'error',
                response: 'System temporarily unavailable. Please try again.',
                suggestions: this.getDefaultSuggestions(userRole)
            };
        }
    }

    /**
 * Get greeting response
 */
    getGreetingResponse(userRole, userId) {
        return {
            success: true,
            intent: 'greeting',
            response: 'Smart Campus Assistant. How can I help?',
            suggestions: this.getDefaultSuggestions(userRole)
        };
    }

    /**
     * PERFORMANCE: Determine if AI formatting is needed
     * Structured data types can be returned INSTANTLY without AI
     * AI is only used for complex/conversational queries
     */
    shouldUseAI(intent, campusData) {
        // Intents that have well-structured data - skip AI for instant response
        const structuredIntents = [
            'my_attendance',
            'my_marks',
            'today_timetable',
            'tomorrow_timetable',
            'class_schedule',
            'my_fees',
            'fee_status',
            'pending_fees',
            'exam_dates',
            'upcoming_exams',
            'today_assignment',
            'upcoming_assignments',
            'my_assignments',
            'announcements',
            'notices',
            'student_count',
            'faculty_count'
        ];

        // Skip AI for structured intents (instant response)
        if (structuredIntents.includes(intent)) {
            return false;
        }

        // Skip AI if data is empty or has error
        if (!campusData || campusData.error) {
            return false;
        }

        // Use AI for complex queries or analytics
        return true;
    }

    /**
     * Get default suggestions based on role
     */
    getDefaultSuggestions(userRole) {
        switch (userRole) {
            case 'student':
                return [
                    'My Attendance',
                    'My Marks',
                    'Today Timetable',
                    'Pending Fees'
                ];
            case 'faculty':
                return [
                    'My Timetable',
                    'Class Attendance',
                    'Announcements',
                    'Help'
                ];
            case 'admin':
                return [
                    'Department Analytics',
                    'Announcements',
                    'Student Stats',
                    'Help'
                ];
            default:
                return [
                    'Help',
                    'Announcements',
                    'Today Timetable'
                ];
        }
    }

    /**
     * Get suggestions based on completed intent
     */
    getSuggestionsForIntent(intent, userRole) {
        const intentSuggestions = {
            my_attendance: ['My Marks', 'Today Timetable', 'Announcements'],
            my_marks: ['My Attendance', 'Exam Dates', 'Pending Fees'],
            today_timetable: ['Tomorrow Timetable', 'My Attendance', 'Assignments'],
            tomorrow_timetable: ['Today Timetable', 'My Attendance', 'Exam Dates'],
            my_fees: ['My Attendance', 'My Marks', 'Announcements'],
            exam_dates: ['My Marks', 'Today Timetable', 'Announcements'],
            announcements: ['Today Timetable', 'Exam Dates', 'My Attendance'],
            today_assignment: ['Upcoming Assignments', 'Today Timetable', 'My Marks'],
            upcoming_assignments: ['Today Assignment', 'Today Timetable', 'Exam Dates']
        };

        return intentSuggestions[intent] || this.getDefaultSuggestions(userRole);
    }

    /**
     * Sanitize data before sending to client (remove sensitive fields)
     */
    sanitizeDataForClient(data) {
        if (!data) return {};

        // Remove internal IDs and sensitive fields
        const sanitized = { ...data };

        // Remove _id fields from nested objects
        const cleanObject = (obj) => {
            if (Array.isArray(obj)) {
                return obj.map(cleanObject);
            }
            if (obj && typeof obj === 'object') {
                const cleaned = {};
                for (const [key, value] of Object.entries(obj)) {
                    if (key !== '_id' && key !== '__v' && !key.startsWith('_')) {
                        cleaned[key] = cleanObject(value);
                    }
                }
                return cleaned;
            }
            return obj;
        };

        return cleanObject(sanitized);
    }

    /**
     * Clear conversation context for a user
     */
    clearContext(userId) {
        this.conversationContext.delete(userId);
    }

    /**
     * Check if OpenAI is configured
     */
    isAIEnabled() {
        return openaiService.isConfigured();
    }
}

// Export singleton instance
module.exports = new ChatbotServiceV2();
