/**
 * Authorization Service
 * Role-based access control for Smart Campus Chatbot
 * 
 * SECURITY FLOW:
 * 1. Check if intent is allowed for role
 * 2. Check if user can access requested resource
 * 3. Return authorization status before any data retrieval
 * 
 * CRITICAL: AI must NEVER decide permissions - this service does.
 */

// Role-based permission matrix
const PERMISSIONS = {
    student: {
        // Students can ONLY access their own data
        attendance: 'self',      // Own attendance only
        marks: 'self',           // Own marks only
        timetable: 'self',       // Own class timetable
        fees: 'self',            // Own fee status
        results: 'self',         // Own results
        exams: 'self',           // Own exam schedule
        assignments: 'self',     // Own assignments
        announcements: 'all',    // All public announcements
        help: 'all',             // General help
        department_info: 'all',  // Public department info
        faculty_contact: 'all',  // Faculty contact (public)
        // NOT ALLOWED
        analytics: 'none',
        all_students: 'none',
        admin_data: 'none'
    },
    faculty: {
        // Faculty can access their assigned classes
        attendance: 'assigned',       // Students in their classes
        marks: 'assigned',            // Upload/view marks for their classes
        timetable: 'self',            // Own teaching schedule
        fees: 'none',                 // No access to fees
        results: 'assigned',          // View results for their classes
        exams: 'assigned',            // Manage exams for their subjects
        assignments: 'assigned',      // Manage assignments
        announcements: 'all',         // All announcements
        help: 'all',
        department_info: 'own',       // Own department
        faculty_contact: 'own',       // Own department faculty
        class_analytics: 'assigned',  // Analytics for their classes
        low_attendance: 'assigned',   // Students with low attendance
        // NOT ALLOWED
        all_students: 'none',
        admin_data: 'none',
        fee_management: 'none'
    },
    admin: {
        // Admin has FULL access
        attendance: 'all',
        marks: 'all',
        timetable: 'all',
        fees: 'all',
        results: 'all',
        exams: 'all',
        assignments: 'all',
        announcements: 'all',
        help: 'all',
        department_info: 'all',
        faculty_contact: 'all',
        analytics: 'all',
        all_students: 'all',
        admin_data: 'all',
        class_analytics: 'all',
        low_attendance: 'all',
        fee_management: 'all'
    }
};

// Intent to permission mapping
const INTENT_PERMISSION_MAP = {
    'my_attendance': 'attendance',
    'student_attendance': 'attendance',
    'class_attendance': 'attendance',
    'my_marks': 'marks',
    'student_marks': 'marks',
    'upload_marks': 'marks',
    'my_timetable': 'timetable',
    'today_timetable': 'timetable',
    'tomorrow_timetable': 'timetable',
    'class_schedule': 'timetable',
    'my_fees': 'fees',
    'fee_status': 'fees',
    'pending_fees': 'fees',
    'my_results': 'results',
    'exam_results': 'results',
    'exam_dates': 'exams',
    'upcoming_exams': 'exams',
    'my_assignments': 'assignments',
    'today_assignment': 'assignments',
    'upcoming_assignments': 'assignments',
    'announcements': 'announcements',
    'notices': 'announcements',
    'help': 'help',
    'department_info': 'department_info',
    'faculty_contact': 'faculty_contact',
    'department_analytics': 'analytics',
    'performance_analytics': 'analytics',
    'student_count': 'analytics',
    'faculty_count': 'analytics',
    'department_list': 'department_info',
    'low_attendance_students': 'low_attendance',
    'students_below_attendance': 'low_attendance'
};

/**
 * Check if user is authorized for a specific intent
 * @param {string} role - User's role (student/faculty/admin)
 * @param {string} intent - Detected intent
 * @param {Object} context - Additional context (targetUserId, etc.)
 * @returns {Object} { authorized: boolean, reason: string, accessLevel: string }
 */
