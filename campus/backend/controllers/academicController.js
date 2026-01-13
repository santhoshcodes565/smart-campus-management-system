const Department = require('../models/Department');
const Course = require('../models/Course');
const Subject = require('../models/Subject');
const Faculty = require('../models/Faculty');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// ==================== DEPARTMENT MANAGEMENT ====================

// @desc    Create department
// @route   POST /api/admin/departments
// @access  Admin
const createDepartment = async (req, res, next) => {
    try {
        const { name, code, description, headOfDepartment } = req.body;

        // Check for duplicate
        const existingDept = await Department.findOne({
            $or: [{ name }, { code: code.toUpperCase() }]
        });
        if (existingDept) {
            return errorResponse(res, 400, 'Department with this name or code already exists');
        }

        const department = await Department.create({
            name,
            code: code.toUpperCase(),
            description,
            headOfDepartment: headOfDepartment || null
        });

        return successResponse(res, 201, 'Department created successfully', department);
    } catch (error) {
        next(error);
    }
};

// @desc    Get all departments
// @route   GET /api/admin/departments
// @access  Admin
const getAllDepartments = async (req, res, next) => {
    try {
        const { status, search } = req.query;

        let query = {};
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } }
            ];
        }

        const departments = await Department.find(query)
            .populate('headOfDepartment', 'userId')
            .populate({
                path: 'headOfDepartment',
                populate: { path: 'userId', select: 'name' }
            })
            .sort({ name: 1 });

        return successResponse(res, 200, 'Departments fetched successfully', departments);
    } catch (error) {
        next(error);
    }
};

// @desc    Get single department
// @route   GET /api/admin/departments/:id
// @access  Admin
const getDepartment = async (req, res, next) => {
    try {
        const department = await Department.findById(req.params.id)
            .populate({
                path: 'headOfDepartment',
                populate: { path: 'userId', select: 'name' }
            });

        if (!department) {
            return errorResponse(res, 404, 'Department not found');
        }

        return successResponse(res, 200, 'Department fetched successfully', department);
    } catch (error) {
        next(error);
    }
};

// @desc    Update department
// @route   PUT /api/admin/departments/:id
// @access  Admin
const updateDepartment = async (req, res, next) => {
    try {
        const { name, code, description, headOfDepartment, status } = req.body;

        const department = await Department.findById(req.params.id);
        if (!department) {
            return errorResponse(res, 404, 'Department not found');
        }

        // Check for duplicate if name or code changed
        if (name !== department.name || code !== department.code) {
            const existingDept = await Department.findOne({
                _id: { $ne: req.params.id },
                $or: [{ name }, { code: code?.toUpperCase() }]
            });
            if (existingDept) {
                return errorResponse(res, 400, 'Department with this name or code already exists');
            }
        }

        department.name = name || department.name;
        department.code = code ? code.toUpperCase() : department.code;
        department.description = description !== undefined ? description : department.description;
        department.headOfDepartment = headOfDepartment !== undefined ? headOfDepartment : department.headOfDepartment;
        department.status = status || department.status;

        await department.save();

        return successResponse(res, 200, 'Department updated successfully', department);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete department
// @route   DELETE /api/admin/departments/:id
// @access  Admin
const deleteDepartment = async (req, res, next) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) {
            return errorResponse(res, 404, 'Department not found');
        }

        // Check for all linked data
        const linkedCourses = await Course.countDocuments({ departmentId: req.params.id });
        const linkedSubjects = await Subject.countDocuments({ departmentId: req.params.id });

        // Check for students linked to this department via Student model
        const Student = require('../models/Student');
        const linkedStudents = await Student.countDocuments({ departmentId: req.params.id });

        // Check for faculty linked to this department
        const linkedFaculty = await Faculty.countDocuments({ departmentId: req.params.id });

        const hasDependencies = linkedCourses > 0 || linkedSubjects > 0 || linkedStudents > 0 || linkedFaculty > 0;

        if (hasDependencies) {
            // Return 409 Conflict with detailed dependency info
            return res.status(409).json({
                success: false,
                error: 'Cannot delete department with linked data. Consider deactivating instead.',
                dependencies: {
                    courses: linkedCourses,
                    subjects: linkedSubjects,
                    students: linkedStudents,
                    faculty: linkedFaculty
                },
                suggestion: 'Use PUT /api/admin/departments/:id/deactivate to safely deactivate this department.'
            });
        }

        await Department.findByIdAndDelete(req.params.id);
        return successResponse(res, 200, 'Department deleted successfully');
    } catch (error) {
        next(error);
    }
};

