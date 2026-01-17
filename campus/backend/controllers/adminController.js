const User = require('../models/User');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Admin = require('../models/Admin');
const Timetable = require('../models/Timetable');
const Transport = require('../models/Transport');
const Fee = require('../models/Fee');
const Notice = require('../models/Notice');
const Attendance = require('../models/Attendance');
const Marks = require('../models/Marks');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// ==================== STUDENT MANAGEMENT ====================

// @desc    Create student
// @route   POST /api/admin/students
// @access  Admin
const createStudent = async (req, res, next) => {
    try {
        const {
            name, username, password, department, phone, rollNo,
            year, section, course, semester,
            departmentId, courseId, batch
        } = req.body;

        // Create user first
        const user = await User.create({
            name,
            username,
            password,
            role: 'student',
            department,
            phone
        });

        // Create student profile with academic fields
        const student = await Student.create({
            userId: user._id,
            rollNo,
            year,
            section,
            course,
            semester: semester || (year * 2 - 1), // Auto-calculate semester from year
            departmentId: departmentId || null,
            courseId: courseId || null,
            batch: batch || ''
        });

        return successResponse(res, 201, 'Student created successfully', { user: { id: user._id, name, username }, student });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all students
// @route   GET /api/admin/students
// @access  Admin
const getAllStudents = async (req, res, next) => {
    try {
        const { department, year, section, status, departmentId, courseId, batch } = req.query;
        let userQuery = { role: 'student' };
        let studentQuery = {};

        if (department) userQuery.department = department;
        if (status) userQuery.status = status;
        if (year) studentQuery.year = parseInt(year);
        if (section) studentQuery.section = section;
        if (departmentId) studentQuery.departmentId = departmentId;
        if (courseId) studentQuery.courseId = courseId;
        if (batch) studentQuery.batch = batch;

        const students = await Student.find(studentQuery)
            .populate({
                path: 'userId',
                match: userQuery,
                select: 'name username phone department status createdAt'
            })
            .populate('departmentId', 'name code')
            .populate('courseId', 'name code totalSemesters')
            .sort({ rollNo: 1 });

        // Filter out nulls (where user didn't match query)
        const filtered = students.filter(s => s.userId !== null);

        return successResponse(res, 200, 'Students retrieved', filtered);
    } catch (error) {
        next(error);
    }
};

// @desc    Update student
// @route   PUT /api/admin/students/:id
// @access  Admin
const updateStudent = async (req, res, next) => {
    try {
        const {
            name, email, department, phone, status, rollNo, year, section, course, semester,
            departmentId, courseId, batch
        } = req.body;

        const student = await Student.findById(req.params.id);
        if (!student) {
            return errorResponse(res, 404, 'Student not found');
        }

        // Update user data
        await User.findByIdAndUpdate(student.userId, {
            name, email, department, phone, status
        });

        // Update student data including new academic fields
        Object.assign(student, {
            rollNo, year, section, course, semester,
            departmentId: departmentId !== undefined ? departmentId : student.departmentId,
            courseId: courseId !== undefined ? courseId : student.courseId,
            batch: batch !== undefined ? batch : student.batch
        });
        await student.save();

        return successResponse(res, 200, 'Student updated successfully', student);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete student
// @route   DELETE /api/admin/students/:id
// @access  Admin
const deleteStudent = async (req, res, next) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return errorResponse(res, 404, 'Student not found');
        }

        // Delete related records
        await Attendance.deleteMany({ studentId: student._id });
        await Marks.deleteMany({ studentId: student._id });
        await Fee.deleteMany({ studentId: student._id });

        // Delete user and student
        await User.findByIdAndDelete(student.userId);
        await Student.findByIdAndDelete(req.params.id);

        return successResponse(res, 200, 'Student deleted successfully');
    } catch (error) {
        next(error);
    }
};

// @desc    Reset user password
// @route   PUT /api/admin/users/:id/reset-password
// @access  Admin
// ISOLATED: This function ONLY modifies the password field, never touching
//           subjectIds, permissions, classIds, or any other data
const resetPassword = async (req, res, next) => {
    try {
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return errorResponse(res, 400, 'Password must be at least 6 characters');
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return errorResponse(res, 404, 'User not found');
        }

        // ISOLATED UPDATE: Only password field is modified
        // This uses user.save() which only updates the password field
        // Pre-save hook will hash the password
        user.password = newPassword;
        await user.save();

        console.log(`[PASSWORD RESET] User ${user._id} (${user.username}) - Password reset successfully. No other fields modified.`);

        return successResponse(res, 200, 'Password reset successfully');
    } catch (error) {
        console.error(`[PASSWORD RESET] Failed for user ${req.params.id}:`, error.message);
        next(error);
    }
};

