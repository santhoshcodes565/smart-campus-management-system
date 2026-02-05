/**
 * ChatbotService
 * Smart Campus Chatbot - Intent Detection & Data Fetching
 * 
 * Handles:
 * - Intent detection with keyword/phrase matching and synonym support
 * - Database queries based on detected intent
 * - Response formatting
 * - Scope restriction for non-campus queries
 */

const Assignment = require('../models/Assignment');
const Timetable = require('../models/Timetable');
const Attendance = require('../models/Attendance');
const Notice = require('../models/Notice');
const Exam = require('../models/Exam');
const Department = require('../models/Department');
const Faculty = require('../models/Faculty');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const User = require('../models/User');

// ==================== INTENT PATTERNS ====================
const INTENT_PATTERNS = {
    today_assignment: {
        patterns: [
            'today assignment', 'today\'s assignment', 'assignment today',
            'today work', 'today\'s work', 'today homework', 'today\'s homework',
            'what is today work', 'what is due today', 'assignments for today',
            'today task', 'today\'s task'
        ],
        priority: 1
    },
    subject_assignments: {
        patterns: [
            'assignment for', 'assignments for', 'homework for',
            'assignment in', 'assignments in', 'work for'
        ],
        priority: 2
    },
    upcoming_assignments: {
        patterns: [
            'upcoming assignment', 'upcoming assignments', 'pending assignment',
            'pending assignments', 'due assignment', 'assignments due',
            'what assignments', 'my assignments', 'all assignments'
        ],
        priority: 3
    },
    today_timetable: {
        patterns: [
            'today timetable', 'today\'s timetable', 'timetable today',
            'today classes', 'today\'s classes', 'classes today',
            'today schedule', 'today\'s schedule', 'schedule today',
            'what classes today', 'what is my schedule today'
        ],
        priority: 1
    },
    tomorrow_timetable: {
        patterns: [
            'tomorrow timetable', 'tomorrow\'s timetable', 'timetable tomorrow',
            'tomorrow classes', 'tomorrow\'s classes', 'classes tomorrow',
            'tomorrow schedule', 'tomorrow\'s schedule'
        ],
        priority: 1
    },
    class_schedule: {
        patterns: [
            'class schedule', 'weekly timetable', 'full timetable',
            'weekly schedule', 'full schedule', 'all classes',
            'week schedule', 'my timetable', 'show timetable'
        ],
        priority: 2
    },
    my_attendance: {
        patterns: [
            'my attendance', 'attendance status', 'attendance percentage',
            'check attendance', 'show attendance', 'attendance report',
            'how is my attendance', 'what is my attendance'
        ],
        priority: 1
    },
    announcements: {
        patterns: [
            'announcement', 'announcements', 'notice', 'notices',
            'updates', 'news', 'latest updates', 'any announcement',
            'any notice', 'new announcements', 'recent notices'
        ],
        priority: 1
    },
    exam_dates: {
        patterns: [
            'exam date', 'exam dates', 'upcoming exam', 'upcoming exams',
            'exam schedule', 'when is exam', 'when are exams',
            'next exam', 'examination dates', 'test dates'
        ],
        priority: 1
    },
    campus_events: {
        patterns: [
            'campus event', 'campus events', 'events', 'happenings',
            'what events', 'upcoming events', 'college events',
            'any events', 'event schedule'
        ],
        priority: 2
    },
    department_info: {
        patterns: [
            'department info', 'department information', 'about department',
            'department details', 'dept info', 'my department'
        ],
        priority: 2
    },
    faculty_contact: {
        patterns: [
            'faculty contact', 'teacher contact', 'professor contact',
            'faculty info', 'teacher info', 'faculty details',
            'contact of', 'email of', 'phone of'
        ],
        priority: 2
    },
    help: {
        patterns: [
            'help', 'what can you do', 'commands', 'options',
            'how to use', 'guide', 'assist me'
        ],
        priority: 1
    }
};

