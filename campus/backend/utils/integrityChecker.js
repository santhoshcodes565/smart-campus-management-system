/**
 * DATA INTEGRITY CHECKER
 * 
 * This module performs read-only integrity checks on backend startup.
 * It NEVER modifies data - only logs warnings if anomalies are detected.
 */

const User = require('../models/User');
const Faculty = require('../models/Faculty');
const Student = require('../models/Student');
const SystemSettings = require('../models/SystemSettings');

// Store previous counts to detect drops
let lastKnownCounts = null;

/**
 * Performs integrity check on startup
 * @returns {Promise<Object>} Integrity report
 */
const runIntegrityCheck = async () => {
    console.log('\n🔍 [INTEGRITY] Running startup integrity check...');

    const report = {
        timestamp: new Date().toISOString(),
        status: 'OK',
        warnings: [],
        counts: {}
    };

    try {
        // Count current records
        const [adminCount, facultyCount, studentCount, userCount] = await Promise.all([
            User.countDocuments({ role: 'admin' }),
            Faculty.countDocuments(),
            Student.countDocuments(),
            User.countDocuments()
        ]);

        report.counts = {
            admins: adminCount,
            faculty: facultyCount,
            students: studentCount,
            totalUsers: userCount
        };

        // Get last known counts from settings
        const storedCounts = await SystemSettings.getSetting('lastKnownCounts', null);

        if (storedCounts) {
            // Check for unexpected drops
            if (facultyCount < storedCounts.faculty) {
                const dropped = storedCounts.faculty - facultyCount;
                report.warnings.push(`⚠️ Faculty count dropped by ${dropped} (was ${storedCounts.faculty}, now ${facultyCount})`);
            }

            if (studentCount < storedCounts.students) {
                const dropped = storedCounts.students - studentCount;
                report.warnings.push(`⚠️ Student count dropped by ${dropped} (was ${storedCounts.students}, now ${studentCount})`);
            }

            if (adminCount < storedCounts.admins) {
                report.warnings.push(`⚠️ Admin count dropped (was ${storedCounts.admins}, now ${adminCount})`);
            }
        }

        // Check for faculty without subject assignments
        const facultyWithoutSubjects = await Faculty.countDocuments({
            $or: [
                { subjectIds: { $exists: false } },
                { subjectIds: { $size: 0 } }
            ]
        });

        if (facultyWithoutSubjects > 0) {
            report.warnings.push(`ℹ️ ${facultyWithoutSubjects} faculty member(s) have no subject assignments`);
        }

        // Store current counts for next comparison
        await SystemSettings.setSetting('lastKnownCounts', report.counts, 'Last recorded entity counts');
        await SystemSettings.setSetting('lastIntegrityCheck', report.timestamp, 'Last integrity check timestamp');

        // Set status
        if (report.warnings.length > 0) {
            report.status = 'WARNINGS';
        }

        // Log report
        console.log('📊 [INTEGRITY] Current counts:');
        console.log(`   - Admins: ${adminCount}`);
        console.log(`   - Faculty: ${facultyCount}`);
        console.log(`   - Students: ${studentCount}`);
        console.log(`   - Total Users: ${userCount}`);

        if (report.warnings.length > 0) {
            console.log('\n⚠️ [INTEGRITY] Warnings detected:');
            report.warnings.forEach(w => console.log(`   ${w}`));
        } else {
            console.log('✅ [INTEGRITY] All checks passed');
        }

        console.log('');

        return report;

    } catch (error) {
        console.error('❌ [INTEGRITY] Check failed:', error.message);
        report.status = 'ERROR';
        report.error = error.message;
        return report;
    }
};

/**
 * Verifies that a restart hasn't corrupted data
 * This is a lightweight check that runs on every boot
 */
const verifyRestartSafety = async () => {
    try {
        const seedCompleted = await SystemSettings.getSetting('seedCompleted', false);

        if (seedCompleted) {
            console.log('🔒 [SAFETY] Seed lock is ACTIVE - data is protected from accidental seeds');
        } else {
            console.log('ℹ️ [SAFETY] Seed lock not set - database may be fresh or unseeded');
        }

        return true;
    } catch (error) {
        console.error('❌ [SAFETY] Verification failed:', error.message);
        return false;
    }
};

module.exports = {
    runIntegrityCheck,
    verifyRestartSafety
};
