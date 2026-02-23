/**
 * Chatbot Unit Tests
 * Tests intent detection, authorization, and fallback formatting
 * 
 * Run: node tests/chatbot.test.js
 */

const intentService = require('../services/intentService');
const authorizationService = require('../services/authorizationService');
const { formatFallbackResponse } = require('../services/openaiService');

let passed = 0;
let failed = 0;

function assert(condition, testName) {
    if (condition) {
        passed++;
        console.log(`  ✅ ${testName}`);
    } else {
        failed++;
        console.log(`  ❌ FAILED: ${testName}`);
    }
}

// ==================== INTENT DETECTION TESTS ====================
console.log('\n📋 INTENT DETECTION TESTS');
console.log('─'.repeat(50));

// Student intents
assert(intentService.detectIntent('my attendance').intent === 'my_attendance', 'Detect "my attendance"');
assert(intentService.detectIntent('today timetable').intent === 'today_timetable', 'Detect "today timetable"');
assert(intentService.detectIntent('today assignment').intent === 'today_assignment', 'Detect "today assignment"');
assert(intentService.detectIntent('upcoming assignments').intent === 'upcoming_assignments', 'Detect "upcoming assignments"');
assert(intentService.detectIntent('my marks').intent === 'my_marks', 'Detect "my marks"');
assert(intentService.detectIntent('my fees').intent === 'my_fees', 'Detect "my fees"');
assert(intentService.detectIntent('exam dates').intent === 'exam_dates', 'Detect "exam dates"');
assert(intentService.detectIntent('announcements').intent === 'announcements', 'Detect "announcements"');
assert(intentService.detectIntent('tomorrow classes').intent === 'tomorrow_timetable', 'Detect "tomorrow classes"');

// Admin intents (buttons)
assert(intentService.detectIntent('student stats').intent === 'student_count', 'Detect "student stats" → student_count');
assert(intentService.detectIntent('department analytics').intent === 'department_analytics', 'Detect "department analytics"');
assert(intentService.detectIntent('how many students').intent === 'student_count', 'Detect "how many students"');
assert(intentService.detectIntent('total faculty').intent === 'faculty_count', 'Detect "total faculty"');
assert(intentService.detectIntent('department list').intent === 'department_list', 'Detect "department list"');
assert(intentService.detectIntent('department info').intent === 'department_info', 'Detect "department info"');
assert(intentService.detectIntent('faculty contact').intent === 'faculty_contact', 'Detect "faculty contact"');

// Greetings
assert(intentService.detectIntent('hello').intent === 'greeting', 'Detect "hello" greeting');
assert(intentService.detectIntent('hi').intent === 'greeting_short', 'Detect "hi" greeting (exact word)');
assert(intentService.detectIntent('hidden').intent !== 'greeting_short', '"hidden" should NOT match "hi"');

// Help
assert(intentService.detectIntent('help').intent === 'help', 'Detect "help"');

// General / unknown
assert(intentService.detectIntent('random gibberish test').intent === 'general', 'Unknown query defaults to "general"');

// ==================== SCOPE CONTROL TESTS ====================
console.log('\n🔒 SCOPE CONTROL TESTS');
console.log('─'.repeat(50));

assert(intentService.isCampusQuery('my attendance'), '"my attendance" is in scope');
assert(intentService.isCampusQuery('student stats'), '"student stats" is in scope');
assert(intentService.isCampusQuery('announcements'), '"announcements" is in scope');
assert(intentService.isCampusQuery('hi'), '"hi" is in scope (short message)');
assert(intentService.isCampusQuery('hello'), '"hello" is in scope');
assert(!intentService.isCampusQuery('what is the weather today in mumbai'), '"weather" is out of scope');
assert(!intentService.isCampusQuery('who won the cricket match yesterday'), '"cricket" is out of scope');

// ==================== AUTHORIZATION TESTS ====================
console.log('\n🛡️ AUTHORIZATION TESTS');
console.log('─'.repeat(50));

// Student permissions
assert(authorizationService.authorize('student', 'my_attendance').authorized, 'Student can access own attendance');
assert(authorizationService.authorize('student', 'my_marks').authorized, 'Student can access own marks');
assert(authorizationService.authorize('student', 'announcements').authorized, 'Student can access announcements');
assert(authorizationService.authorize('student', 'help').authorized, 'Student can access help');

// Admin permissions
assert(authorizationService.authorize('admin', 'student_count').authorized, 'Admin can access student_count');
assert(authorizationService.authorize('admin', 'faculty_count').authorized, 'Admin can access faculty_count');
assert(authorizationService.authorize('admin', 'department_analytics').authorized, 'Admin can access department_analytics');
assert(authorizationService.authorize('admin', 'department_list').authorized, 'Admin can access department_list');
assert(authorizationService.authorize('admin', 'announcements').authorized, 'Admin can access announcements');

// Faculty permissions
assert(authorizationService.authorize('faculty', 'today_timetable').authorized, 'Faculty can access timetable');
assert(authorizationService.authorize('faculty', 'announcements').authorized, 'Faculty can access announcements');
assert(authorizationService.authorize('faculty', 'low_attendance_students').authorized, 'Faculty can access low attendance');