// Day names for timetable queries
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ==================== SCOPE KEYWORDS ====================
// Keywords that indicate campus-related queries
const CAMPUS_KEYWORDS = [
    'assignment', 'homework', 'work', 'task', 'project',
    'timetable', 'schedule', 'class', 'classes', 'lecture',
    'attendance', 'present', 'absent',
    'announcement', 'notice', 'update', 'news',
    'exam', 'test', 'examination', 'quiz',
    'event', 'campus', 'college', 'university',
    'department', 'faculty', 'teacher', 'professor', 'sir', 'madam',
    'subject', 'course', 'semester', 'year',
    'fee', 'fees', 'payment',
    'library', 'lab', 'canteen', 'hostel',
    'help', 'hi', 'hello', 'hey'
];

class ChatbotService {
    constructor() {
        this.conversationContext = new Map(); // userId -> last intent
    }

    /**
     * Process a chat message
     * @param {string} message - User's message
     * @param {string} userId - User ID
     * @param {string} userRole - User role (student/faculty/admin)
     * @returns {Object} Response object
     */
    async processMessage(message, userId, userRole) {
        try {
            const normalizedMessage = message.toLowerCase().trim();

            // Check scope restriction first
            if (!this.isWithinScope(normalizedMessage)) {
                return this.getScopeRestrictionResponse();
            }

            // Detect intent
            const { intent, extractedData } = this.detectIntent(normalizedMessage, userId);

            // If no intent detected, check context
            if (!intent) {
                const lastIntent = this.conversationContext.get(userId);
                if (lastIntent && this.isContextualQuery(normalizedMessage)) {
                    return await this.handleContextualQuery(normalizedMessage, lastIntent, userId, userRole);
                }
                return this.getUnknownIntentResponse();
            }

            // Update context
            this.conversationContext.set(userId, intent);

            // Handle intent
            const response = await this.handleIntent(intent, extractedData, userId, userRole);
            return response;

        } catch (error) {
            console.error('[ChatbotService] Error processing message:', error);
            return {
                success: false,
                intent: 'error',
                response: 'I encountered an error processing your request. Please try again.',
                suggestions: this.getDefaultSuggestions()
            };
        }
    }

    /**
     * Check if message is within campus scope
     */
    isWithinScope(message) {
        // Greetings are always allowed
        if (['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'].some(g => message.includes(g))) {
            return true;
        }

        // Check if any campus keyword is present
        return CAMPUS_KEYWORDS.some(keyword => message.includes(keyword));
    }

    /**
     * Get scope restriction response
     */
    getScopeRestrictionResponse() {
        return {
            success: true,
            intent: 'out_of_scope',
            response: 'I am a campus assistant chatbot and can only answer campus-related questions. Try asking about assignments, timetable, attendance, announcements, or exams.',
            suggestions: this.getDefaultSuggestions()
        };
    }

    /**
     * Detect intent from message
     */
    detectIntent(message, userId) {
        let detectedIntent = null;
        let highestPriority = 999;
        let extractedData = {};

        for (const [intent, config] of Object.entries(INTENT_PATTERNS)) {
            for (const pattern of config.patterns) {
                if (message.includes(pattern)) {
                    if (config.priority < highestPriority) {
                        highestPriority = config.priority;
                        detectedIntent = intent;

                        // Extract additional data for specific intents
                        if (intent === 'subject_assignments') {
                            // Try to extract subject name
                            const words = message.split(' ');
                            const patternWords = pattern.split(' ');
                            const patternIndex = words.findIndex((w, i) =>
                                patternWords.every((pw, pi) => words[i + pi]?.includes(pw))
                            );
                            if (patternIndex >= 0) {
                                const subjectPart = words.slice(patternIndex + patternWords.length).join(' ');
                                if (subjectPart) {
                                    extractedData.subjectName = subjectPart.trim();
                                }
                            }
                        }
                    }
                    break;
                }
            }
        }

        return { intent: detectedIntent, extractedData };
    }

