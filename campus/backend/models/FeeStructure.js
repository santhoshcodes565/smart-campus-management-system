const mongoose = require('mongoose');

/**
 * FeeStructure Model
 * Versioned fee template for academic periods - MASTER DATA
 * 
 * GOVERNANCE RULES:
 * - Fee Structures are VERSIONED
 * - Once assigned to students, structure becomes READ-ONLY (isLocked = true)
 * - Any revision creates a NEW VERSION
 * - Status progression: draft → approved → active → archived
 */
const feeStructureSchema = new mongoose.Schema({
    // Unique Identification
    code: {
        type: String,
        required: [true, 'Structure code is required'],
        unique: true,
        uppercase: true,
        trim: true
        // Format: FS-{YEAR}-{COURSE}-{DEPT}-{SEM} e.g., "FS-2025-BTECH-CSE-S1"
    },
    name: {
        type: String,
        required: [true, 'Structure name is required'],
        trim: true
    },
    description: {
        type: String,
        default: ''
    },

    // Academic Scope
    academicYear: {
        type: String,
        required: [true, 'Academic year is required'],
        trim: true
        // Format: "2024-25"
    },
    semester: {
        type: Number,
        min: 1,
        max: 8,
        default: null
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        default: null
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        default: null
    },

    // Fee Heads - Line items
    feeHeads: [{
        headCode: {
            type: String,
            required: true,
            uppercase: true
            // TUITION, EXAMINATION, LIBRARY, LABORATORY, HOSTEL, TRANSPORT, OTHER
        },
        headName: {
            type: String,
            required: true
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        isOptional: {
            type: Boolean,
            default: false
        },
        description: {
            type: String,
            default: ''
        }
    }],

    // Computed Totals (pre-calculated for performance)
    totalMandatory: {
        type: Number,
        default: 0
    },
    totalOptional: {
        type: Number,
        default: 0
    },
    approvedTotal: {
        type: Number,
        required: true,
        min: 0
    },

    // Versioning & Governance
    version: {
        type: Number,
        default: 1,
        min: 1
    },
    parentStructureId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FeeStructure',
        default: null
        // Reference to the structure this was versioned from
    },
    status: {
        type: String,
        enum: ['draft', 'approved', 'active', 'archived'],
        default: 'draft'
    },
    isLocked: {
        type: Boolean,
        default: false
        // Locked when assigned to students - no edits allowed
    },
    lockedAt: {
        type: Date,
        default: null
    },
    lockedReason: {
        type: String,
        default: ''
    },

    // Approval Workflow
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    approvedAt: {
        type: Date,
        default: null
    },
    approvalRemarks: {
        type: String,
        default: ''
    },

    // Effective Dates
    effectiveFrom: {
        type: Date,
        default: null
    },
    effectiveTo: {
        type: Date,
        default: null
    },

    // Audit Trail
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
feeStructureSchema.index({ code: 1 });
feeStructureSchema.index({ academicYear: 1, status: 1 });
feeStructureSchema.index({ departmentId: 1, courseId: 1 });
feeStructureSchema.index({ status: 1, isLocked: 1 });

// Pre-save middleware to calculate totals
feeStructureSchema.pre('save', function (next) {
    if (this.feeHeads && this.feeHeads.length > 0) {
        this.totalMandatory = this.feeHeads
            .filter(head => !head.isOptional)
            .reduce((sum, head) => sum + (head.amount || 0), 0);

        this.totalOptional = this.feeHeads
            .filter(head => head.isOptional)
            .reduce((sum, head) => sum + (head.amount || 0), 0);

        // Approved total is mandatory fees by default
        if (!this.approvedTotal) {
            this.approvedTotal = this.totalMandatory;
        }
    }
    next();
});

// Prevent modification of locked structures
feeStructureSchema.pre('save', function (next) {
    if (this.isLocked && this.isModified() && !this.isNew) {
        // Only allow status change to 'archived' for locked structures
        const modifiedPaths = this.modifiedPaths();
        const allowedModifications = ['status', 'updatedBy', 'updatedAt'];
        const hasDisallowedModification = modifiedPaths.some(
            path => !allowedModifications.includes(path)
        );

        if (hasDisallowedModification) {
            return next(new Error('Cannot modify a locked fee structure. Create a new version instead.'));
        }
    }
    next();
});

// Static method to generate structure code
feeStructureSchema.statics.generateCode = async function (academicYear, courseCode, deptCode, semester) {
    const prefix = `FS-${academicYear.replace('-', '')}-${courseCode}-${deptCode}-S${semester}`;
    const existing = await this.countDocuments({ code: new RegExp(`^${prefix}`) });
    return existing > 0 ? `${prefix}-V${existing + 1}` : prefix;
};

// Static method to create new version from existing structure
feeStructureSchema.statics.createNewVersion = async function (structureId, createdBy) {
    const original = await this.findById(structureId);
    if (!original) {
        throw new Error('Original structure not found');
    }

    const newVersion = new this({
        code: `${original.code.split('-V')[0]}-V${original.version + 1}`,
        name: `${original.name} (Version ${original.version + 1})`,
        description: original.description,
        academicYear: original.academicYear,
        semester: original.semester,
        departmentId: original.departmentId,
        courseId: original.courseId,
        feeHeads: original.feeHeads.map(head => ({
            headCode: head.headCode,
            headName: head.headName,
            amount: head.amount,
            isOptional: head.isOptional,
            description: head.description
        })),
        approvedTotal: original.approvedTotal,
        version: original.version + 1,
        parentStructureId: original._id,
        status: 'draft',
        createdBy: createdBy
    });

    return await newVersion.save();
};

// Instance method to lock structure
feeStructureSchema.methods.lock = async function (reason, lockedBy) {
    if (this.isLocked) {
        throw new Error('Structure is already locked');
    }

    this.isLocked = true;
    this.lockedAt = new Date();
    this.lockedReason = reason || 'Assigned to students';
    this.updatedBy = lockedBy;

    return await this.save();
};

// Instance method to approve structure
feeStructureSchema.methods.approve = async function (approvedBy, remarks) {
    if (this.status !== 'draft') {
        throw new Error('Only draft structures can be approved');
    }

    this.status = 'approved';
    this.approvedBy = approvedBy;
    this.approvedAt = new Date();
    this.approvalRemarks = remarks || '';
    this.updatedBy = approvedBy;

    return await this.save();
};

// Instance method to activate structure
feeStructureSchema.methods.activate = async function (updatedBy) {
    if (this.status !== 'approved') {
        throw new Error('Only approved structures can be activated');
    }

    this.status = 'active';
    this.effectiveFrom = new Date();
    this.updatedBy = updatedBy;

    return await this.save();
};

module.exports = mongoose.model('FeeStructure', feeStructureSchema);