// General/greeting always allowed
assert(authorizationService.authorize('student', 'greeting').authorized, 'Greeting always authorized');
assert(authorizationService.authorize('admin', 'general').authorized, 'General always authorized');

// ==================== FALLBACK FORMATTER TESTS ====================
console.log('\n📝 FALLBACK FORMATTER TESTS');
console.log('─'.repeat(50));

// Empty data
assert(formatFallbackResponse(null) === 'No record found in the system.', 'Null data returns "No record"');
assert(formatFallbackResponse({}) === 'No record found in the system.', 'Empty object returns "No record"');

// No matching intent
const noMatch = formatFallbackResponse({ _noMatchingIntent: true });
assert(!noMatch.includes('I could not find that information'), '_noMatchingIntent no longer says "could not find"');
assert(noMatch.includes('Try asking'), '_noMatchingIntent shows helpful message');

// Attendance data
const attendanceData = {
    attendance: [
        { subject: 'DBMS', percentage: 80, present: 16, total: 20 },
        { subject: 'OS', percentage: 65, present: 13, total: 20 }
    ],
    attendanceSummary: { overall: 72.5, totalPresent: 29, totalClasses: 40, belowThreshold: true }
};
const attResp = formatFallbackResponse(attendanceData);
assert(attResp.includes('Attendance Summary'), 'Attendance formatter works');
assert(attResp.includes('DBMS'), 'Attendance includes subject names');
assert(attResp.includes('Overall'), 'Attendance includes overall summary');

// Announcements data
const announcementData = {
    announcements: [
        { title: 'Holiday Notice', content: 'Campus closed tomorrow', priority: 'high', date: new Date() }
    ]
};
const annResp = formatFallbackResponse(announcementData);
assert(annResp.includes('Announcements'), 'Announcements formatter works');
assert(annResp.includes('Holiday Notice'), 'Announcements include title');

// Empty announcements
const emptyAnn = formatFallbackResponse({ announcements: [], message: 'No recent announcements.' });
assert(emptyAnn.includes('No recent announcements'), 'Empty announcements shows message');

// Exams data
const examData = {
    exams: [
        { subject: 'Math', examType: 'mid-term', date: new Date(), maxMarks: 100 }
    ]
};
const examResp = formatFallbackResponse(examData);
assert(examResp.includes('Upcoming Exams'), 'Exams formatter works');
assert(examResp.includes('Math'), 'Exams include subject name');

// Assignments data
const assignmentData = {
    assignments: [
        { title: 'Lab Report', subject: 'Physics', dueDate: new Date(), priority: 'high' }
    ]
};
const assignResp = formatFallbackResponse(assignmentData);
assert(assignResp.includes('Assignments'), 'Assignments formatter works');
assert(assignResp.includes('Lab Report'), 'Assignments include title');

// Analytics data
const analyticsData = {
    analytics: { totalStudents: 500, totalFaculty: 50, totalDepartments: 5 }
};
const analyticsResp = formatFallbackResponse(analyticsData);
assert(analyticsResp.includes('Campus Analytics'), 'Analytics formatter works');
assert(analyticsResp.includes('500'), 'Analytics includes student count');

// Student count
const countData = { studentCount: { total: 350 } };
assert(formatFallbackResponse(countData).includes('350'), 'Student count formatter works');

// Faculty count
const fCountData = { facultyCount: { total: 42 } };
assert(formatFallbackResponse(fCountData).includes('42'), 'Faculty count formatter works');

// Department list
const deptData = {
    departments: [
        { name: 'Computer Science', code: 'CSE' },
        { name: 'Electronics', code: 'ECE' }
    ]
};
const deptResp = formatFallbackResponse(deptData);
assert(deptResp.includes('Departments'), 'Department list formatter works');
assert(deptResp.includes('Computer Science'), 'Departments include names');

// Timetable with message (Sunday/empty)
const ttMsg = formatFallbackResponse({ timetable: { day: 'Sunday', message: 'No classes on Sunday.', slots: [] } });
assert(ttMsg.includes('No classes on Sunday'), 'Empty timetable shows message');

// Timetable with slots
const ttData = {
    timetable: {
        day: 'Monday',
        slots: [{ startTime: '09:00', endTime: '10:00', subject: 'Math', type: 'lecture', room: 'A101' }]
    }
};
const ttResp = formatFallbackResponse(ttData);
assert(ttResp.includes('Monday'), 'Timetable includes day');
assert(ttResp.includes('Math'), 'Timetable includes subject');

// Error fallback
assert(formatFallbackResponse({ error: 'DB connection failed' }).includes('DB connection failed'), 'Error message is passed through');

// StudentInfo only (no specific data)
const siOnly = formatFallbackResponse({ studentInfo: { name: 'Test', rollNo: '101' } });
assert(siOnly.includes('No data available'), 'StudentInfo only shows helpful message');

// ==================== RESULTS ====================
console.log('\n' + '═'.repeat(50));
console.log(`📊 RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('═'.repeat(50));

if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Please review the failures above.');
    process.exit(1);
} else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
}