    /**
     * Check if query is contextual (referring to previous intent)
     */
    isContextualQuery(message) {
        const contextualWords = ['today', 'tomorrow', 'what', 'show', 'more', 'detail', 'details'];
        return contextualWords.some(word => message.includes(word));
    }

    /**
     * Handle contextual query based on previous intent
     */
    async handleContextualQuery(message, lastIntent, userId, userRole) {
        if (message.includes('tomorrow')) {
            if (lastIntent.includes('timetable') || lastIntent.includes('schedule')) {
                return await this.handleIntent('tomorrow_timetable', {}, userId, userRole);
            }
        }
        if (message.includes('today')) {
            if (lastIntent.includes('timetable') || lastIntent.includes('schedule')) {
                return await this.handleIntent('today_timetable', {}, userId, userRole);
            }
            if (lastIntent.includes('assignment')) {
                return await this.handleIntent('today_assignment', {}, userId, userRole);
            }
        }
        return this.getUnknownIntentResponse();
    }

    /**
     * Get unknown intent response
     */
    getUnknownIntentResponse() {
        return {
            success: true,
            intent: 'unknown',
            response: 'I could not understand your campus query. Try asking about assignments, timetable, attendance, or announcements.',
            suggestions: this.getDefaultSuggestions()
        };
    }

    /**
     * Handle detected intent
     */
    async handleIntent(intent, extractedData, userId, userRole) {
        // Get student info for most queries
        let studentInfo = null;
        if (userRole === 'student') {
            const user = await User.findById(userId).lean();
            if (user) {
                studentInfo = await Student.findOne({ userId: userId })
                    .populate('departmentId', 'name code')
                    .populate('courseId', 'name')
                    .lean();
            }
        }

        switch (intent) {
            case 'today_assignment':
                return await this.getTodayAssignments(studentInfo, userRole);

            case 'upcoming_assignments':
                return await this.getUpcomingAssignments(studentInfo, userRole);

            case 'subject_assignments':
                return await this.getSubjectAssignments(extractedData.subjectName, studentInfo, userRole);

            case 'today_timetable':
                return await this.getTodayTimetable(studentInfo, userRole, userId);

            case 'tomorrow_timetable':
                return await this.getTomorrowTimetable(studentInfo, userRole, userId);

            case 'class_schedule':
                return await this.getClassSchedule(studentInfo, userRole, userId);

            case 'my_attendance':
                return await this.getMyAttendance(studentInfo, userRole, userId);

            case 'announcements':
                return await this.getAnnouncements(userRole);

            case 'exam_dates':
                return await this.getExamDates(studentInfo, userRole);

            case 'campus_events':
                return await this.getCampusEvents();

            case 'department_info':
                return await this.getDepartmentInfo(studentInfo, userRole);

            case 'faculty_contact':
                return await this.getFacultyContact(extractedData, studentInfo, userRole);

            case 'help':
                return this.getHelpResponse();

            default:
                return this.getUnknownIntentResponse();
        }
    }

    // ==================== INTENT HANDLERS ====================

    async getTodayAssignments(studentInfo, userRole) {
        if (userRole !== 'student' || !studentInfo) {
            return {
                success: true,
                intent: 'today_assignment',
                response: 'Assignment queries are available for students only. Please login as a student.',
                suggestions: this.getDefaultSuggestions()
            };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const assignments = await Assignment.find({
            departmentId: studentInfo.departmentId?._id || studentInfo.departmentId,
            courseId: studentInfo.courseId?._id || studentInfo.courseId,
            semester: studentInfo.semester,
            section: studentInfo.section,
            status: 'active',
            assignedDate: { $gte: today, $lt: tomorrow }
        }).populate('subjectId', 'name code').lean();

        if (assignments.length === 0) {
            return {
                success: true,
                intent: 'today_assignment',
                response: 'No new assignments were given today. Keep checking for updates!',
                suggestions: ['Upcoming Assignments', 'Today Timetable', 'Announcements']
            };
        }

        let response = `📚 **Today's Assignments (${assignments.length}):**\n\n`;
        assignments.forEach((a, i) => {
            const subject = a.subjectId?.name || a.subjectName || 'Unknown Subject';
            const dueDate = new Date(a.dueDate).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short'
            });
            response += `• **${subject}** — ${a.title}\n  Due: ${dueDate}${a.priority === 'high' ? ' ⚠️' : ''}\n`;
        });