// @desc    Deactivate department (soft delete)
// @route   PUT /api/admin/departments/:id/deactivate
// @access  Admin
const deactivateDepartment = async (req, res, next) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) {
            return errorResponse(res, 404, 'Department not found');
        }

        if (department.status === 'inactive') {
            return errorResponse(res, 400, 'Department is already inactive');
        }

        department.status = 'inactive';
        await department.save();

        // Count affected entities for response
        const linkedCourses = await Course.countDocuments({ departmentId: req.params.id });
        const linkedSubjects = await Subject.countDocuments({ departmentId: req.params.id });

        return successResponse(res, 200, 'Department deactivated successfully', {
            department,
            note: `${linkedCourses} course(s) and ${linkedSubjects} subject(s) remain linked but department is now inactive.`
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Activate department
// @route   PUT /api/admin/departments/:id/activate
// @access  Admin
const activateDepartment = async (req, res, next) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) {
            return errorResponse(res, 404, 'Department not found');
        }

        if (department.status === 'active') {
            return errorResponse(res, 400, 'Department is already active');
        }

        department.status = 'active';
        await department.save();

        return successResponse(res, 200, 'Department activated successfully', department);
    } catch (error) {
        next(error);
    }
};

// @desc    Toggle department status (legacy)
// @route   PUT /api/admin/departments/:id/toggle-status
// @access  Admin
const toggleDepartmentStatus = async (req, res, next) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) {
            return errorResponse(res, 404, 'Department not found');
        }

        department.status = department.status === 'active' ? 'inactive' : 'active';
        await department.save();

        return successResponse(res, 200, `Department ${department.status === 'active' ? 'activated' : 'deactivated'} successfully`, department);
    } catch (error) {
        next(error);
    }
};


// ==================== COURSE MANAGEMENT ====================

// @desc    Create course
// @route   POST /api/admin/courses
// @access  Admin
const createCourse = async (req, res, next) => {
    try {
        const { name, code, departmentId, duration, durationType, description } = req.body;

        // Validate department exists
        const department = await Department.findById(departmentId);
        if (!department) {
            return errorResponse(res, 400, 'Invalid department');
        }

        // Check for duplicate code
        const existingCourse = await Course.findOne({ code: code.toUpperCase() });
        if (existingCourse) {
            return errorResponse(res, 400, 'Course with this code already exists');
        }

        const totalSemesters = durationType === 'year' ? duration * 2 : duration;

        const course = await Course.create({
            name,
            code: code.toUpperCase(),
            departmentId,
            duration,
            durationType: durationType || 'year',
            totalSemesters,
            description
        });

        return successResponse(res, 201, 'Course created successfully', course);
    } catch (error) {
        next(error);
    }
};

// @desc    Get all courses
// @route   GET /api/admin/courses
// @access  Admin
const getAllCourses = async (req, res, next) => {
    try {
        const { departmentId, status, search } = req.query;

        let query = {};
        if (departmentId) query.departmentId = departmentId;
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } }
            ];
        }

        const courses = await Course.find(query)
            .populate('departmentId', 'name code')
            .sort({ name: 1 });

        return successResponse(res, 200, 'Courses fetched successfully', courses);
    } catch (error) {
        next(error);
    }
};

// @desc    Get single course
// @route   GET /api/admin/courses/:id
// @access  Admin
const getCourse = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate('departmentId', 'name code');

        if (!course) {
            return errorResponse(res, 404, 'Course not found');
        }

        return successResponse(res, 200, 'Course fetched successfully', course);
    } catch (error) {
        next(error);
    }
};

