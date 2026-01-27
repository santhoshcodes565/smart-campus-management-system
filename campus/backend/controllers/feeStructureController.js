const FeeStructure = require('../models/FeeStructure');
const FeeAuditLog = require('../models/FeeAuditLog');
const asyncHandler = require('express-async-handler');

/**
 * Fee Structure Controller
 * Admin-only operations for fee structure governance
 */

// @desc    Create a new fee structure
// @route   POST /api/fees/structures
// @access  Admin
const createFeeStructure = asyncHandler(async (req, res) => {
    const {
        code,
        name,
        description,
        academicYear,
        semester,
        departmentId,
        courseId,
        feeHeads,
        approvedTotal,
        effectiveFrom,
        effectiveTo
    } = req.body;

    // Validate required fields
    if (!code || !name || !academicYear || !feeHeads || feeHeads.length === 0) {
        res.status(400);
        throw new Error('Code, name, academic year, and fee heads are required');
    }

    // Check for duplicate code
    const existingStructure = await FeeStructure.findOne({ code: code.toUpperCase() });
    if (existingStructure) {
        res.status(400);
        throw new Error('A fee structure with this code already exists');
    }

    // Calculate approved total if not provided
    let calculatedTotal = approvedTotal;
    if (!calculatedTotal) {
        calculatedTotal = feeHeads
            .filter(head => !head.isOptional)
            .reduce((sum, head) => sum + (head.amount || 0), 0);
    }

    const structure = await FeeStructure.create({
        code: code.toUpperCase(),
        name,
        description: description || '',
        academicYear,
        semester: semester || null,
        departmentId: departmentId || null,
        courseId: courseId || null,
        feeHeads,
        approvedTotal: calculatedTotal,
        effectiveFrom: effectiveFrom || null,
        effectiveTo: effectiveTo || null,
        createdBy: req.user._id
    });

    // Audit log
    await FeeAuditLog.log({
        action: 'STRUCTURE_CREATED',
        entityType: 'FeeStructure',
        entityId: structure._id,
        entityCode: structure.code,
        performedBy: req.user._id,
        performedByName: req.user.name,
        performedByRole: req.user.role,
        description: `Fee structure "${structure.name}" (${structure.code}) created`,
        structureCode: structure.code,
        academicYear: structure.academicYear,
        semester: structure.semester,
        amount: structure.approvedTotal,
        after: {
            code: structure.code,
            name: structure.name,
            approvedTotal: structure.approvedTotal,
            feeHeadsCount: structure.feeHeads.length
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.status(201).json({
        success: true,
        message: 'Fee structure created successfully',
        data: structure
    });
});

// @desc    Get all fee structures
// @route   GET /api/fees/structures
// @access  Admin
const getAllFeeStructures = asyncHandler(async (req, res) => {
    const {
        academicYear,
        status,
        departmentId,
        courseId,
        isLocked,
        page = 1,
        limit = 20
    } = req.query;

    const query = {};

    if (academicYear) query.academicYear = academicYear;
    if (status) query.status = status;
    if (departmentId) query.departmentId = departmentId;
    if (courseId) query.courseId = courseId;
    if (isLocked !== undefined) query.isLocked = isLocked === 'true';

    const total = await FeeStructure.countDocuments(query);

    const structures = await FeeStructure.find(query)
        .populate('departmentId', 'name code')
        .populate('courseId', 'name code')
        .populate('createdBy', 'name')
        .populate('approvedBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    res.json({
        success: true,
        data: structures,
        pagination: {
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        }
    });
});

// @desc    Get single fee structure
// @route   GET /api/fees/structures/:id
// @access  Admin
const getFeeStructure = asyncHandler(async (req, res) => {
    const structure = await FeeStructure.findById(req.params.id)
        .populate('departmentId', 'name code')
        .populate('courseId', 'name code')
        .populate('createdBy', 'name')
        .populate('approvedBy', 'name')
        .populate('updatedBy', 'name');

    if (!structure) {
        res.status(404);
        throw new Error('Fee structure not found');
    }

    res.json({
        success: true,
        data: structure
    });
});

// @desc    Update fee structure
// @route   PUT /api/fees/structures/:id
// @access  Admin
const updateFeeStructure = asyncHandler(async (req, res) => {
    const structure = await FeeStructure.findById(req.params.id);

    if (!structure) {
        res.status(404);
        throw new Error('Fee structure not found');
    }

    if (structure.isLocked) {
        res.status(400);
        throw new Error('Cannot modify a locked fee structure. Create a new version instead.');
    }

    if (structure.status !== 'draft') {
        res.status(400);
        throw new Error('Only draft structures can be modified');
    }

    const beforeState = {
        name: structure.name,
        approvedTotal: structure.approvedTotal,
        feeHeadsCount: structure.feeHeads.length
    };

    // Update allowed fields
    const allowedUpdates = [
        'name', 'description', 'semester', 'departmentId', 'courseId',
        'feeHeads', 'approvedTotal', 'effectiveFrom', 'effectiveTo'
    ];

    allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
            structure[field] = req.body[field];
        }
    });

    structure.updatedBy = req.user._id;
    await structure.save();

    // Audit log
    await FeeAuditLog.log({
        action: 'STRUCTURE_UPDATED',
        entityType: 'FeeStructure',
        entityId: structure._id,
        entityCode: structure.code,
        performedBy: req.user._id,
        performedByName: req.user.name,
        performedByRole: req.user.role,
        description: `Fee structure "${structure.name}" updated`,
        structureCode: structure.code,
        academicYear: structure.academicYear,
        before: beforeState,
        after: {
            name: structure.name,
            approvedTotal: structure.approvedTotal,
            feeHeadsCount: structure.feeHeads.length
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.json({
        success: true,
        message: 'Fee structure updated successfully',
        data: structure
    });
});

// @desc    Approve fee structure
// @route   PUT /api/fees/structures/:id/approve
// @access  Admin
const approveFeeStructure = asyncHandler(async (req, res) => {
    const { remarks } = req.body;

    const structure = await FeeStructure.findById(req.params.id);

    if (!structure) {
        res.status(404);
        throw new Error('Fee structure not found');
    }

    if (structure.status !== 'draft') {
        res.status(400);
        throw new Error('Only draft structures can be approved');
    }

    await structure.approve(req.user._id, remarks);

    // Audit log
    await FeeAuditLog.log({
        action: 'STRUCTURE_APPROVED',
        entityType: 'FeeStructure',
        entityId: structure._id,
        entityCode: structure.code,
        performedBy: req.user._id,
        performedByName: req.user.name,
        performedByRole: req.user.role,
        description: `Fee structure "${structure.name}" approved`,
        reason: remarks,
        structureCode: structure.code,
        academicYear: structure.academicYear,
        amount: structure.approvedTotal,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.json({
        success: true,
        message: 'Fee structure approved successfully',
        data: structure
    });
});

// @desc    Activate fee structure
// @route   PUT /api/fees/structures/:id/activate
// @access  Admin
const activateFeeStructure = asyncHandler(async (req, res) => {
    const structure = await FeeStructure.findById(req.params.id);

    if (!structure) {
        res.status(404);
        throw new Error('Fee structure not found');
    }

    if (structure.status !== 'approved') {
        res.status(400);
        throw new Error('Only approved structures can be activated');
    }

    await structure.activate(req.user._id);

    // Audit log
    await FeeAuditLog.log({
        action: 'STRUCTURE_ACTIVATED',
        entityType: 'FeeStructure',
        entityId: structure._id,
        entityCode: structure.code,
        performedBy: req.user._id,
        performedByName: req.user.name,
        performedByRole: req.user.role,
        description: `Fee structure "${structure.name}" activated`,
        structureCode: structure.code,
        academicYear: structure.academicYear,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.json({
        success: true,
        message: 'Fee structure activated successfully',
        data: structure
    });
});

// @desc    Create new version of fee structure
// @route   POST /api/fees/structures/:id/version
// @access  Admin
const createNewVersion = asyncHandler(async (req, res) => {
    const newStructure = await FeeStructure.createNewVersion(
        req.params.id,
        req.user._id
    );

    // Audit log
    await FeeAuditLog.log({
        action: 'STRUCTURE_VERSION_CREATED',
        entityType: 'FeeStructure',
        entityId: newStructure._id,
        entityCode: newStructure.code,
        performedBy: req.user._id,
        performedByName: req.user.name,
        performedByRole: req.user.role,
        description: `New version ${newStructure.version} created from structure ${req.params.id}`,
        structureCode: newStructure.code,
        academicYear: newStructure.academicYear,
        before: { parentStructureId: req.params.id },
        after: { version: newStructure.version, code: newStructure.code },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.status(201).json({
        success: true,
        message: 'New version created successfully',
        data: newStructure
    });
});

// @desc    Archive fee structure
// @route   PUT /api/fees/structures/:id/archive
// @access  Admin
const archiveFeeStructure = asyncHandler(async (req, res) => {
    const structure = await FeeStructure.findById(req.params.id);

    if (!structure) {
        res.status(404);
        throw new Error('Fee structure not found');
    }

    structure.status = 'archived';
    structure.updatedBy = req.user._id;
    await structure.save();

    // Audit log
    await FeeAuditLog.log({
        action: 'STRUCTURE_ARCHIVED',
        entityType: 'FeeStructure',
        entityId: structure._id,
        entityCode: structure.code,
        performedBy: req.user._id,
        performedByName: req.user.name,
        performedByRole: req.user.role,
        description: `Fee structure "${structure.name}" archived`,
        structureCode: structure.code,
        academicYear: structure.academicYear,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.json({
        success: true,
        message: 'Fee structure archived successfully',
        data: structure
    });
});

// @desc    Get fee heads master list
// @route   GET /api/fees/structures/fee-heads
// @access  Admin
const getFeeHeadsMaster = asyncHandler(async (req, res) => {
    // Standard fee heads as per institutional requirements
    const standardFeeHeads = [
        { code: 'TUITION', name: 'Tuition Fee', description: 'Academic tuition charges' },
        { code: 'EXAMINATION', name: 'Examination Fee', description: 'Exam and evaluation charges' },
        { code: 'LIBRARY', name: 'Library Fee', description: 'Library access and resources' },
        { code: 'LABORATORY', name: 'Laboratory Fee', description: 'Lab equipment and consumables' },
        { code: 'HOSTEL', name: 'Hostel Fee', description: 'Accommodation charges', isOptional: true },
        { code: 'TRANSPORT', name: 'Transport Fee', description: 'Bus or shuttle service', isOptional: true },
        { code: 'SPORTS', name: 'Sports Fee', description: 'Sports facilities' },
        { code: 'CULTURAL', name: 'Cultural Fee', description: 'Cultural activities' },
        { code: 'DEVELOPMENT', name: 'Development Fee', description: 'Infrastructure development' },
        { code: 'PLACEMENT', name: 'Placement Fee', description: 'Placement cell activities' },
        { code: 'INSURANCE', name: 'Insurance Fee', description: 'Student insurance coverage' },
        { code: 'OTHER', name: 'Other Fee', description: 'Miscellaneous charges' }
    ];

    res.json({
        success: true,
        data: standardFeeHeads
    });
});

module.exports = {
    createFeeStructure,
    getAllFeeStructures,
    getFeeStructure,
    updateFeeStructure,
    approveFeeStructure,
    activateFeeStructure,
    createNewVersion,
    archiveFeeStructure,
    getFeeHeadsMaster
};
