/**
 * Intent Service
 * Intent detection and domain control for Smart Campus Chatbot
 * 
 * Features:
 * - Keyword-based intent detection (fast, reliable)
 * - Domain control to filter non-campus queries
 * - Entity extraction (dates, subjects, etc.)
 */

// Intent patterns with priority (lower = higher priority)
const INTENT_PATTERNS = {
    // Attendance intents
    my_attendance: {
        patterns: [
            'my attendance', 'attendance status', 'attendance percentage',
            'check attendance', 'show attendance', 'attendance report',
            'how is my attendance', 'what is my attendance'
        ],
        priority: 1,
        category: 'attendance'
    },
    class_attendance: {
        patterns: [
            'class attendance', 'student attendance', 'attendance of class',
            'section attendance', 'batch attendance'
        ],
        priority: 2,
        category: 'attendance',
        requiredRole: ['faculty', 'admin']
    },
    low_attendance_students: {
        patterns: [
            'low attendance', 'students below attendance', 'attendance defaulters',
            'who has low attendance', 'poor attendance'
        ],
        priority: 2,
        category: 'attendance',
        requiredRole: ['faculty', 'admin']
    },

    // Marks/Results intents
    my_marks: {
        patterns: [
            'my marks', 'my grades', 'show marks', 'check marks',
            'what are my marks', 'exam results', 'my results',
            'semester marks', 'subject marks'
        ],
        priority: 1,
        category: 'marks'
    },
    class_marks: {
        patterns: [
            'class marks', 'student marks', 'marks of class',
            'section marks', 'batch marks'
        ],
        priority: 2,
        category: 'marks',
        requiredRole: ['faculty', 'admin']
    },

    // Timetable intents
    today_timetable: {
        patterns: [
            'today timetable', 'today\'s timetable', 'timetable today',
            'today classes', 'today\'s classes', 'classes today',
            'today schedule', 'today\'s schedule', 'schedule today',
            'what classes today', 'what is my schedule today'
        ],
        priority: 1,
        category: 'timetable'
    },
    tomorrow_timetable: {
        patterns: [
            'tomorrow timetable', 'tomorrow\'s timetable', 'timetable tomorrow',
            'tomorrow classes', 'tomorrow\'s classes', 'classes tomorrow',
            'tomorrow schedule', 'tomorrow\'s schedule'
        ],
        priority: 1,
        category: 'timetable'
    },
    class_schedule: {
        patterns: [
            'class schedule', 'weekly timetable', 'full timetable',
            'weekly schedule', 'full schedule', 'all classes',
            'week schedule', 'my timetable', 'show timetable'
        ],
        priority: 2,
        category: 'timetable'
    },

    // Fee intents
    my_fees: {
        patterns: [
            'my fees', 'fee status', 'pending fees', 'check fees',
            'show fees', 'fee payment', 'fee details', 'how much fees',
            'fee due', 'outstanding fees'
        ],
        priority: 1,
        category: 'fees'
    },

    // Exam intents
    exam_dates: {
        patterns: [
            'exam date', 'exam dates', 'upcoming exam', 'upcoming exams',
            'exam schedule', 'when is exam', 'when are exams',
            'next exam', 'examination dates', 'test dates'
        ],
        priority: 1,
        category: 'exams'
    },

    // Assignment intents
    today_assignment: {
        patterns: [
            'today assignment', 'today\'s assignment', 'assignment today',
            'today work', 'today\'s work', 'today homework', 'today\'s homework',
            'what is due today', 'assignments for today'
        ],
        priority: 1,
        category: 'assignments'
    },
    upcoming_assignments: {
        patterns: [
            'upcoming assignment', 'upcoming assignments', 'pending assignment',
            'pending assignments', 'due assignment', 'assignments due',
            'what assignments', 'my assignments', 'all assignments'
        ],
        priority: 2,
        category: 'assignments'
    },

    // Announcement intents
    announcements: {
        patterns: [
            'announcement', 'announcements', 'notice', 'notices',
            'updates', 'news', 'latest updates', 'any announcement',
            'any notice', 'new announcements', 'recent notices'
        ],
        priority: 1,
        category: 'announcements'
    },

    // Department/Faculty intents
    department_info: {
        patterns: [
            'department info', 'department information', 'about department',
            'department details', 'dept info', 'my department'
        ],
        priority: 2,
        category: 'department_info'
    },
    faculty_contact: {
        patterns: [
            'faculty contact', 'teacher contact', 'professor contact',
            'faculty info', 'teacher info', 'faculty details',
            'contact of', 'email of', 'phone of'
        ],
        priority: 2,
        category: 'faculty_contact'
    },

    // Analytics intents (Faculty/Admin)
    department_analytics: {
        patterns: [
            'department analytics', 'class analytics', 'performance analytics',
            'student performance', 'class performance', 'analytics report'
        ],
        priority: 2,
        category: 'analytics',
        requiredRole: ['faculty', 'admin']
    },

    // Count intents (Admin)
    student_count: {
        patterns: [
            'how many students', 'total students', 'student count',
            'number of students', 'students enrolled', 'enrolled students',
            'registered students', 'students registered', 'student stats',
            'student statistics'
        ],
        priority: 1,
        category: 'analytics',
        requiredRole: ['admin']
    },
    faculty_count: {
        patterns: [
            'how many faculty', 'total faculty', 'faculty count',
            'number of faculty', 'total staff', 'staff count',
            'how many staff', 'number of staff', 'total teachers'
        ],
        priority: 1,
        category: 'analytics',
        requiredRole: ['admin']
    },
    department_list: {
        patterns: [
            'department list', 'all departments', 'list departments',
            'show departments', 'departments list', 'how many departments',
            'total departments'
        ],
        priority: 2,
        category: 'department_info',
        requiredRole: ['admin']
    },

    // Help intent
    help: {
        patterns: [
            'help', 'what can you do', 'commands', 'options',
            'how to use', 'guide', 'assist me'
        ],
        priority: 1,
        category: 'help'
    },

    // Greeting intent
    greeting: {
        patterns: [
            'hello', 'hey', 'good morning', 'good afternoon',
            'good evening', 'good night'
        ],
        priority: 1,
        category: 'greeting'
    },
    // Greeting — short exact matches (checked separately to avoid substring issues)
    greeting_short: {
        patterns: ['hi'],
        priority: 1,
        category: 'greeting',
        exactWord: true
    }
};

