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

// Connect to database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartcampus');

const seedData = async () => {
    try {
        console.log('🌱 Starting database seed...');

        // Clear existing data
        await User.deleteMany({});
        await Student.deleteMany({});
        await Faculty.deleteMany({});
        await Admin.deleteMany({});
        await Notice.deleteMany({});
        await Timetable.deleteMany({});
        await Fee.deleteMany({});
        await Transport.deleteMany({});
        await Attendance.deleteMany({});
        console.log('✅ Cleared existing data');

        // Create Admin User
        const adminUser = await User.create({
            name: 'Super Admin',
            username: 'admin',
            password: 'admin123',
            role: 'admin',
            department: 'Administration',
            phone: '9876543210',
            status: 'active'
        });

        await Admin.create({
            userId: adminUser._id,
            permissions: ['manage_students', 'manage_faculty', 'manage_timetable', 'manage_transport', 'manage_fees', 'manage_notices', 'view_reports', 'system_settings'],
            isSuperAdmin: true
        });
        console.log('✅ Admin created: admin / admin123');

        // Create Faculty Users
        const facultyData = [
            { name: 'Dr. Robert Smith', username: 'robert', department: 'CSE', designation: 'Professor', subjects: ['Data Structures', 'Algorithms'], employeeId: 'FAC001' },
            { name: 'Prof. Emily Davis', username: 'emily', department: 'CSE', designation: 'Associate Professor', subjects: ['Database Systems', 'Computer Networks'], employeeId: 'FAC002' },
            { name: 'Dr. Michael Lee', username: 'michael', department: 'CSE', designation: 'Assistant Professor', subjects: ['Operating Systems', 'Machine Learning'], employeeId: 'FAC003' },
            { name: 'Prof. Sarah Johnson', username: 'sarah', department: 'ECE', designation: 'Professor', subjects: ['Electronics', 'Digital Circuits'], employeeId: 'FAC004' },
            { name: 'Dr. James Wilson', username: 'james', department: 'MECH', designation: 'Associate Professor', subjects: ['Thermodynamics', 'Mechanics'], employeeId: 'FAC005' },
        ];

        // Create main faculty user for demo
        const mainFacultyUser = await User.create({
            name: 'Dr. Robert Smith',
            username: 'faculty',
            password: 'faculty123',
            role: 'faculty',
            department: 'CSE',
            phone: '9876543211',
            status: 'active'
        });

        await Faculty.create({
            userId: mainFacultyUser._id,
            employeeId: 'FAC000',
            designation: 'Professor',
            subjects: ['Data Structures', 'Algorithms'],
            classes: ['CSE-3-A', 'CSE-3-B'],
            qualification: 'Ph.D in Computer Science',
            experience: 15
        });
        console.log('✅ Demo Faculty created: faculty / faculty123');

        // Create other faculty
        for (const fac of facultyData) {
            const user = await User.create({
                name: fac.name,
                username: fac.username,
                password: 'password123',
                role: 'faculty',
                department: fac.department,
                status: 'active'
            });

            await Faculty.create({
                userId: user._id,
                employeeId: fac.employeeId,
                designation: fac.designation,
                subjects: fac.subjects,
                classes: [],
                qualification: 'Ph.D',
                experience: Math.floor(Math.random() * 15) + 5
            });
        }
        console.log('✅ Created 5 additional faculty members');

        // Create Student Users
        const sections = ['A', 'B', 'C'];
        const years = [1, 2, 3, 4];
        const studentNames = [
            'John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Williams', 'Chris Brown',
            'Emily Davis', 'David Wilson', 'Lisa Anderson', 'Mark Taylor', 'Amy Thomas',
            'Kevin Martinez', 'Jessica Garcia', 'Brian Lee', 'Michelle Robinson', 'Steven Clark'
        ];

        // Create main student user for demo
        const mainStudentUser = await User.create({
            name: 'John Doe',
            username: 'student',
            password: 'student123',
            role: 'student',
            department: 'CSE',
            phone: '9876543212',
            status: 'active'
        });

        const mainStudent = await Student.create({
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

        // Create other students
        const students = [];
        let rollCounter = 2;
        for (let year = 1; year <= 4; year++) {
            for (const section of sections) {
                for (let i = 0; i < 10; i++) {
                    const name = studentNames[Math.floor(Math.random() * studentNames.length)] + ' ' + rollCounter;
                    const user = await User.create({
                        name: name,
                        username: `student${rollCounter}`,
                        password: 'password123',
                        role: 'student',
                        department: 'CSE',
                        status: 'active'
                    });

                    const student = await Student.create({
                        userId: user._id,
                        rollNo: `CS202${year}${section}${String(rollCounter).padStart(3, '0')}`,
                        year: year,
                        section: section,
                        course: 'B.Tech',
                        semester: year * 2 - 1,
                        guardianName: `Guardian ${rollCounter}`,
                        guardianPhone: `98765${String(rollCounter).padStart(5, '0')}`,
                        bloodGroup: ['A+', 'B+', 'O+', 'AB+'][Math.floor(Math.random() * 4)]
                    });
                    students.push(student);
                    rollCounter++;
                }
            }
        }
        console.log(`✅ Created ${students.length} additional students`);

        // Create Transport Routes
        const transportRoutes = [
            {
                busNumber: 'BUS-001',
                routeName: 'City Center Route',
                driver: { name: 'Ramesh Kumar', phone: '9876543220', licenseNo: 'DL-001' },
                capacity: 40,
                stops: [
                    { stopName: 'Railway Station', arrivalTime: '07:30', order: 1 },
                    { stopName: 'Bus Stand', arrivalTime: '07:45', order: 2 },
                    { stopName: 'Market', arrivalTime: '08:00', order: 3 },
                    { stopName: 'College Gate', arrivalTime: '08:15', order: 4 }
                ],
                departureTime: '07:30',
                returnTime: '17:00',
                isActive: true
            },
            {
                busNumber: 'BUS-002',
                routeName: 'Suburb Route',
                driver: { name: 'Suresh Singh', phone: '9876543221', licenseNo: 'DL-002' },
                capacity: 50,
                stops: [
                    { stopName: 'Township', arrivalTime: '07:00', order: 1 },
                    { stopName: 'Mall', arrivalTime: '07:20', order: 2 },
                    { stopName: 'Hospital', arrivalTime: '07:40', order: 3 },
                    { stopName: 'College Gate', arrivalTime: '08:00', order: 4 }
                ],
                departureTime: '07:00',
                returnTime: '17:30',
                isActive: true
            },
            {
                busNumber: 'BUS-003',
                routeName: 'Highway Route',
                driver: { name: 'Mahesh Verma', phone: '9876543222', licenseNo: 'DL-003' },
                capacity: 45,
                stops: [
                    { stopName: 'Highway Junction', arrivalTime: '07:45', order: 1 },
                    { stopName: 'Tech Park', arrivalTime: '08:00', order: 2 },
                    { stopName: 'College Gate', arrivalTime: '08:20', order: 3 }
                ],
                departureTime: '07:45',
                returnTime: '17:15',
                isActive: true
            },
        ];

        for (const route of transportRoutes) {
            await Transport.create(route);
        }
        console.log('✅ Created 3 transport routes');

        // Create Timetable entries
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const subjects = ['Data Structures', 'Algorithms', 'Database Systems', 'Operating Systems', 'Computer Networks', 'Machine Learning'];
        const rooms = ['CS-101', 'CS-102', 'CS-103', 'CS-104', 'Lab-1', 'Lab-2'];

        for (const day of days) {
            const slots = [];
            for (let period = 1; period <= 6; period++) {
                slots.push({
                    startTime: `${8 + period}:00`,
                    endTime: `${9 + period}:00`,
                    subject: subjects[period - 1],
                    room: rooms[period - 1],
                    type: period >= 5 ? 'lab' : 'lecture'
                });
            }

            await Timetable.create({
                day: day,
                department: 'CSE',
                year: 3,
                section: 'A',
                slots: slots
            });
        }
        console.log('✅ Created timetable entries');

        // Create Notices
        const notices = [
            { title: 'Mid-term Exam Schedule', content: 'Mid-term exams will be conducted from 15th to 20th January. Please check the detailed schedule on the notice board.', type: 'global', priority: 'high', targetAudience: 'students' },
            { title: 'Republic Day Holiday', content: 'College will remain closed on 26th January for Republic Day celebrations.', type: 'global', priority: 'medium', targetAudience: 'all' },
            { title: 'Fee Payment Reminder', content: 'Last date for fee payment is 31st January. Late fee will be applicable after the deadline.', type: 'global', priority: 'high', targetAudience: 'students' },
            { title: 'Faculty Meeting', content: 'All faculty members are requested to attend the monthly faculty meeting on 10th January at 3 PM.', type: 'department', priority: 'medium', targetAudience: 'faculty' },
            { title: 'Sports Day Event', content: 'Annual Sports Day will be held on 5th February. Interested students can register through the sports department.', type: 'global', priority: 'medium', targetAudience: 'all' },
        ];

        for (const notice of notices) {
            await Notice.create({
                ...notice,
                postedBy: adminUser._id
            });
        }
        console.log('✅ Created 5 notices');

        // Create Fee Records
        const feeTypes = ['tuition', 'hostel', 'transport', 'library', 'lab'];
        const feeAmounts = { tuition: 75000, hostel: 25000, transport: 5000, library: 2000, lab: 5000 };
        const statuses = ['paid', 'pending', 'overdue'];

        for (let i = 0; i < 20; i++) {
            const student = students[Math.floor(Math.random() * students.length)] || mainStudent;
            const feeType = feeTypes[Math.floor(Math.random() * feeTypes.length)];

            await Fee.create({
                studentId: student._id,
                amount: feeAmounts[feeType],
                feeType: feeType,
                semester: student.semester,
                academicYear: '2024-25',
                dueDate: new Date(Date.now() + (Math.random() * 30 - 15) * 24 * 60 * 60 * 1000),
                status: statuses[Math.floor(Math.random() * statuses.length)],
                paidDate: Math.random() > 0.5 ? new Date() : null
            });
        }
        console.log('✅ Created 20 fee records');

        console.log('\n🎉 Database seeding completed successfully!');
        console.log('\n📋 Login Credentials:');
        console.log('┌─────────────┬─────────────────────┬─────────────┐');
        console.log('│ Role        │ Username            │ Password    │');
        console.log('├─────────────┼─────────────────────┼─────────────┤');
        console.log('│ Admin       │ admin               │ admin123    │');
        console.log('│ Faculty     │ faculty             │ faculty123  │');
        console.log('│ Student     │ student             │ student123  │');
        console.log('└─────────────┴─────────────────────┴─────────────┘');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};

seedData();