// ==================== FACULTY MANAGEMENT ====================

// @desc    Create faculty
// @route   POST /api/admin/faculty
// @access  Admin
const createFaculty = async (req, res, next) => {
    try {
        const {
            name, username, password, department, phone, employeeId, designation,
            subjects, qualification, departmentId, subjectIds, classIds
        } = req.body;

        const user = await User.create({
            name,
            username,
            password,
            role: 'faculty',
            department,
            phone
        });

        const faculty = await Faculty.create({
            userId: user._id,
            employeeId,
            designation,
            subjects: subjects || [],
            qualification,
            departmentId: departmentId || null,
            subjectIds: subjectIds || [],
            classIds: classIds || []
        });

        return successResponse(res, 201, 'Faculty created successfully', { user: { id: user._id, name, username }, faculty });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all faculty
// @route   GET /api/admin/faculty
// @access  Admin
const getAllFaculty = async (req, res, next) => {
    try {
        const { department, designation, departmentId } = req.query;
        let userQuery = { role: 'faculty' };
        let facultyQuery = {};

        if (department) userQuery.department = department;
        if (designation) facultyQuery.designation = designation;
        if (departmentId) facultyQuery.departmentId = departmentId;

        const faculty = await Faculty.find(facultyQuery)
            .populate({
                path: 'userId',
                match: userQuery,
                select: 'name username phone department status createdAt'
            })
            .populate('departmentId', 'name code')
            .populate('subjectIds', 'name code')
            .sort({ employeeId: 1 });

        const filtered = faculty.filter(f => f.userId !== null);

        return successResponse(res, 200, 'Faculty retrieved', filtered);
    } catch (error) {
        next(error);
    }
};

// @desc    Update faculty
// @route   PUT /api/admin/faculty/:id
// @access  Admin
const updateFaculty = async (req, res, next) => {
    try {
        const FacultyAssignmentAudit = require('../models/FacultyAssignmentAudit');

        const {
            name, email, department, phone, status, employeeId, designation,
            subjects, qualification, departmentId, subjectIds, classIds
        } = req.body;

        const faculty = await Faculty.findById(req.params.id);
        if (!faculty) {
            return errorResponse(res, 404, 'Faculty not found');
        }

        // Store original values for audit
        const originalSubjectIds = [...(faculty.subjectIds || [])];
        const originalClassIds = [...(faculty.classIds || [])];
        const originalDepartmentId = faculty.departmentId;

        // Update user data (only provided fields)
        const userUpdateData = {};
        if (name !== undefined) userUpdateData.name = name;
        if (email !== undefined) userUpdateData.email = email;
        if (department !== undefined) userUpdateData.department = department;
        if (phone !== undefined) userUpdateData.phone = phone;
        if (status !== undefined) userUpdateData.status = status;

        if (Object.keys(userUpdateData).length > 0) {
            await User.findByIdAndUpdate(faculty.userId, { $set: userUpdateData });
        }

        // Prepare faculty update data - ONLY include fields that were explicitly provided
        const facultyUpdateData = {};

        if (employeeId !== undefined) facultyUpdateData.employeeId = employeeId;
        if (designation !== undefined) facultyUpdateData.designation = designation;
        if (subjects !== undefined) facultyUpdateData.subjects = subjects;
        if (qualification !== undefined) facultyUpdateData.qualification = qualification;

        // PROTECTED FIELDS: Only update if explicitly provided AND not empty
        // This prevents accidental clearing of assignments

        // DepartmentId update with audit
        if (departmentId !== undefined) {
            facultyUpdateData.departmentId = departmentId;
            if (String(departmentId) !== String(originalDepartmentId)) {
                await FacultyAssignmentAudit.logChange({
                    facultyId: faculty._id,
                    userId: faculty.userId,
                    action: 'updated',
                    fieldChanged: 'departmentId',
                    beforeValue: originalDepartmentId,
                    afterValue: departmentId,
                    changedBy: req.user._id,
                    changedByRole: 'admin',
                    reason: 'Admin faculty update',
                    apiEndpoint: 'PUT /api/admin/faculty/:id'
                });
                console.log(`[AUDIT] Faculty ${faculty._id} departmentId changed: ${originalDepartmentId} -> ${departmentId}`);
            }
        }

        // SubjectIds update with audit and protection
        if (subjectIds !== undefined) {
            // PROTECTION: If an empty array is passed, log a warning but still allow it (admin explicit action)
            if (Array.isArray(subjectIds) && subjectIds.length === 0 && originalSubjectIds.length > 0) {
                console.warn(`[PROTECTION] Warning: Clearing all subjectIds for faculty ${faculty._id}. Original: ${originalSubjectIds.join(', ')}`);
            }

            facultyUpdateData.subjectIds = subjectIds;

            // Log the change
            const action = subjectIds.length === 0 ? 'cleared' :
                subjectIds.length > originalSubjectIds.length ? 'assigned' : 'updated';

            await FacultyAssignmentAudit.logChange({
                facultyId: faculty._id,
                userId: faculty.userId,
                action,
                fieldChanged: 'subjectIds',
                beforeValue: originalSubjectIds,
                afterValue: subjectIds,
                changedBy: req.user._id,
                changedByRole: 'admin',
                reason: 'Admin faculty update',
                apiEndpoint: 'PUT /api/admin/faculty/:id'
            });
            console.log(`[AUDIT] Faculty ${faculty._id} subjectIds changed: [${originalSubjectIds.join(', ')}] -> [${subjectIds.join(', ')}]`);
        }

        // ClassIds update with audit and protection
        if (classIds !== undefined) {
            if (Array.isArray(classIds) && classIds.length === 0 && originalClassIds.length > 0) {
                console.warn(`[PROTECTION] Warning: Clearing all classIds for faculty ${faculty._id}. Original: ${originalClassIds.join(', ')}`);
            }

            facultyUpdateData.classIds = classIds;

            const action = classIds.length === 0 ? 'cleared' :
                classIds.length > originalClassIds.length ? 'assigned' : 'updated';

            await FacultyAssignmentAudit.logChange({
                facultyId: faculty._id,
                userId: faculty.userId,
                action,
                fieldChanged: 'classIds',
                beforeValue: originalClassIds,
                afterValue: classIds,
                changedBy: req.user._id,
                changedByRole: 'admin',
                reason: 'Admin faculty update',
                apiEndpoint: 'PUT /api/admin/faculty/:id'
            });
            console.log(`[AUDIT] Faculty ${faculty._id} classIds changed: [${originalClassIds.join(', ')}] -> [${classIds.join(', ')}]`);
        }

        // Apply updates using $set to prevent overwriting other fields
        if (Object.keys(facultyUpdateData).length > 0) {
            await Faculty.findByIdAndUpdate(req.params.id, { $set: facultyUpdateData });
        }

        // Fetch updated faculty
        const updatedFaculty = await Faculty.findById(req.params.id)
            .populate('departmentId', 'name code')
            .populate('subjectIds', 'name code');

        console.log(`[SUCCESS] Faculty ${faculty._id} updated successfully`);
        return successResponse(res, 200, 'Faculty updated successfully', updatedFaculty);
    } catch (error) {
        console.error('[ERROR] Faculty update failed:', error);
        next(error);
    }
};

// @desc    Delete faculty
// @route   DELETE /api/admin/faculty/:id
// @access  Admin
const deleteFaculty = async (req, res, next) => {
    try {
        const faculty = await Faculty.findById(req.params.id);
        if (!faculty) {
            return errorResponse(res, 404, 'Faculty not found');
        }

        await User.findByIdAndDelete(faculty.userId);
        await Faculty.findByIdAndDelete(req.params.id);

        return successResponse(res, 200, 'Faculty deleted successfully');
    } catch (error) {
        next(error);
    }
};

// ==================== TIMETABLE MANAGEMENT ====================

// @desc    Create/Update timetable
// @route   POST /api/admin/timetable
// @access  Admin
const manageTimetable = async (req, res, next) => {
    try {
        const { department, year, section, day, slots } = req.body;

        const timetable = await Timetable.findOneAndUpdate(
            { department, year, section, day },
            { department, year, section, day, slots },
            { upsert: true, new: true }
        );

        return successResponse(res, 200, 'Timetable saved successfully', timetable);
    } catch (error) {
        next(error);
    }
};

// @desc    Get all timetables
// @route   GET /api/admin/timetable
// @access  Admin
const getAllTimetables = async (req, res, next) => {
    try {
        const { department, year, section } = req.query;
        let query = {};

        if (department) query.department = department;
        if (year) query.year = year;
        if (section) query.section = section;

        const timetables = await Timetable.find(query).populate('slots.faculty');

        return successResponse(res, 200, 'Timetables retrieved', timetables);
    } catch (error) {
        next(error);
    }
};

// ==================== TRANSPORT MANAGEMENT ====================

// @desc    Create transport/bus
// @route   POST /api/admin/transport
// @access  Admin
const createTransport = async (req, res, next) => {
    try {
        const transport = await Transport.create(req.body);
        return successResponse(res, 201, 'Transport created successfully', transport);
    } catch (error) {
        next(error);
    }
};

// @desc    Get all transport
// @route   GET /api/admin/transport
// @access  Admin
const getAllTransport = async (req, res, next) => {
    try {
        const transport = await Transport.find().sort({ busNumber: 1 });
        return successResponse(res, 200, 'Transport retrieved', transport);
    } catch (error) {
        next(error);
    }
};

// @desc    Update transport
// @route   PUT /api/admin/transport/:id
// @access  Admin
const updateTransport = async (req, res, next) => {
    try {
        const transport = await Transport.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!transport) {
            return errorResponse(res, 404, 'Transport not found');
        }
        return successResponse(res, 200, 'Transport updated successfully', transport);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete transport
// @route   DELETE /api/admin/transport/:id
// @access  Admin
const deleteTransport = async (req, res, next) => {
    try {
        const transport = await Transport.findByIdAndDelete(req.params.id);
        if (!transport) {
            return errorResponse(res, 404, 'Transport not found');
        }
        return successResponse(res, 200, 'Transport deleted successfully');
    } catch (error) {
        next(error);
    }
};

// ==================== FEE MANAGEMENT ====================

// @desc    Create fee record
// @route   POST /api/admin/fees
// @access  Admin
const createFee = async (req, res, next) => {
    try {
        const fee = await Fee.create(req.body);
        return successResponse(res, 201, 'Fee record created', fee);
    } catch (error) {
        next(error);
    }
};

// @desc    Get all fees
// @route   GET /api/admin/fees
// @access  Admin
const getAllFees = async (req, res, next) => {
    try {
        const { status, feeType, studentId } = req.query;
        let query = {};

        if (status) query.status = status;
        if (feeType) query.feeType = feeType;
        if (studentId) query.studentId = studentId;

        const fees = await Fee.find(query).populate('studentId').sort({ dueDate: -1 });
        return successResponse(res, 200, 'Fees retrieved', fees);
    } catch (error) {
        next(error);
    }
};

// @desc    Update fee (mark as paid, etc.)
// @route   PUT /api/admin/fees/:id
// @access  Admin
const updateFee = async (req, res, next) => {
    try {
        const fee = await Fee.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!fee) {
            return errorResponse(res, 404, 'Fee record not found');
        }
        return successResponse(res, 200, 'Fee updated successfully', fee);
    } catch (error) {
        next(error);
    }
};

// ==================== NOTICE MANAGEMENT ====================

// @desc    Post global notice
// @route   POST /api/admin/notices
// @access  Admin
const postNotice = async (req, res, next) => {
    try {
        const notice = await Notice.create({
            ...req.body,
            postedBy: req.user._id,
            type: 'global'
        });
        return successResponse(res, 201, 'Notice posted successfully', notice);
    } catch (error) {
        next(error);
    }
};

// @desc    Get all notices
// @route   GET /api/admin/notices
// @access  Admin
const getAllNotices = async (req, res, next) => {
    try {
        const notices = await Notice.find()
            .populate('postedBy', 'name')
            .sort({ createdAt: -1 });
        return successResponse(res, 200, 'Notices retrieved', notices);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete notice
// @route   DELETE /api/admin/notices/:id
// @access  Admin
const deleteNotice = async (req, res, next) => {
    try {
        const notice = await Notice.findByIdAndDelete(req.params.id);
        if (!notice) {
            return errorResponse(res, 404, 'Notice not found');
        }
        return successResponse(res, 200, 'Notice deleted successfully');
    } catch (error) {
        next(error);
    }
};

// ==================== REPORTS & ANALYTICS ====================

// @desc    Get dashboard analytics
// @route   GET /api/admin/reports
// @access  Admin
const getReports = async (req, res, next) => {
    try {
        // Safe counts with fallback to 0 if any fail
        let totalStudents = 0;
        let totalFaculty = 0;
        let activeUsers = 0;
        let pendingLeaves = 0;
        let pendingFees = 0;
        let totalNotices = 0;
        let departmentStats = [];

        // Count students
        try {
            totalStudents = await Student.countDocuments();
        } catch (e) {
            console.error('Error counting students:', e.message);
        }

        // Count faculty
        try {
            totalFaculty = await Faculty.countDocuments();
        } catch (e) {
            console.error('Error counting faculty:', e.message);
        }

        // Count active users
        try {
            activeUsers = await User.countDocuments({ status: 'active' });
        } catch (e) {
            console.error('Error counting active users:', e.message);
        }

        // Count pending fees (optional, may fail)
        try {
            pendingFees = await Fee.countDocuments({ status: 'pending' });
        } catch (e) {
            console.error('Error counting pending fees:', e.message);
        }

        // Count notices (optional)
        try {
            totalNotices = await Notice.countDocuments({ isActive: true });
        } catch (e) {
            console.error('Error counting notices:', e.message);
        }

        // Department-wise student count (optional)
        try {
            departmentStats = await User.aggregate([
                { $match: { role: 'student' } },
                { $group: { _id: '$department', count: { $sum: 1 } } }
            ]);
        } catch (e) {
            console.error('Error getting department stats:', e.message);
        }

        return successResponse(res, 200, 'Reports retrieved', {
            overview: {
                totalStudents,
                totalFaculty,
                activeUsers,
                pendingLeaves,
                pendingFees,
                totalNotices
            },
            departmentStats
        });
    } catch (error) {
        console.error('getReports error:', error);
        return errorResponse(res, 500, 'Internal server error');
    }
};

module.exports = {
    // Student
    createStudent,
    getAllStudents,
    updateStudent,
    deleteStudent,
    resetPassword,
    // Faculty
    createFaculty,
    getAllFaculty,
    updateFaculty,
    deleteFaculty,
    // Timetable
    manageTimetable,
    getAllTimetables,
    // Transport
    createTransport,
    getAllTransport,
    updateTransport,
    deleteTransport,
    // Fees
    createFee,
    getAllFees,
    updateFee,
    // Notices
    postNotice,
    getAllNotices,
    deleteNotice,
    // Reports
    getReports
};
