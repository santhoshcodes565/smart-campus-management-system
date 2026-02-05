/**
 * Result Permissions Middleware
 * 
 * Status-based permission enforcement for academic marks.
 * Implements strict RBAC for Faculty → Admin workflow.
 */

const Result = require('../models/Result');
const { errorResponse } = require('../utils/responseHandler');

/**
 * Permission matrix for result status transitions
 */
const PERMISSIONS = {
    // Who can perform each action
    edit: {
        draft: ['faculty', 'admin'],
        submitted: ['admin'],
        approved: ['admin'],
        published: [],
        locked: []  // Requires override
    },
    submit: {
        allowedRoles: ['faculty'],
        requiredStatus: 'draft'
    },
    approve: {
        allowedRoles: ['admin'],
        requiredStatus: 'submitted'
    },
    reject: {
        allowedRoles: ['admin'],
        requiredStatus: 'submitted'
    },
    publish: {
        allowedRoles: ['admin'],
        requiredStatus: 'approved'
    },
    lock: {
        allowedRoles: ['admin'],
        requiredStatus: 'published'
    },
    override: {
        allowedRoles: ['admin'],
        requiredStatus: 'locked'
    }
};

/**
 * Check if user can edit a result based on status and role
 */
const canEditResult = (resultStatus, userRole) => {
    const allowedRoles = PERMISSIONS.edit[resultStatus] || [];
    return allowedRoles.includes(userRole);
};

/**
 * Check if user can perform an action
 */
const canPerformAction = (action, userRole) => {
    const actionConfig = PERMISSIONS[action];
    if (!actionConfig) return false;
    return actionConfig.allowedRoles.includes(userRole);
};

/**
 * Check if result is in required status for an action
 */
const isValidStatusForAction = (action, resultStatus) => {
    const actionConfig = PERMISSIONS[action];
    if (!actionConfig) return false;
    return actionConfig.requiredStatus === resultStatus;
};

/**
 * Middleware: Require specific result status
 */
const requireResultStatus = (allowedStatuses) => {
    return async (req, res, next) => {
        try {
            const resultId = req.params.resultId;
            const result = await Result.findById(resultId);

            if (!result) {
                return errorResponse(res, 404, 'Result not found');
            }

            const statuses = Array.isArray(allowedStatuses) ? allowedStatuses : [allowedStatuses];

            if (!statuses.includes(result.status)) {
                return errorResponse(res, 403,
                    `This operation requires result status to be: ${statuses.join(' or ')}. Current status: ${result.status}`
                );
            }

            req.result = result;
            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Middleware: Check if user can edit the result
 */
const canEdit = async (req, res, next) => {
    try {
        const resultId = req.params.resultId;
        const userRole = req.user.role;

        const result = await Result.findById(resultId);

        if (!result) {
            return errorResponse(res, 404, 'Result not found');
        }

        if (!canEditResult(result.status, userRole)) {
            if (result.status === 'locked') {
                return errorResponse(res, 403,
                    'This result is LOCKED. Use admin override with reason to modify.'
                );
            }
            return errorResponse(res, 403,
                `Cannot edit result in '${result.status}' status with role '${userRole}'`
            );
        }

        req.result = result;
        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware: Only faculty can submit (draft → submitted)
 */
const canSubmit = (req, res, next) => {
    if (!canPerformAction('submit', req.user.role)) {
        return errorResponse(res, 403, 'Only faculty can submit results for review');
    }
    next();
};

/**
 * Middleware: Only admin can approve
 */
const canApprove = (req, res, next) => {
    if (!canPerformAction('approve', req.user.role)) {
        return errorResponse(res, 403, 'Only admin can approve results');
    }
    next();
};

/**
 * Middleware: Only admin can reject
 */
const canReject = (req, res, next) => {
    if (!canPerformAction('reject', req.user.role)) {
        return errorResponse(res, 403, 'Only admin can reject results');
    }
    next();
};

/**
 * Middleware: Only admin can publish
 */
const canPublish = (req, res, next) => {
    if (!canPerformAction('publish', req.user.role)) {
        return errorResponse(res, 403, 'Only admin can publish results');
    }
    next();
};

/**
 * Middleware: Only admin can lock
 */
const canLock = (req, res, next) => {
    if (!canPerformAction('lock', req.user.role)) {
        return errorResponse(res, 403, 'Only admin can lock semesters');
    }
    next();
};

/**
 * Middleware: Only admin can override locked results
 */
const canOverride = (req, res, next) => {
    if (!canPerformAction('override', req.user.role)) {
        return errorResponse(res, 403, 'Only admin can override locked results');
    }

    // Require reason for override
    if (!req.body.reason || req.body.reason.trim().length < 10) {
        return errorResponse(res, 400,
            'Admin override requires a detailed reason (minimum 10 characters)'
        );
    }

    next();
};

/**
 * Middleware: Block students from any mark modification
 */
const blockStudents = (req, res, next) => {
    if (req.user.role === 'student') {
        return errorResponse(res, 403,
            'Students cannot modify academic records. Read-only access.'
        );
    }
    next();
};

module.exports = {
    PERMISSIONS,
    canEditResult,
    canPerformAction,
    isValidStatusForAction,
    requireResultStatus,
    canEdit,
    canSubmit,
    canApprove,
    canReject,
    canPublish,
    canLock,
    canOverride,
    blockStudents
};