// Campus-related keywords for domain control
const CAMPUS_KEYWORDS = [
    'assignment', 'homework', 'work', 'task', 'project',
    'timetable', 'schedule', 'class', 'classes', 'lecture',
    'attendance', 'present', 'absent',
    'announcement', 'notice', 'update', 'news',
    'exam', 'test', 'examination', 'quiz', 'marks', 'grade', 'result',
    'event', 'campus', 'college', 'university',
    'department', 'faculty', 'teacher', 'professor', 'sir', 'madam',
    'subject', 'course', 'semester', 'year',
    'fee', 'fees', 'payment', 'tuition',
    'library', 'lab', 'canteen', 'hostel',
    'help', 'hi', 'hello', 'hey',
    'student', 'students', 'enrolled', 'registered', 'enroll', 'register',
    'total', 'count', 'how many', 'number of',
    'staff', 'teachers', 'analytics', 'report', 'performance',
    'leave', 'transport', 'bus', 'route'
];

// Non-campus keywords to explicitly reject
const NON_CAMPUS_KEYWORDS = [
    'cricket', 'football', 'sports', 'match', 'ipl', 'worldcup',
    'politics', 'election', 'minister', 'government',
    'movie', 'film', 'actor', 'actress', 'bollywood', 'hollywood',
    'weather', 'temperature', 'rain',
    'stock', 'share', 'bitcoin', 'crypto',
    'recipe', 'cook', 'food', 'restaurant',
    'travel', 'flight', 'hotel', 'vacation'
];

/**
 * Detect intent from user message
 * @param {string} message - User's message
 * @returns {Object} { intent, category, entities, confidence }
 */