// @desc    Update course
// @route   PUT /api/admin/courses/:id
// @access  Admin
const updateCourse = async (req, res, next) => {
    try {
        const { name, code, departmentId, duration, durationType, description, status } = req.body;

        const course = await Course.findById(req.params.id);
        if (!course) {
            return errorResponse(res, 404, 'Course not found');
        }

        // Check for duplicate code
        if (code && code !== course.code) {
            const existingCourse = await Course.findOne({
                _id: { $ne: req.params.id },
                code: code.toUpperCase()
            });
            if (existingCourse) {
                return errorResponse(res, 400, 'Course with this code already exists');
            }
        }

        // Validate department if changed
        if (departmentId && departmentId !== course.departmentId.toString()) {
            const department = await Department.findById(departmentId);
            if (!department) {
                return errorResponse(res, 400, 'Invalid department');
            }
        }

        course.name = name || course.name;
        course.code = code ? code.toUpperCase() : course.code;
        course.departmentId = departmentId || course.departmentId;
        course.duration = duration || course.duration;
        course.durationType = durationType || course.durationType;
        course.totalSemesters = course.durationType === 'year' ? course.duration * 2 : course.duration;
        course.description = description !== undefined ? description : course.description;
        course.status = status || course.status;

        await course.save();

        return successResponse(res, 200, 'Course updated successfully', course);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete course
// @route   DELETE /api/admin/courses/:id
// @access  Admin
const deleteCourse = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return errorResponse(res, 404, 'Course not found');
        }

        // Check if any subjects are linked to this course
        const linkedSubjects = await Subject.countDocuments({ courseId: req.params.id });
        if (linkedSubjects > 0) {
            return errorResponse(res, 400, `Cannot delete course. ${linkedSubjects} subject(s) are linked to it.`);
        }

        await Course.findByIdAndDelete(req.params.id);

        return successResponse(res, 200, 'Course deleted successfully');
    } catch (error) {
        next(error);
    }
};

// @desc    Toggle course status
// @route   PUT /api/admin/courses/:id/toggle-status
// @access  Admin
const toggleCourseStatus = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return errorResponse(res, 404, 'Course not found');
        }

        course.status = course.status === 'active' ? 'inactive' : 'active';
        await course.save();

        return successResponse(res, 200, `Course ${course.status === 'active' ? 'activated' : 'deactivated'} successfully`, course);
    } catch (error) {
        next(error);
    }
};

// ==================== SUBJECT MANAGEMENT ====================

// @desc    Create subject
// @route   POST /api/admin/subjects
// @access  Admin
const createSubject = async (req, res, next) => {
    try {
        const { name, code, courseId, semester, credits, type, facultyId, description } = req.body;

        // Validate course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return errorResponse(res, 400, 'Invalid course');
        }

        // Validate semester is within course's total semesters
        if (semester > course.totalSemesters) {
            return errorResponse(res, 400, `Semester cannot exceed ${course.totalSemesters} for this course`);
        }

        // Check for duplicate code
        const existingSubject = await Subject.findOne({ code: code.toUpperCase() });
        if (existingSubject) {
            return errorResponse(res, 400, 'Subject with this code already exists');
        }

        // Validate faculty if provided
        if (facultyId) {
            const faculty = await Faculty.findById(facultyId);
            if (!faculty) {
                return errorResponse(res, 400, 'Invalid faculty');
            }
        }

        const subject = await Subject.create({
            name,
            code: code.toUpperCase(),
            courseId,
            semester,
            credits: credits || 3,
            type: type || 'theory',
            facultyId: facultyId || null,
            description
        });

        return successResponse(res, 201, 'Subject created successfully', subject);
    } catch (error) {
        next(error);
    }
};

// @desc    Get all subjects
// @route   GET /api/admin/subjects
// @access  Admin
const getAllSubjects = async (req, res, next) => {
    try {
        const { courseId, semester, status, facultyId, search } = req.query;

        let query = {};
        if (courseId) query.courseId = courseId;
        if (semester) query.semester = parseInt(semester);
        if (status) query.status = status;
        if (facultyId) query.facultyId = facultyId;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } }
            ];
        }

        const subjects = await Subject.find(query)
            .populate({
                path: 'courseId',
                select: 'name code totalSemesters departmentId',
                populate: { path: 'departmentId', select: 'name code' }
            })
            .populate({
                path: 'facultyId',
                populate: { path: 'userId', select: 'name' }
            })
            .sort({ courseId: 1, semester: 1, name: 1 });

        return successResponse(res, 200, 'Subjects fetched successfully', subjects);
    } catch (error) {
        next(error);
    }
};

// @desc    Get single subject
// @route   GET /api/admin/subjects/:id
// @access  Admin
const getSubject = async (req, res, next) => {
    try {
        const subject = await Subject.findById(req.params.id)
            .populate('courseId', 'name code')
            .populate({
                path: 'facultyId',
                populate: { path: 'userId', select: 'name' }
            });

        if (!subject) {
            return errorResponse(res, 404, 'Subject not found');
        }

        return successResponse(res, 200, 'Subject fetched successfully', subject);
    } catch (error) {
        next(error);
    }
};

