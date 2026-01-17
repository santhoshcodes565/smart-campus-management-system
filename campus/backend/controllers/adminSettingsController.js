/**
 * Admin Settings Controller
 * Handles all admin profile, security, system, and policy operations
 */

const User = require('../models/User');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const SystemSettings = require('../models/SystemSettings');
const AuditLog = require('../models/AuditLog');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const bcrypt = require('bcryptjs');

// ==================== HELPER FUNCTIONS ====================

/**
 * Get client IP address
 */
const getClientIP = (req) => {
    return req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip || '';
};

/**
 * Create audit log entry
 */
const createAuditLog = async (req, action, description, targetType = 'system', targetId = null, targetName = '', changes = null) => {
    try {
        await AuditLog.log({
            action,
            performedBy: req.user._id,
            performedByRole: req.user.role,
            targetType,
            targetId,
            targetName,
            description,
            changes,
            ipAddress: getClientIP(req),
            userAgent: req.headers['user-agent'] || ''
        });
    } catch (error) {
        console.error('Audit log error:', error);
    }
};

// ==================== MODULE 1: ADMIN PROFILE ====================

/**
 * @desc    Get admin profile
 * @route   GET /api/admin/profile
 * @access  Admin
 */
exports.getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select('-password');

        if (!user) {
            return errorResponse(res, 404, 'User not found');
        }

        return successResponse(res, 200, 'Profile fetched', {
            _id: user._id,
            username: user.username,
            name: user.name,
            email: user.email || '',
            phone: user.phone || '',
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin || null,
            profilePhoto: user.profilePhoto || null
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update admin profile
 * @route   PUT /api/admin/profile
 * @access  Admin
 */
exports.updateProfile = async (req, res, next) => {
    try {
        const { name, email, phone } = req.body;
        const updates = {};

        if (name) updates.name = name;
        if (email !== undefined) updates.email = email;
        if (phone !== undefined) updates.phone = phone;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true }
        ).select('-password');

        await createAuditLog(req, 'USER_UPDATED', 'Admin updated their profile', 'user', user._id, user.name, updates);

        return successResponse(res, 200, 'Profile updated successfully', {
            _id: user._id,
            username: user.username,
            name: user.name,
            email: user.email || '',
            phone: user.phone || '',
            role: user.role
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Change admin password
 * @route   PUT /api/admin/profile/password
 * @access  Admin
 */
exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return errorResponse(res, 400, 'Current password and new password are required');
        }

        if (newPassword.length < 6) {
            return errorResponse(res, 400, 'New password must be at least 6 characters');
        }

        const user = await User.findById(req.user._id);

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return errorResponse(res, 401, 'Current password is incorrect');
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        await createAuditLog(req, 'PASSWORD_CHANGED', 'Admin changed their password', 'user', user._id, user.name);

        return successResponse(res, 200, 'Password changed successfully');
    } catch (error) {
        next(error);
    }
};

// ==================== MODULE 2: SECURITY SETTINGS ====================

/**
 * @desc    Force password reset for a user
 * @route   POST /api/admin/settings/security/force-reset
 * @access  Admin
 */
exports.forcePasswordReset = async (req, res, next) => {
    try {
        const { userId, newPassword } = req.body;

        if (!userId || !newPassword) {
            return errorResponse(res, 400, 'User ID and new password are required');
        }

        const user = await User.findById(userId);
        if (!user) {
            return errorResponse(res, 404, 'User not found');
        }

        if (user.role === 'admin') {
            return errorResponse(res, 403, 'Cannot reset another admin password');
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.forcePasswordChange = true;
        await user.save();

        await createAuditLog(req, 'PASSWORD_RESET', `Admin reset password for ${user.role}: ${user.name}`, 'user', user._id, user.name);

        return successResponse(res, 200, 'Password reset successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Lock or unlock a user account
 * @route   PUT /api/admin/settings/security/lock-user/:id
 * @access  Admin
 */
exports.lockUnlockUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { lock } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return errorResponse(res, 404, 'User not found');
        }

        if (user.role === 'admin') {
            return errorResponse(res, 403, 'Cannot lock another admin account');
        }

        user.isActive = !lock;
        user.lockedAt = lock ? new Date() : null;
        await user.save();

        const action = lock ? 'USER_LOCKED' : 'USER_UNLOCKED';
        await createAuditLog(req, action, `Admin ${lock ? 'locked' : 'unlocked'} account for ${user.role}: ${user.name}`, 'user', user._id, user.name);

        return successResponse(res, 200, `User ${lock ? 'locked' : 'unlocked'} successfully`);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get login history
 * @route   GET /api/admin/settings/security/login-history
 * @access  Admin
 */
exports.getLoginHistory = async (req, res, next) => {
    try {
        const { limit = 50, role } = req.query;

        const match = { action: { $in: ['LOGIN_SUCCESS', 'LOGIN_FAILED'] } };
        if (role) match.performedByRole = role;

        const logs = await AuditLog.find(match)
            .populate('performedBy', 'name username')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .lean();

        return successResponse(res, 200, 'Login history fetched', logs.map(log => ({
            _id: log._id,
            user: log.performedBy?.name || 'Unknown',
            username: log.performedBy?.username || '',
            role: log.performedByRole,
            action: log.action,
            ipAddress: log.ipAddress,
            time: log.createdAt
        })));
    } catch (error) {
        next(error);
    }
};

// ==================== MODULE 3: SYSTEM CONFIGURATION ====================

/**
 * @desc    Get all system settings
 * @route   GET /api/admin/settings/system
 * @access  Admin
 */
exports.getSystemSettings = async (req, res, next) => {
    try {
        const settings = await SystemSettings.find({}).lean();

        // Convert to object for easier access
        const settingsObj = {};
        settings.forEach(s => {
            settingsObj[s.key] = s.value;
        });

        // Return with defaults
        return successResponse(res, 200, 'System settings fetched', {
            institution: {
                name: settingsObj['institution.name'] || 'Smart Campus',
                logo: settingsObj['institution.logo'] || null,
                timezone: settingsObj['institution.timezone'] || 'Asia/Kolkata',
                dateFormat: settingsObj['institution.dateFormat'] || 'DD/MM/YYYY'
            },
            academic: {
                currentYear: settingsObj['academic.currentYear'] || '2025-2026',
                currentSemester: settingsObj['academic.currentSemester'] || 1
            },
            system: {
                maintenanceMode: settingsObj['system.maintenanceMode'] || false
            },
            modules: {
                onlineExam: settingsObj['modules.onlineExam'] !== false,
                attendance: settingsObj['modules.attendance'] !== false,
                feedback: settingsObj['modules.feedback'] !== false,
                notices: settingsObj['modules.notices'] !== false,
                results: settingsObj['modules.results'] !== false
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update system settings
 * @route   PUT /api/admin/settings/system
 * @access  Admin
 */
exports.updateSystemSettings = async (req, res, next) => {
    try {
        const { institution, academic, system, modules } = req.body;
        const updates = [];

        // Institution settings
        if (institution) {
            if (institution.name !== undefined) updates.push({ key: 'institution.name', value: institution.name });
            if (institution.logo !== undefined) updates.push({ key: 'institution.logo', value: institution.logo });
            if (institution.timezone !== undefined) updates.push({ key: 'institution.timezone', value: institution.timezone });
            if (institution.dateFormat !== undefined) updates.push({ key: 'institution.dateFormat', value: institution.dateFormat });
        }

        // Academic settings
        if (academic) {
            if (academic.currentYear !== undefined) updates.push({ key: 'academic.currentYear', value: academic.currentYear });
            if (academic.currentSemester !== undefined) updates.push({ key: 'academic.currentSemester', value: academic.currentSemester });
        }

        // System settings
        if (system) {
            if (system.maintenanceMode !== undefined) updates.push({ key: 'system.maintenanceMode', value: system.maintenanceMode });
        }

        // Module toggles
        if (modules) {
            if (modules.onlineExam !== undefined) updates.push({ key: 'modules.onlineExam', value: modules.onlineExam });
            if (modules.attendance !== undefined) updates.push({ key: 'modules.attendance', value: modules.attendance });
            if (modules.feedback !== undefined) updates.push({ key: 'modules.feedback', value: modules.feedback });
            if (modules.notices !== undefined) updates.push({ key: 'modules.notices', value: modules.notices });
            if (modules.results !== undefined) updates.push({ key: 'modules.results', value: modules.results });
        }

        // Apply updates
        for (const update of updates) {
            await SystemSettings.setSetting(update.key, update.value, '', req.user._id);
        }

        await createAuditLog(req, 'SYSTEM_CONFIG_UPDATED', 'Admin updated system configuration', 'settings', null, '', updates);

        return successResponse(res, 200, 'System settings updated successfully');
    } catch (error) {
        next(error);
    }
};

// ==================== MODULE 4: ACADEMIC RULES ====================

/**
 * @desc    Get academic rules
 * @route   GET /api/admin/settings/academic
 * @access  Admin
 */
exports.getAcademicRules = async (req, res, next) => {
    try {
        const settings = await SystemSettings.find({ key: /^academic\./ }).lean();

        const rules = {};
        settings.forEach(s => {
            const key = s.key.replace('academic.', '');
            rules[key] = s.value;
        });

        return successResponse(res, 200, 'Academic rules fetched', {
            defaultPassMark: rules.defaultPassMark || 40,
            graceMarks: rules.graceMarks || 0,
            reExamEligibility: rules.reExamEligibility || 25,
            attendanceMinimum: rules.attendanceMinimum || 75,
            gradeScale: rules.gradeScale || 'percentage'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update academic rules
 * @route   PUT /api/admin/settings/academic
 * @access  Admin
 */
exports.updateAcademicRules = async (req, res, next) => {
    try {
        const { defaultPassMark, graceMarks, reExamEligibility, attendanceMinimum, gradeScale } = req.body;
        const updates = [];

        if (defaultPassMark !== undefined) updates.push({ key: 'academic.defaultPassMark', value: defaultPassMark });
        if (graceMarks !== undefined) updates.push({ key: 'academic.graceMarks', value: graceMarks });
        if (reExamEligibility !== undefined) updates.push({ key: 'academic.reExamEligibility', value: reExamEligibility });
        if (attendanceMinimum !== undefined) updates.push({ key: 'academic.attendanceMinimum', value: attendanceMinimum });
        if (gradeScale !== undefined) updates.push({ key: 'academic.gradeScale', value: gradeScale });

        for (const update of updates) {
            await SystemSettings.setSetting(update.key, update.value, '', req.user._id);
        }

        await createAuditLog(req, 'ACADEMIC_RULES_UPDATED', 'Admin updated academic rules', 'settings', null, '', updates);

        return successResponse(res, 200, 'Academic rules updated successfully');
    } catch (error) {
        next(error);
    }
};

// ==================== MODULE 5: USER POLICIES ====================

/**
 * @desc    Get user policies
 * @route   GET /api/admin/settings/policies
 * @access  Admin
 */
exports.getUserPolicies = async (req, res, next) => {
    try {
        const settings = await SystemSettings.find({ key: /^policy\./ }).lean();

        const policies = {};
        settings.forEach(s => {
            const key = s.key.replace('policy.', '');
            policies[key] = s.value;
        });

        return successResponse(res, 200, 'User policies fetched', {
            usernameMinLength: policies.usernameMinLength || 4,
            passwordMinLength: policies.passwordMinLength || 8,
            requireUppercase: policies.requireUppercase !== false,
            requireNumber: policies.requireNumber !== false,
            requireSpecialChar: policies.requireSpecialChar || false,
            maxLoginAttempts: policies.maxLoginAttempts || 5,
            lockDuration: policies.lockDuration || 30,
            forcePasswordChange: policies.forcePasswordChange !== false
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update user policies
 * @route   PUT /api/admin/settings/policies
 * @access  Admin
 */
exports.updateUserPolicies = async (req, res, next) => {
    try {
        const {
            usernameMinLength, passwordMinLength, requireUppercase,
            requireNumber, requireSpecialChar, maxLoginAttempts,
            lockDuration, forcePasswordChange
        } = req.body;

        const updates = [];

        if (usernameMinLength !== undefined) updates.push({ key: 'policy.usernameMinLength', value: usernameMinLength });
        if (passwordMinLength !== undefined) updates.push({ key: 'policy.passwordMinLength', value: passwordMinLength });
        if (requireUppercase !== undefined) updates.push({ key: 'policy.requireUppercase', value: requireUppercase });
        if (requireNumber !== undefined) updates.push({ key: 'policy.requireNumber', value: requireNumber });
        if (requireSpecialChar !== undefined) updates.push({ key: 'policy.requireSpecialChar', value: requireSpecialChar });
        if (maxLoginAttempts !== undefined) updates.push({ key: 'policy.maxLoginAttempts', value: maxLoginAttempts });
        if (lockDuration !== undefined) updates.push({ key: 'policy.lockDuration', value: lockDuration });
        if (forcePasswordChange !== undefined) updates.push({ key: 'policy.forcePasswordChange', value: forcePasswordChange });

        for (const update of updates) {
            await SystemSettings.setSetting(update.key, update.value, '', req.user._id);
        }

        await createAuditLog(req, 'POLICY_UPDATED', 'Admin updated user policies', 'settings', null, '', updates);

        return successResponse(res, 200, 'User policies updated successfully');
    } catch (error) {
        next(error);
    }
};

// ==================== MODULE 6: ACCESS CONTROL ====================

/**
 * @desc    Get access control matrix (read-only)
 * @route   GET /api/admin/settings/access
 * @access  Admin
 */
exports.getAccessControl = async (req, res, next) => {
    try {
        // Static role-permission matrix
        const accessMatrix = {
            admin: {
                label: 'Administrator',
                permissions: [
                    'Manage Students',
                    'Manage Faculty',
                    'Manage Exams',
                    'View All Results',
                    'Manage Settings',
                    'View Audit Logs',
                    'Export Data',
                    'Manage Notices',
                    'Manage Feedback'
                ]
            },
            faculty: {
                label: 'Faculty',
                permissions: [
                    'Create Exams',
                    'Mark Attendance',
                    'Upload Results',
                    'View Own Students',
                    'Submit Feedback',
                    'View Timetable'
                ]
            },
            student: {
                label: 'Student',
                permissions: [
                    'Attempt Exams',
                    'View Own Results',
                    'View Attendance',
                    'Submit Feedback',
                    'View Notices',
                    'View Timetable'
                ]
            }
        };

        return successResponse(res, 200, 'Access control fetched', accessMatrix);
    } catch (error) {
        next(error);
    }
};

// ==================== MODULE 7: AUDIT LOGS ====================

/**
 * @desc    Get audit logs
 * @route   GET /api/admin/settings/audit
 * @access  Admin
 */
exports.getAuditLogs = async (req, res, next) => {
    try {
        const { page = 1, limit = 50, role, action, startDate, endDate } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const match = {};
        if (role) match.performedByRole = role;
        if (action) match.action = action;
        if (startDate || endDate) {
            match.createdAt = {};
            if (startDate) match.createdAt.$gte = new Date(startDate);
            if (endDate) match.createdAt.$lte = new Date(endDate);
        }

        const [logs, total] = await Promise.all([
            AuditLog.find(match)
                .populate('performedBy', 'name username role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            AuditLog.countDocuments(match)
        ]);

        return successResponse(res, 200, 'Audit logs fetched', {
            logs: logs.map(log => ({
                _id: log._id,
                action: log.action,
                description: log.description,
                performedBy: log.performedBy?.name || 'System',
                performedByRole: log.performedByRole,
                targetType: log.targetType,
                targetName: log.targetName,
                ipAddress: log.ipAddress,
                createdAt: log.createdAt
            })),
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

// ==================== MODULE 8: DATA EXPORT ====================

/**
 * @desc    Export data
 * @route   GET /api/admin/settings/export/:type
 * @access  Admin
 */
exports.exportData = async (req, res, next) => {
    try {
        const { type } = req.params;
        let data = [];
        let filename = '';

        switch (type) {
            case 'students':
                const students = await Student.find({})
                    .populate('userId', 'name email username phone')
                    .populate('courseId', 'name code')
                    .populate('departmentId', 'name')
                    .lean();

                data = students.map(s => ({
                    Name: s.userId?.name || 'N/A',
                    Username: s.userId?.username || '',
                    Email: s.userId?.email || '',
                    Phone: s.userId?.phone || '',
                    RollNo: s.rollNo || '',
                    RegistrationNo: s.registrationNumber || '',
                    Department: s.departmentId?.name || '',
                    Course: s.courseId?.name || '',
                    Semester: s.semester || '',
                    AdmissionYear: s.admissionYear || ''
                }));
                filename = `students_export_${Date.now()}.json`;
                break;

            case 'faculty':
                const faculty = await Faculty.find({})
                    .populate('userId', 'name email username phone')
                    .populate('departmentId', 'name')
                    .lean();

                data = faculty.map(f => ({
                    Name: f.userId?.name || 'N/A',
                    Username: f.userId?.username || '',
                    Email: f.userId?.email || '',
                    Phone: f.userId?.phone || '',
                    EmployeeId: f.employeeId || '',
                    Department: f.departmentId?.name || '',
                    Designation: f.designation || '',
                    JoiningYear: f.joiningYear || ''
                }));
                filename = `faculty_export_${Date.now()}.json`;
                break;

            case 'audit':
                const audit = await AuditLog.find({})
                    .populate('performedBy', 'name username')
                    .sort({ createdAt: -1 })
                    .limit(1000)
                    .lean();

                data = audit.map(a => ({
                    Action: a.action,
                    Description: a.description,
                    PerformedBy: a.performedBy?.name || 'System',
                    Role: a.performedByRole,
                    TargetType: a.targetType,
                    IP: a.ipAddress,
                    DateTime: a.createdAt
                }));
                filename = `audit_logs_${Date.now()}.json`;
                break;

            default:
                return errorResponse(res, 400, 'Invalid export type. Valid types: students, faculty, audit');
        }

        await createAuditLog(req, 'DATA_EXPORTED', `Admin exported ${type} data`, 'system', null, type);

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.json({ success: true, count: data.length, data });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get users for security management
 * @route   GET /api/admin/settings/security/users
 * @access  Admin
 */
exports.getUsers = async (req, res, next) => {
    try {
        const { role, search } = req.query;

        const match = { role: { $ne: 'admin' } };
        if (role && role !== 'all') match.role = role;
        if (search) {
            match.$or = [
                { name: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(match)
            .select('name username role isActive lockedAt createdAt lastLogin')
            .sort({ name: 1 })
            .limit(100)
            .lean();

        return successResponse(res, 200, 'Users fetched', users);
    } catch (error) {
        next(error);
    }
};