        return {
            success: true,
            intent: 'today_assignment',
            response,
            data: assignments,
            suggestions: ['Upcoming Assignments', 'Today Timetable', 'My Attendance']
        };
    }

    async getUpcomingAssignments(studentInfo, userRole) {
        if (userRole !== 'student' || !studentInfo) {
            return {
                success: true,
                intent: 'upcoming_assignments',
                response: 'Assignment queries are available for students only.',
                suggestions: this.getDefaultSuggestions()
            };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        const assignments = await Assignment.find({
            departmentId: studentInfo.departmentId?._id || studentInfo.departmentId,
            courseId: studentInfo.courseId?._id || studentInfo.courseId,
            semester: studentInfo.semester,
            section: studentInfo.section,
            status: 'active',
            dueDate: { $gte: today, $lte: nextWeek }
        }).populate('subjectId', 'name code').sort({ dueDate: 1 }).lean();

        if (assignments.length === 0) {
            return {
                success: true,
                intent: 'upcoming_assignments',
                response: 'No upcoming assignments due in the next 7 days. Enjoy your free time!',
                suggestions: ['Today Timetable', 'Announcements', 'Exam Dates']
            };
        }

        let response = `📋 **Upcoming Assignments (${assignments.length}):**\n\n`;
        assignments.forEach((a) => {
            const subject = a.subjectId?.name || a.subjectName || 'Unknown';
            const dueDate = new Date(a.dueDate).toLocaleDateString('en-IN', {
                weekday: 'short', day: 'numeric', month: 'short'
            });
            response += `• **${subject}** — ${a.title}\n  Due: ${dueDate}${a.priority === 'high' ? ' ⚠️ High Priority' : ''}\n`;
        });

        return {
            success: true,
            intent: 'upcoming_assignments',
            response,
            data: assignments,
            suggestions: ['Today Assignment', 'Today Timetable', 'Exam Dates']
        };
    }

    async getSubjectAssignments(subjectName, studentInfo, userRole) {
        if (!subjectName) {
            return {
                success: true,
                intent: 'subject_assignments',
                response: 'Please specify the subject name. For example: "assignments for DBMS"',
                suggestions: ['Today Assignment', 'Upcoming Assignments']
            };
        }

        const subject = await Subject.findOne({
            $or: [
                { name: { $regex: subjectName, $options: 'i' } },
                { code: { $regex: subjectName, $options: 'i' } }
            ]
        }).lean();

        if (!subject) {
            return {
                success: true,
                intent: 'subject_assignments',
                response: `I couldn't find a subject matching "${subjectName}". Please check the subject name and try again.`,
                suggestions: ['Today Assignment', 'Upcoming Assignments']
            };
        }

        const assignments = await Assignment.find({
            subjectId: subject._id,
            status: 'active'
        }).sort({ dueDate: 1 }).lean();

        if (assignments.length === 0) {
            return {
                success: true,
                intent: 'subject_assignments',
                response: `No active assignments found for ${subject.name}.`,
                suggestions: ['Today Assignment', 'Upcoming Assignments']
            };
        }

        let response = `📚 **${subject.name} Assignments (${assignments.length}):**\n\n`;
        assignments.forEach((a) => {
            const dueDate = new Date(a.dueDate).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short'
            });
            response += `• ${a.title} — Due: ${dueDate}\n`;
        });

        return {
            success: true,
            intent: 'subject_assignments',
            response,
            suggestions: ['Today Assignment', 'Upcoming Assignments']
        };
    }

    async getTodayTimetable(studentInfo, userRole, userId) {
        const today = new Date();
        const dayName = DAYS[today.getDay()];

        if (dayName === 'Sunday') {
            return {
                success: true,
                intent: 'today_timetable',
                response: '🎉 Today is Sunday! No classes scheduled. Enjoy your day off!',
                suggestions: ['Tomorrow Timetable', 'Announcements', 'Campus Events']
            };
        }

        let timetable;
        if (userRole === 'student' && studentInfo) {
            timetable = await Timetable.findOne({
                department: studentInfo.departmentId?.code || studentInfo.departmentId?.name,
                year: studentInfo.year,
                section: studentInfo.section,
                day: dayName,
                status: 'published'
            }).populate('slots.subjectId', 'name code').lean();
        } else if (userRole === 'faculty') {
            const faculty = await Faculty.findOne({ userId }).lean();
            if (faculty) {
                timetable = await Timetable.findOne({
                    'slots.faculty': faculty._id,
                    day: dayName,
                    status: 'published'
                }).populate('slots.subjectId', 'name code').lean();
            }
        }

        if (!timetable || !timetable.slots || timetable.slots.length === 0) {
            return {
                success: true,
                intent: 'today_timetable',
                response: `I checked the campus records but did not find any timetable for ${dayName}.`,
                suggestions: ['Tomorrow Timetable', 'Full Schedule', 'Announcements']
            };
        }

        let response = `📅 **Today's Timetable (${dayName}):**\n\n`;
        const sortedSlots = timetable.slots.sort((a, b) => {
            const timeA = a.startTime.replace(':', '');
            const timeB = b.startTime.replace(':', '');
            return parseInt(timeA) - parseInt(timeB);
        });

        sortedSlots.forEach((slot) => {
            const subject = slot.subjectId?.name || slot.subject || 'Free Period';
            const type = slot.type === 'lab' ? '🔬' : slot.type === 'tutorial' ? '📝' : '📖';
            response += `${type} **${slot.startTime} - ${slot.endTime}** — ${subject}`;
            if (slot.room) response += ` (${slot.room})`;
            response += '\n';
        });

        return {
            success: true,
            intent: 'today_timetable',
            response,
            data: timetable,
            suggestions: ['Tomorrow Timetable', 'My Attendance', 'Today Assignment']
        };
    }

    async getTomorrowTimetable(studentInfo, userRole, userId) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayName = DAYS[tomorrow.getDay()];

        if (dayName === 'Sunday') {
            return {
                success: true,
                intent: 'tomorrow_timetable',
                response: '🎉 Tomorrow is Sunday! No classes scheduled.',
                suggestions: ['Today Timetable', 'Announcements']
            };
        }

        let timetable;
        if (userRole === 'student' && studentInfo) {
            timetable = await Timetable.findOne({
                department: studentInfo.departmentId?.code || studentInfo.departmentId?.name,
                year: studentInfo.year,
                section: studentInfo.section,
                day: dayName,
                status: 'published'
            }).populate('slots.subjectId', 'name code').lean();
        }

        if (!timetable || !timetable.slots || timetable.slots.length === 0) {
            return {
                success: true,
                intent: 'tomorrow_timetable',
                response: `I couldn't find the timetable for ${dayName}.`,
                suggestions: ['Today Timetable', 'Full Schedule']
            };
        }

        let response = `📅 **Tomorrow's Timetable (${dayName}):**\n\n`;
        const sortedSlots = timetable.slots.sort((a, b) => {
            const timeA = a.startTime.replace(':', '');
            const timeB = b.startTime.replace(':', '');
            return parseInt(timeA) - parseInt(timeB);
        });

        sortedSlots.forEach((slot) => {
            const subject = slot.subjectId?.name || slot.subject || 'Free Period';
            response += `• **${slot.startTime} - ${slot.endTime}** — ${subject}\n`;
        });

        return {
            success: true,
            intent: 'tomorrow_timetable',
            response,
            suggestions: ['Today Timetable', 'My Attendance']
        };
    }

    async getClassSchedule(studentInfo, userRole, userId) {
        if (userRole !== 'student' || !studentInfo) {
            return {
                success: true,
                intent: 'class_schedule',
                response: 'Full schedule is available for students. Please login as a student.',
                suggestions: this.getDefaultSuggestions()
            };
        }

        const timetables = await Timetable.find({
            department: studentInfo.departmentId?.code || studentInfo.departmentId?.name,
            year: studentInfo.year,
            section: studentInfo.section,
            status: 'published'
        }).populate('slots.subjectId', 'name code').lean();

        if (timetables.length === 0) {
            return {
                success: true,
                intent: 'class_schedule',
                response: 'I couldn\'t find your weekly schedule. Please contact the admin.',
                suggestions: ['Announcements', 'Exam Dates']
            };
        }

        let response = '📅 **Your Weekly Schedule:**\n\n';
        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        dayOrder.forEach(day => {
            const dayTimetable = timetables.find(t => t.day === day);
            if (dayTimetable && dayTimetable.slots.length > 0) {
                response += `**${day}:**\n`;
                dayTimetable.slots.sort((a, b) => {
                    const timeA = a.startTime.replace(':', '');
                    const timeB = b.startTime.replace(':', '');
                    return parseInt(timeA) - parseInt(timeB);
                }).forEach(slot => {
                    const subject = slot.subjectId?.name || slot.subject;
                    response += `  ${slot.startTime}-${slot.endTime}: ${subject}\n`;
                });
                response += '\n';
            }
        });

        return {
            success: true,
            intent: 'class_schedule',
            response,
            suggestions: ['Today Timetable', 'My Attendance']
        };
    }

    async getMyAttendance(studentInfo, userRole, userId) {
        if (userRole !== 'student' || !studentInfo) {
            return {
                success: true,
                intent: 'my_attendance',
                response: 'Attendance information is available for students only.',
                suggestions: this.getDefaultSuggestions()
            };
        }

        // Get attendance records for this student
        const attendanceRecords = await Attendance.find({
            'records.studentId': studentInfo._id,
            isV2: true,
            isLocked: true
        }).populate('subjectId', 'name code').lean();

        if (attendanceRecords.length === 0) {
            return {
                success: true,
                intent: 'my_attendance',
                response: 'No attendance records found yet. Attendance will appear here once your teachers mark it.',
                suggestions: ['Today Timetable', 'Announcements']
            };
        }

        // Calculate subject-wise attendance
        const subjectStats = {};
        attendanceRecords.forEach(record => {
            const subjectName = record.subjectId?.name || 'Unknown';
            if (!subjectStats[subjectName]) {
                subjectStats[subjectName] = { present: 0, total: 0 };
            }

            const studentRecord = record.records.find(
                r => r.studentId.toString() === studentInfo._id.toString()
            );
            if (studentRecord) {
                subjectStats[subjectName].total++;
                if (studentRecord.status === 'present') {
                    subjectStats[subjectName].present++;
                }
            }
        });

        let response = '📊 **Your Attendance Summary:**\n\n';
        let overallPresent = 0, overallTotal = 0;

        Object.entries(subjectStats).forEach(([subject, stats]) => {
            const percentage = stats.total > 0
                ? ((stats.present / stats.total) * 100).toFixed(1)
                : 0;
            const emoji = percentage >= 75 ? '✅' : percentage >= 60 ? '⚠️' : '❌';
            response += `${emoji} **${subject}**: ${percentage}% (${stats.present}/${stats.total})\n`;
            overallPresent += stats.present;
            overallTotal += stats.total;
        });

        const overallPercentage = overallTotal > 0
            ? ((overallPresent / overallTotal) * 100).toFixed(1)
            : 0;
        response += `\n📈 **Overall**: ${overallPercentage}% (${overallPresent}/${overallTotal} classes)`;

        if (overallPercentage < 75) {
            response += '\n\n⚠️ *Your attendance is below 75%. Please attend classes regularly.*';
        }

        return {
            success: true,
            intent: 'my_attendance',
            response,
            suggestions: ['Today Timetable', 'Today Assignment', 'Announcements']
        };
    }

    async getAnnouncements(userRole) {
        const notices = await Notice.find({
            isActive: true,
            $or: [
                { targetAudience: 'all' },
                { targetAudience: userRole === 'faculty' ? 'faculty' : 'students' }
            ]
        }).sort({ createdAt: -1 }).limit(5).lean();

        if (notices.length === 0) {
            return {
                success: true,
                intent: 'announcements',
                response: 'No recent announcements. Check back later!',
                suggestions: ['Today Timetable', 'Exam Dates', 'Campus Events']
            };
        }

        let response = '📢 **Recent Announcements:**\n\n';
        notices.forEach((notice, i) => {
            const date = new Date(notice.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short'
            });
            const priority = notice.priority === 'urgent' || notice.priority === 'high' ? '🔴' :
                notice.priority === 'medium' ? '🟡' : '🟢';
            response += `${priority} **${notice.title}**\n`;
            response += `   ${notice.content.substring(0, 100)}${notice.content.length > 100 ? '...' : ''}\n`;
            response += `   📅 ${date}\n\n`;
        });

        return {
            success: true,
            intent: 'announcements',
            response,
            data: notices,
            suggestions: ['Today Timetable', 'Exam Dates', 'Campus Events']
        };
    }

    async getExamDates(studentInfo, userRole) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let query = {
            date: { $gte: today },
            status: { $in: ['scheduled', 'published'] }
        };

        if (userRole === 'student' && studentInfo) {
            query.courseId = studentInfo.courseId?._id || studentInfo.courseId;
            query.semester = studentInfo.semester;
        }

        const exams = await Exam.find(query)
            .populate('subjectId', 'name code')
            .sort({ date: 1 })
            .limit(10)
            .lean();

        if (exams.length === 0) {
            return {
                success: true,
                intent: 'exam_dates',
                response: 'No upcoming exams scheduled. Keep studying! 📚',
                suggestions: ['Today Timetable', 'Announcements', 'My Attendance']
            };
        }

        let response = '📝 **Upcoming Exams:**\n\n';
        exams.forEach((exam) => {
            const subject = exam.subjectId?.name || 'Unknown';
            const date = new Date(exam.date).toLocaleDateString('en-IN', {
                weekday: 'short', day: 'numeric', month: 'short'
            });
            const type = exam.examType.charAt(0).toUpperCase() + exam.examType.slice(1);
            response += `• **${subject}** — ${type}\n`;
            response += `  📅 ${date} | Marks: ${exam.maxMarks}\n`;
        });

        return {
            success: true,
            intent: 'exam_dates',
            response,
            data: exams,
            suggestions: ['Today Timetable', 'My Attendance', 'Announcements']
        };
    }

    async getCampusEvents() {
        const notices = await Notice.find({
            isActive: true,
            type: 'event'
        }).sort({ createdAt: -1 }).limit(5).lean();

        if (notices.length === 0) {
            return {
                success: true,
                intent: 'campus_events',
                response: 'No upcoming campus events at the moment. Stay tuned!',
                suggestions: ['Announcements', 'Exam Dates', 'Today Timetable']
            };
        }

        let response = '🎉 **Campus Events:**\n\n';
        notices.forEach((notice) => {
            const date = new Date(notice.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short'
            });
            response += `• **${notice.title}**\n  ${notice.content.substring(0, 80)}...\n  📅 ${date}\n\n`;
        });

        return {
            success: true,
            intent: 'campus_events',
            response,
            suggestions: ['Announcements', 'Today Timetable']
        };
    }

    async getDepartmentInfo(studentInfo, userRole) {
        let department;
        if (studentInfo?.departmentId) {
            department = typeof studentInfo.departmentId === 'object'
                ? studentInfo.departmentId
                : await Department.findById(studentInfo.departmentId).lean();
        }

        if (!department) {
            const departments = await Department.find({ status: 'active' }).lean();
            let response = '🏛️ **Available Departments:**\n\n';
            departments.forEach(d => {
                response += `• **${d.name}** (${d.code})\n`;
            });
            return {
                success: true,
                intent: 'department_info',
                response,
                suggestions: ['Faculty Contact', 'Announcements']
            };
        }

        let response = `🏛️ **${department.name}**\n\n`;
        response += `📌 Code: ${department.code}\n`;
        if (department.description) {
            response += `📝 ${department.description}\n`;
        }

        return {
            success: true,
            intent: 'department_info',
            response,
            suggestions: ['Faculty Contact', 'Today Timetable', 'Announcements']
        };
    }

    async getFacultyContact(extractedData, studentInfo, userRole) {
        let faculty;

        // If searching for specific faculty
        if (extractedData.facultyName) {
            faculty = await Faculty.find({}).populate('userId', 'name phone').lean();
            faculty = faculty.filter(f =>
                f.userId?.name?.toLowerCase().includes(extractedData.facultyName.toLowerCase())
            );
        } else if (studentInfo?.departmentId) {
            // Get faculty from student's department
            const deptId = typeof studentInfo.departmentId === 'object'
                ? studentInfo.departmentId._id
                : studentInfo.departmentId;
            faculty = await Faculty.find({ departmentId: deptId })
                .populate('userId', 'name phone')
                .lean();
        } else {
            faculty = await Faculty.find({})
                .populate('userId', 'name phone')
                .limit(10)
                .lean();
        }

        if (!faculty || faculty.length === 0) {
            return {
                success: true,
                intent: 'faculty_contact',
                response: 'I couldn\'t find faculty information. Please contact the admin office.',
                suggestions: ['Department Info', 'Announcements']
            };
        }

        let response = '👨‍🏫 **Faculty Information:**\n\n';
        faculty.slice(0, 5).forEach(f => {
            response += `• **${f.userId?.name || 'Unknown'}**\n`;
            response += `  ${f.designation}\n`;
            if (f.userId?.phone) response += `  📞 ${f.userId.phone}\n`;
            response += '\n';
        });

        return {
            success: true,
            intent: 'faculty_contact',
            response,
            suggestions: ['Department Info', 'Today Timetable']
        };
    }

    getHelpResponse() {
        return {
            success: true,
            intent: 'help',
            response: `👋 **Hi! I'm your Campus Assistant!**

I can help you with:
• 📚 **Assignments** — "today assignment", "upcoming assignments"
• 📅 **Timetable** — "today timetable", "tomorrow classes"
• 📊 **Attendance** — "my attendance", "attendance status"
• 📢 **Announcements** — "any announcements", "notices"
• 📝 **Exams** — "exam dates", "upcoming exams"
• 🎉 **Events** — "campus events"
• 🏛️ **Department** — "department info"
• 👨‍🏫 **Faculty** — "faculty contact"

Just type your question naturally!`,
            suggestions: ['Today Assignment', 'Today Timetable', 'My Attendance', 'Announcements']
        };
    }

    getDefaultSuggestions() {
        return ['Today Assignment', 'Today Timetable', 'Announcements', 'My Attendance'];
    }
}

// Export singleton instance
module.exports = new ChatbotService();