// @desc    Update subject
// @route   PUT /api/admin/subjects/:id
// @access  Admin
const updateSubject = async (req, res, next) => {
    try {
        const { name, code, courseId, semester, credits, type, facultyId, description, status } = req.body;

        const subject = await Subject.findById(req.params.id);
        if (!subject) {
            return errorResponse(res, 404, 'Subject not found');
        }

        // Check for duplicate code
        if (code && code !== subject.code) {
            const existingSubject = await Subject.findOne({
                _id: { $ne: req.params.id },
                code: code.toUpperCase()
            });
            if (existingSubject) {
                return errorResponse(res, 400, 'Subject with this code already exists');
            }
        }

        // Validate course if changed
        if (courseId && courseId !== subject.courseId.toString()) {
            const course = await Course.findById(courseId);
            if (!course) {
                return errorResponse(res, 400, 'Invalid course');
            }
            // Validate semester for new course
            if (semester && semester > course.totalSemesters) {
                return errorResponse(res, 400, `Semester cannot exceed ${course.totalSemesters} for this course`);
            }
        }

        // Validate faculty if provided
        if (facultyId && facultyId !== subject.facultyId?.toString()) {
            const faculty = await Faculty.findById(facultyId);
            if (!faculty) {
                return errorResponse(res, 400, 'Invalid faculty');
            }
        }

        subject.name = name || subject.name;
        subject.code = code ? code.toUpperCase() : subject.code;
        subject.courseId = courseId || subject.courseId;
        subject.semester = semester || subject.semester;
        subject.credits = credits !== undefined ? credits : subject.credits;
        subject.type = type || subject.type;
        subject.facultyId = facultyId !== undefined ? facultyId : subject.facultyId;
        subject.description = description !== undefined ? description : subject.description;
        subject.status = status || subject.status;

        await subject.save();

        return successResponse(res, 200, 'Subject updated successfully', subject);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete subject
// @route   DELETE /api/admin/subjects/:id
// @access  Admin
const deleteSubject = async (req, res, next) => {
    try {
        const subject = await Subject.findById(req.params.id);
        if (!subject) {
            return errorResponse(res, 404, 'Subject not found');
        }

        await Subject.findByIdAndDelete(req.params.id);

        return successResponse(res, 200, 'Subject deleted successfully');
    } catch (error) {
        next(error);
    }
};

// @desc    Toggle subject status
// @route   PUT /api/admin/subjects/:id/toggle-status
// @access  Admin
const toggleSubjectStatus = async (req, res, next) => {
    try {
        const subject = await Subject.findById(req.params.id);
        if (!subject) {
            return errorResponse(res, 404, 'Subject not found');
        }

        subject.status = subject.status === 'active' ? 'inactive' : 'active';
        await subject.save();

        return successResponse(res, 200, `Subject ${subject.status === 'active' ? 'activated' : 'deactivated'} successfully`, subject);
    } catch (error) {
        next(error);
    }
};

// @desc    Assign faculty to subject
// @route   PUT /api/admin/subjects/:id/assign-faculty
// @access  Admin
const assignFacultyToSubject = async (req, res, next) => {
    try {
        const { facultyId } = req.body;

        const subject = await Subject.findById(req.params.id);
        if (!subject) {
            return errorResponse(res, 404, 'Subject not found');
        }

        if (facultyId) {
            const faculty = await Faculty.findById(facultyId);
            if (!faculty) {
                return errorResponse(res, 400, 'Invalid faculty');
            }
        }

        subject.facultyId = facultyId || null;
        await subject.save();

        const updatedSubject = await Subject.findById(req.params.id)
            .populate({
                path: 'facultyId',
                populate: { path: 'userId', select: 'name' }
            });

        return successResponse(res, 200, facultyId ? 'Faculty assigned successfully' : 'Faculty removed successfully', updatedSubject);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    // Departments
    createDepartment,
    getAllDepartments,
    getDepartment,
    updateDepartment,
    deleteDepartment,
    deactivateDepartment,
    activateDepartment,
    toggleDepartmentStatus,
    // Courses
    createCourse,
    getAllCourses,
    getCourse,
    updateCourse,
    deleteCourse,
    toggleCourseStatus,
    // Subjects
    createSubject,
    getAllSubjects,
    getSubject,
    updateSubject,
    deleteSubject,
    toggleSubjectStatus,
    assignFacultyToSubject
};
