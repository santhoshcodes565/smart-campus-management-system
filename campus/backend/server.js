const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:3000', 'http://localhost:3001'],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Make io accessible to routes
app.set('io', io);

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
}));

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join room based on user role
    socket.on('join-room', (room) => {
        socket.join(room);
        console.log(`User ${socket.id} joined room: ${room}`);
    });

    // Handle posting notices
    socket.on('post-notice', (data) => {
        console.log('Notice posted:', data);
        // Broadcast to appropriate rooms based on target audience
        if (data.targetAudience === 'all') {
            io.emit('new-notice', data);
        } else if (data.targetAudience === 'students') {
            io.to('student').emit('new-notice', data);
        } else if (data.targetAudience === 'faculty') {
            io.to('faculty').emit('new-notice', data);
        }
    });

    // Handle attendance updates
    socket.on('attendance-marked', (data) => {
        console.log('Attendance marked:', data);
        io.to('student').emit('attendance-update', {
            message: `Attendance marked for ${data.date}`,
            ...data
        });
    });

    // Handle timetable updates
    socket.on('timetable-update', (data) => {
        console.log('Timetable updated:', data);
        io.to('student').to('faculty').emit('timetable-update', data);
    });

    // Handle fee updates
    socket.on('fee-update', (data) => {
        console.log('Fee updated:', data);
        if (data.studentId) {
            io.to(`student-${data.studentId}`).emit('fee-update', data);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/student', require('./routes/studentRoutes'));
app.use('/api/faculty', require('./routes/facultyRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/birthdays', require('./routes/birthdayRoutes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Smart Campus API is running',
        timestamp: new Date().toISOString(),
        socketConnections: io.engine.clientsCount
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to Smart Campus Management System API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            student: '/api/student',
            faculty: '/api/faculty',
            admin: '/api/admin',
            health: '/api/health'
        }
    });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════════════════╗
    ║     Smart Campus Management System - Backend API     ║
    ╠══════════════════════════════════════════════════════╣
    ║  Server running on: http://localhost:${PORT}            ║
    ║  Environment: ${process.env.NODE_ENV || 'development'}                           ║
    ║  Socket.io: Enabled                                  ║
    ║                                                      ║
    ║  API Endpoints:                                      ║
    ║    - Auth:    /api/auth                              ║
    ║    - Student: /api/student                           ║
    ║    - Faculty: /api/faculty                           ║
    ║    - Admin:   /api/admin                             ║
    ╚══════════════════════════════════════════════════════╝
    `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.log('UNHANDLED REJECTION! Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
});
