/**
 * DATA RESTORATION UTILITIES
 * 
 * These functions allow admin to restore faculty assignments
 * WITHOUT deleting/recreating users.
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const Faculty = require('./models/Faculty');
const User = require('./models/User');
const Subject = require('./models/Subject');
const FacultyAssignmentAudit = require('./models/FacultyAssignmentAudit');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartcampus');

/**
 * Restores faculty subject assignments from audit log
 */
const restoreFromAudit = async (facultyId, restoreToTimestamp) => {
    console.log(`\n🔄 Restoring faculty ${facultyId} to state at ${restoreToTimestamp}\n`);

    const faculty = await Faculty.findById(facultyId);
    if (!faculty) {
        console.error('Faculty not found');
        return;
    }

    // Get the audit entry closest to the target timestamp
    const auditEntry = await FacultyAssignmentAudit.findOne({
        facultyId,
        fieldChanged: 'subjectIds',
        createdAt: { $lte: new Date(restoreToTimestamp) }
    }).sort({ createdAt: -1 });

    if (!auditEntry) {
        console.log('No audit entry found for restoration');
        return;
    }

    console.log('Found audit entry:', {
        action: auditEntry.action,
        beforeValue: auditEntry.beforeValue,
        afterValue: auditEntry.afterValue,
        timestamp: auditEntry.createdAt
    });

    // Restore to the "after" value of that entry
    const restoreValue = auditEntry.afterValue;

    console.log(`Restoring subjectIds to: [${restoreValue.join(', ')}]`);

    await Faculty.findByIdAndUpdate(facultyId, { $set: { subjectIds: restoreValue } });

    console.log('✅ Restoration complete\n');
};

/**
 * Assigns subjects to faculty by username
 */
const assignSubjectsToFaculty = async (username, subjectNames) => {
    console.log(`\n🔄 Assigning subjects to faculty: ${username}\n`);

    // Find user
    const user = await User.findOne({ username, role: 'faculty' });
    if (!user) {
        console.error(`Faculty user '${username}' not found`);
        return;
    }

    // Find faculty profile
    const faculty = await Faculty.findOne({ userId: user._id });
    if (!faculty) {
        console.error(`Faculty profile for '${username}' not found`);
        return;
    }

    // Find subjects
    const subjects = await Subject.find({ name: { $in: subjectNames } });
    if (subjects.length === 0) {
        console.error('No matching subjects found');
        console.log('Available subjects:');
        const allSubjects = await Subject.find({}, 'name code');
        allSubjects.forEach(s => console.log(`  - ${s.name} (${s.code})`));
        return;
    }

    const subjectIds = subjects.map(s => s._id);

    console.log('Current subjectIds:', faculty.subjectIds);
    console.log('New subjectIds:', subjectIds);

    // Update faculty
    await Faculty.findByIdAndUpdate(faculty._id, { $set: { subjectIds } });

    // Log to audit
    await FacultyAssignmentAudit.logChange({
        facultyId: faculty._id,
        userId: user._id,
        action: 'assigned',
        fieldChanged: 'subjectIds',
        beforeValue: faculty.subjectIds || [],
        afterValue: subjectIds,
        changedBy: user._id, // Self-restoration
        changedByRole: 'system',
        reason: 'Manual restoration via script',
        apiEndpoint: 'restoreAssignments.js'
    });

    console.log(`✅ Assigned ${subjects.length} subject(s) to ${username}\n`);
};

/**
 * Lists all faculty with their current assignments
 */
const listFacultyAssignments = async () => {
    console.log('\n📋 FACULTY ASSIGNMENTS REPORT\n');
    console.log('='.repeat(80));

    try {
        const faculty = await Faculty.find()
            .populate('userId', 'name username')
            .lean();

        if (faculty.length === 0) {
            console.log('No faculty found');
            return;
        }

        for (const f of faculty) {
            console.log(`\n👤 ${f.userId?.name || 'Unknown'} (@${f.userId?.username || 'N/A'})`);
            console.log(`   Employee ID: ${f.employeeId}`);
            console.log(`   Designation: ${f.designation}`);
            console.log(`   Department ID: ${f.departmentId || 'Not assigned'}`);
            console.log(`   Subjects (legacy): [${(f.subjects || []).join(', ')}]`);
            console.log(`   SubjectIds: [${(f.subjectIds || []).map(s => String(s)).join(', ')}] (${(f.subjectIds || []).length} items)`);
            console.log(`   ClassIds: [${(f.classIds || []).join(', ')}]`);
        }

        console.log('\n' + '='.repeat(80) + '\n');
    } catch (error) {
        console.error('Error listing faculty:', error.message);
    }
};

// CLI Interface
const args = process.argv.slice(2);

const showHelp = () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║           FACULTY ASSIGNMENT RESTORATION TOOL                ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Usage:                                                      ║
║    node restoreAssignments.js <command> [args]               ║
║                                                              ║
║  Commands:                                                   ║
║    list                  List all faculty with assignments   ║
║    assign <user> <sub>   Assign subject to faculty           ║
║    restore <id> <date>   Restore from audit log              ║
║                                                              ║
║  Examples:                                                   ║
║    node restoreAssignments.js list                           ║
║    node restoreAssignments.js assign faculty "Algorithms"    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);
};

const run = async () => {
    try {
        if (args.length === 0 || args[0] === 'help') {
            showHelp();
            process.exit(0);
        }

        switch (args[0]) {
            case 'list':
                await listFacultyAssignments();
                break;

            case 'assign':
                if (args.length < 3) {
                    console.error('Usage: assign <username> <subject1> [subject2] ...');
                    process.exit(1);
                }
                await assignSubjectsToFaculty(args[1], args.slice(2));
                break;

            case 'restore':
                if (args.length < 3) {
                    console.error('Usage: restore <facultyId> <timestamp>');
                    process.exit(1);
                }
                await restoreFromAudit(args[1], args[2]);
                break;

            default:
                console.error(`Unknown command: ${args[0]}`);
                showHelp();
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

// Wait for DB connection
mongoose.connection.once('open', () => {
    console.log('Database connected');
    run();
});

mongoose.connection.on('error', (err) => {
    console.error('Database connection error:', err.message);
    process.exit(1);
});