const authorize = (role, intent, context = {}) => {
    try {
        // Validate role
        if (!role || !PERMISSIONS[role]) {
            return {
                authorized: false,
                reason: 'Invalid or missing user role.',
                accessLevel: 'none'
            };
        }

        // Map intent to permission
        const permissionKey = INTENT_PERMISSION_MAP[intent] || intent;
        const rolePermissions = PERMISSIONS[role];
        const accessLevel = rolePermissions[permissionKey];

        // Check if permission exists
        if (accessLevel === undefined) {
            // Unknown intent - check if it's a general/allowed action
            if (['general', 'greeting', 'help', 'unknown'].includes(intent)) {
                return {
                    authorized: true,
                    reason: 'General query allowed.',
                    accessLevel: 'all'
                };
            }
            return {
                authorized: false,
                reason: 'This action is not recognized.',
                accessLevel: 'none'
            };
        }

        // Check access level
        switch (accessLevel) {
            case 'all':
                return {
                    authorized: true,
                    reason: 'Full access granted.',
                    accessLevel: 'all'
                };

            case 'self':
                // User can only access their own data
                if (context.targetUserId && context.targetUserId !== context.requestingUserId) {
                    return {
                        authorized: false,
                        reason: 'You can only access your own information.',
                        accessLevel: 'self'
                    };
                }
                return {
                    authorized: true,
                    reason: 'Access to own data granted.',
                    accessLevel: 'self'
                };

            case 'assigned':
                // Faculty can access assigned classes
                return {
                    authorized: true,
                    reason: 'Access to assigned resources granted.',
                    accessLevel: 'assigned'
                };

            case 'own':
                // Access to own department only
                return {
                    authorized: true,
                    reason: 'Access to own department granted.',
                    accessLevel: 'own'
                };

            case 'none':
                return {
                    authorized: false,
                    reason: 'You do not have permission to access this information.',
                    accessLevel: 'none'
                };

            default:
                return {
                    authorized: false,
                    reason: 'Access denied.',
                    accessLevel: 'none'
                };
        }

    } catch (error) {
        console.error('[Authorization] Error:', error.message);
        return {
            authorized: false,
            reason: 'Authorization check failed.',
            accessLevel: 'none'
        };
    }
};

/**
 * Check if faculty can access a specific student
 * @param {string} facultyId - Faculty's ID
 * @param {string} studentId - Student's ID to check access for
 * @param {Object} Faculty - Faculty model
 * @param {Object} Student - Student model
 * @returns {Promise<boolean>}
 */
const canFacultyAccessStudent = async (facultyId, studentId, Faculty, Student) => {
    try {
        // Get faculty's assigned classes
        const faculty = await Faculty.findById(facultyId).lean();
        if (!faculty) return false;

        // Get student's class info
        const student = await Student.findById(studentId).lean();
        if (!student) return false;

        // Check if student is in faculty's assigned classes
        const studentClass = `${student.departmentId}-${student.year}-${student.section}`;
        const isAssigned = faculty.classIds?.includes(studentClass) ||
            faculty.classIds?.includes(`${student.course}-${student.year}-${student.section}`);

        return isAssigned;
    } catch (error) {
        console.error('[Authorization] Faculty access check error:', error.message);
        return false;
    }
};

/**
 * Get allowed intents for a role
 * @param {string} role - User's role
 * @returns {string[]} List of allowed intents
 */
const getAllowedIntents = (role) => {
    if (!PERMISSIONS[role]) return [];

    return Object.entries(PERMISSIONS[role])
        .filter(([_, level]) => level !== 'none')
        .map(([intent, _]) => intent);
};

/**
 * Get authorization denial message
 */
const getDenialMessage = () => {
    return 'Sorry, you do not have permission to access this information.';
};

module.exports = {
    authorize,
    canFacultyAccessStudent,
    getAllowedIntents,
    getDenialMessage,
    PERMISSIONS
};
