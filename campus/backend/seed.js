/**
 * SAFE DATABASE SEEDER
 * 
 * This script will ONLY run if:
 * 1. FORCE_SEED=true environment variable is set
 * 2. OR the database has no existing admin users
 * 
 * It will NEVER run automatically on backend restart.
 * It will NEVER delete data if seed has already been completed.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Import models
const User = require('./models/User');
const Student = require('./models/Student');
const Faculty = require('./models/Faculty');
const Admin = require('./models/Admin');
const Notice = require('./models/Notice');
const Timetable = require('./models/Timetable');
const Fee = require('./models/Fee');
const Transport = require('./models/Transport');
const Attendance = require('./models/Attendance');
const SystemSettings = require('./models/SystemSettings');

// Connect to database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartcampus');

const SAFETY_CHECKS = async () => {
    console.log('\n🔒 Running safety checks...\n');

    // Check 1: Environment variable override
    if (process.env.FORCE_SEED === 'true') {
        console.log('⚠️  FORCE_SEED=true detected. Proceeding with DESTRUCTIVE seed...');
        console.log('⚠️  This will DELETE ALL existing data!');
        console.log('⚠️  You have 5 seconds to cancel (Ctrl+C)...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));
        return { canProceed: true, isDestructive: true };
    }

    // Check 2: Check if admin exists (first-time setup detection)
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
        console.log('✅ No admin users found. This appears to be a fresh database.');
        console.log('✅ Proceeding with initial seed...\n');
        return { canProceed: true, isDestructive: false };
    }

    // Check 3: Check SystemSettings for seed lock
    const seedCompleted = await SystemSettings.getSetting('seedCompleted', false);
    if (seedCompleted) {
        console.log('🔒 SEED LOCK ACTIVE: Database has already been seeded.');
        console.log('🔒 To force re-seed, run: FORCE_SEED=true node seed.js');
        console.log('🔒 Existing data will NOT be modified.');
        return { canProceed: false, isDestructive: false };
    }

    // Default: Don't proceed if data exists
    console.log(`⚠️  Found ${adminCount} admin user(s). Database appears to have data.`);
    console.log('⚠️  To force re-seed, run: FORCE_SEED=true node seed.js');
    return { canProceed: false, isDestructive: false };
};

const seedData = async () => {
    try {
        console.log('╔══════════════════════════════════════════════════════╗');
        console.log('║     SMART CAMPUS - SAFE DATABASE SEEDER              ║');
        console.log('╚══════════════════════════════════════════════════════╝\n');

        // Run safety checks
        const { canProceed, isDestructive } = await SAFETY_CHECKS();

        if (!canProceed) {
            console.log('\n❌ Seed aborted. No changes made to the database.\n');
            process.exit(0);
        }

        console.log('🌱 Starting database seed...\n');

        // Only clear data if this is a destructive seed (FORCE_SEED=true)
        if (isDestructive) {
            console.log('🗑️  Clearing existing data...');
            await User.deleteMany({});
            await Student.deleteMany({});
            await Faculty.deleteMany({});
            await Admin.deleteMany({});
            await Notice.deleteMany({});
            await Timetable.deleteMany({});
            await Fee.deleteMany({});
            await Transport.deleteMany({});
            await Attendance.deleteMany({});
            console.log('✅ Cleared existing data\n');
        }

        // Create Admin User
        console.log('👤 Creating Admin user...');
        const adminUser = await User.create({
            name: 'Super Admin',
            username: 'admin',
            password: 'admin123',
            role: 'admin',
            department: 'Administration',
            phone: '9876543210',
            status: 'active',
            dateOfBirth: new Date('1985-06-15')
        });

        await Admin.create({
            userId: adminUser._id,
            permissions: ['manage_students', 'manage_faculty', 'manage_timetable', 'manage_transport', 'manage_fees', 'manage_notices', 'view_reports', 'system_settings'],
            isSuperAdmin: true
        });
        console.log('✅ Admin created: admin / admin123\n');

        // Create Faculty Users
        console.log('👨‍🏫 Creating Faculty users...');
        // Use today's date for testing birthday feature
        const today = new Date();
        const facultyBirthday = new Date(1980, today.getMonth(), today.getDate()); // Same day/month as today
        const mainFacultyUser = await User.create({
            name: 'Dr. Robert Smith',
            username: 'faculty',
            password: 'faculty123',
            role: 'faculty',
            department: 'CSE',
            phone: '9876543211',
            status: 'active',
            dateOfBirth: facultyBirthday // Will have birthday today for testing!
        });

        await Faculty.create({
            userId: mainFacultyUser._id,
            employeeId: 'FAC000',
            designation: 'Professor',
            subjects: ['Data Structures', 'Algorithms'],
            // Note: subjectIds and classIds will be assigned by admin
            qualification: 'Ph.D in Computer Science',
            experience: 15
        });
        console.log('✅ Demo Faculty created: faculty / faculty123');

        // Create additional faculty
        const facultyData = [
            { name: 'Prof. Emily Davis', username: 'emily', department: 'CSE', designation: 'Associate Professor', subjects: ['Database Systems', 'Computer Networks'], employeeId: 'FAC002' },
            { name: 'Dr. Michael Lee', username: 'michael', department: 'CSE', designation: 'Assistant Professor', subjects: ['Operating Systems', 'Machine Learning'], employeeId: 'FAC003' },
        ];

        for (const fac of facultyData) {
            const user = await User.create({
                name: fac.name,
                username: fac.username,
                password: 'password123',
                role: 'faculty',
                department: fac.department,
                status: 'active',
                dateOfBirth: new Date(`1982-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`)
            });

            await Faculty.create({
                userId: user._id,
                employeeId: fac.employeeId,
                designation: fac.designation,
                subjects: fac.subjects,
                qualification: 'Ph.D',
                experience: Math.floor(Math.random() * 15) + 5
            });
        }
        console.log('✅ Created 2 additional faculty members\n');

        // Create Student Users
        console.log('🎓 Creating Student users...');
        const mainStudentUser = await User.create({
            name: 'John Doe',
            username: 'student',
            password: 'student123',
            role: 'student',
            department: 'CSE',
            phone: '9876543212',
            status: 'active',
            dateOfBirth: new Date('2003-03-20')
        });

        await Student.create({
            userId: mainStudentUser._id,
            rollNo: 'CS2021001',
            year: 3,
            section: 'A',
            course: 'B.Tech',
            semester: 5,
            guardianName: 'Richard Doe',
            guardianPhone: '9876543213',
            address: '123 Main Street, City',
            bloodGroup: 'O+'
        });
        console.log('✅ Demo Student created: student / student123');

        // Create a few more students
        const studentNames = ['Jane Smith', 'Mike Johnson'];
        for (let i = 0; i < studentNames.length; i++) {
            const user = await User.create({
                name: studentNames[i],
                username: `student${i + 2}`,
                password: 'password123',
                role: 'student',
                department: 'CSE',
                status: 'active',
                dateOfBirth: new Date(`2003-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`)
            });

            await Student.create({
                userId: user._id,
                rollNo: `CS202100${i + 2}`,
                year: 3,
                section: 'A',
                course: 'B.Tech',
                semester: 5,
                bloodGroup: ['A+', 'B+', 'O+'][i % 3]
            });
        }
        console.log('✅ Created 2 additional students\n');

        // Create Transport Routes
        console.log('🚌 Creating Transport routes...');
        await Transport.create({
            busNumber: 'BUS-001',
            routeName: 'City Center Route',
            driver: { name: 'Ramesh Kumar', phone: '9876543220', licenseNo: 'DL-001' },
            capacity: 40,
            stops: [
                { stopName: 'Railway Station', arrivalTime: '07:30', order: 1 },
                { stopName: 'Bus Stand', arrivalTime: '07:45', order: 2 },
                { stopName: 'College Gate', arrivalTime: '08:15', order: 3 }
            ],
            departureTime: '07:30',
            returnTime: '17:00',
            isActive: true
        });
        console.log('✅ Created 1 transport route\n');

        // Create Notices
        console.log('📢 Creating Notices...');
        await Notice.create({
            title: 'Welcome to Smart Campus',
            content: 'Welcome to the Smart Campus Management System. This is a demo notice.',
            postedBy: adminUser._id,
            createdBy: adminUser._id,
            createdByRole: 'admin',
            targetAudience: 'all',
            type: 'global',
            priority: 'medium'
        });
        console.log('✅ Created 1 notice\n');

        // Set seed lock
        await SystemSettings.setSetting('seedCompleted', true, 'Database initial seed completed', adminUser._id);
        await SystemSettings.setSetting('seedDate', new Date().toISOString(), 'Date when seed was completed');
        await SystemSettings.setSetting('seedVersion', '1.0.0', 'Seed script version');

        console.log('╔══════════════════════════════════════════════════════╗');
        console.log('║     🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!      ║');
        console.log('╠══════════════════════════════════════════════════════╣');
        console.log('║                                                      ║');
        console.log('║  📋 Login Credentials:                               ║');
        console.log('║  ┌─────────────┬─────────────────┬──────────────┐    ║');
        console.log('║  │ Role        │ Username        │ Password     │    ║');
        console.log('║  ├─────────────┼─────────────────┼──────────────┤    ║');
        console.log('║  │ Admin       │ admin           │ admin123     │    ║');
        console.log('║  │ Faculty     │ faculty         │ faculty123   │    ║');
        console.log('║  │ Student     │ student         │ student123   │    ║');
        console.log('║  └─────────────┴─────────────────┴──────────────┘    ║');
        console.log('║                                                      ║');
        console.log('║  🔒 SEED LOCK: Enabled                               ║');
        console.log('║  Future restarts will NOT modify this data.          ║');
        console.log('║                                                      ║');
        console.log('╚══════════════════════════════════════════════════════╝\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error seeding database:', error);
        process.exit(1);
    }
};

seedData();
