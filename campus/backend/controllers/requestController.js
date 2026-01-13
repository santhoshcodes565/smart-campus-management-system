const Leave = require('../models/Leave');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// @desc    Get all requests (leave, OD, etc.) with filters
// @route   GET /api/admin/requests
// @access  Admin
const getAllRequests = async (req, res, next) => {
    try {
        const { status, applicantType, requestType, fromDate, toDate } = req.query;
        let query = {};

        if (status) query.status = status;
        if (applicantType) query.applicantType = applicantType;
        if (requestType) query.requestType = requestType;
        if (fromDate && toDate) {
            query.createdAt = {
                $gte: new Date(fromDate),
                $lte: new Date(toDate)
            };
        }

        const requests = await Leave.find(query)
            .populate('applicantId', 'name email department role')
            .populate('approvedBy', 'name')
            .sort({ createdAt: -1 });

        // Add summary counts
        const summary = {
            total: requests.length,
            pending: requests.filter(r => r.status === 'pending').length,
            approved: requests.filter(r => r.status === 'approved').length,
            rejected: requests.filter(r => r.status === 'rejected').length
        };

        return successResponse(res, 200, 'Requests retrieved', { requests, summary });
    } catch (error) {
        next(error);
    }
};

// @desc    Approve a request
// @route   PUT /api/admin/requests/:id/approve
// @access  Admin
const approveRequest = async (req, res, next) => {
    try {
        const { remarks } = req.body;

        const request = await Leave.findById(req.params.id);
        if (!request) {
            return errorResponse(res, 404, 'Request not found');
        }

        request.status = 'approved';
        request.approvedBy = req.user._id;
        request.approvalDate = new Date();
        if (remarks) request.remarks = remarks;

        await request.save();

        return successResponse(res, 200, 'Request approved successfully', request);
    } catch (error) {
        next(error);
    }
};

// @desc    Reject a request
// @route   PUT /api/admin/requests/:id/reject
// @access  Admin
const rejectRequest = async (req, res, next) => {
    try {
        const { remarks } = req.body;

        const request = await Leave.findById(req.params.id);
        if (!request) {
            return errorResponse(res, 404, 'Request not found');
        }

        request.status = 'rejected';
        request.approvedBy = req.user._id;
        request.approvalDate = new Date();
        if (remarks) request.remarks = remarks;

        await request.save();

        return successResponse(res, 200, 'Request rejected', request);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllRequests,
    approveRequest,
    rejectRequest
};