const detectIntent = (message) => {
    try {
        const normalizedMessage = message.toLowerCase().trim();

        let detectedIntent = null;
        let highestPriority = 999;
        let category = 'general';
        let requiredRole = null;

        // Check each intent pattern using word-boundary matching
        for (const [intent, config] of Object.entries(INTENT_PATTERNS)) {
            for (const pattern of config.patterns) {
                let matched = false;
                if (config.exactWord) {
                    // Exact word match using word boundaries (prevents "hi" matching inside "hidden")
                    const regex = new RegExp(`\\b${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
                    matched = regex.test(normalizedMessage);
                } else {
                    // Multi-word patterns: use includes (safe for phrases)
                    matched = normalizedMessage.includes(pattern);
                }
                if (matched) {
                    if (config.priority < highestPriority) {
                        highestPriority = config.priority;
                        detectedIntent = intent;
                        category = config.category;
                        requiredRole = config.requiredRole || null;
                    }
                    break;
                }
            }
        }

        // Extract entities
        const entities = extractEntities(normalizedMessage);

        return {
            intent: detectedIntent || 'general',
            category: category,
            entities: entities,
            requiredRole: requiredRole,
            confidence: detectedIntent ? 0.9 : 0.3
        };

    } catch (error) {
        console.error('[IntentService] Detection error:', error.message);
        return {
            intent: 'unknown',
            category: 'unknown',
            entities: {},
            confidence: 0
        };
    }
};

/**
 * Extract entities from message (dates, subjects, etc.)
 */
const extractEntities = (message) => {
    const entities = {};

    // Extract day references
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const day of days) {
        if (message.includes(day)) {
            entities.day = day.charAt(0).toUpperCase() + day.slice(1);
            break;
        }
    }

    // Extract "today" or "tomorrow"
    if (message.includes('today')) {
        entities.dateRef = 'today';
    } else if (message.includes('tomorrow')) {
        entities.dateRef = 'tomorrow';
    }

    // Extract semester references
    const semesterMatch = message.match(/semester\s*(\d+)/i);
    if (semesterMatch) {
        entities.semester = parseInt(semesterMatch[1]);
    }

    return entities;
};

/**
 * Check if message is within campus scope
 * @param {string} message - User's message
 * @returns {boolean}
 */
const isCampusQuery = (message) => {
    const normalizedMessage = message.toLowerCase().trim();

    // Check for explicit non-campus keywords first
    for (const keyword of NON_CAMPUS_KEYWORDS) {
        if (normalizedMessage.includes(keyword)) {
            return false;
        }
    }

    // Check if any campus keyword is present
    for (const keyword of CAMPUS_KEYWORDS) {
        if (normalizedMessage.includes(keyword)) {
            return true;
        }
    }

    // Short messages (greetings) are allowed
    if (normalizedMessage.length < 20) {
        return true;
    }

    // Default to false if no campus keywords found
    return false;
};

/**
 * Get scope restriction message
 */
const getScopeRestrictionMessage = () => {
    return 'I can assist only with campus-related requests.';
};

/**
 * Get help message based on role
 */
const getHelpMessage = (role) => {
    let helpText = `👋 **Hi! I'm your Campus Assistant!**\n\nI can help you with:\n`;

    if (role === 'student') {
        helpText += `• 📚 **Assignments** — "today assignment", "upcoming assignments"\n`;
        helpText += `• 📅 **Timetable** — "today timetable", "tomorrow classes"\n`;
        helpText += `• 📊 **Attendance** — "my attendance"\n`;
        helpText += `• 📝 **Marks** — "my marks", "my results"\n`;
        helpText += `• 💰 **Fees** — "my fees", "pending fees"\n`;
        helpText += `• 📢 **Announcements** — "any announcements"\n`;
    } else if (role === 'faculty') {
        helpText += `• 📅 **Timetable** — "my timetable", "today classes"\n`;
        helpText += `• 📊 **Attendance** — "class attendance", "low attendance students"\n`;
        helpText += `• 📝 **Marks** — "class marks"\n`;
        helpText += `• 📢 **Announcements** — "any announcements"\n`;
        helpText += `• 📈 **Analytics** — "class analytics"\n`;
    } else if (role === 'admin') {
        helpText += `• 📊 **Analytics** — "department analytics"\n`;
        helpText += `• 👥 **Students** — "student attendance", "student marks"\n`;
        helpText += `• 👨‍🏫 **Faculty** — "faculty info"\n`;
        helpText += `• 💰 **Fees** — "fee reports"\n`;
        helpText += `• 📢 **Announcements** — "announcements"\n`;
    }

    helpText += `\nJust type your question naturally!`;
    return helpText;
};

module.exports = {
    detectIntent,
    isCampusQuery,
    getScopeRestrictionMessage,
    getHelpMessage,
    extractEntities,
    INTENT_PATTERNS,
    CAMPUS_KEYWORDS
};
