# Smart Campus Management System 🎓

A comprehensive, real-time college management system built with the MERN stack featuring role-based dashboards for Admins, Faculty, and Students.

## 🚀 Tech Stack

### Frontend
- **React.js** - UI Library
- **Tailwind CSS** - Styling
- **React Router v6** - Routing
- **Context API** - State Management
- **Recharts** - Charts & Analytics
- **Socket.io-client** - Real-time updates
- **React Toastify** - Toast notifications
- **React Icons** - Icon library

### Backend
- **Node.js** - Runtime
- **Express.js** - Framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Socket.io** - Real-time communication
- **bcryptjs** - Password hashing

## 📁 Project Structure

```
campus/
├── backend/                 # Backend API
│   ├── config/             # Database configuration
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Auth & error middleware
│   ├── models/             # Mongoose models
│   ├── routes/             # API routes
│   ├── utils/              # Helper utilities
│   ├── seed.js             # Database seeder
│   └── server.js           # Entry point
│
└── smartmanagement/        # Frontend React App
    ├── public/             # Static files
    └── src/
        ├── components/     # Reusable components
        │   ├── auth/       # Authentication components
        │   ├── common/     # Common UI components
        │   └── layout/     # Layout components
        ├── context/        # React Context providers
        ├── pages/          # Page components
        │   ├── admin/      # Admin dashboard pages
        │   ├── faculty/    # Faculty dashboard pages
        │   └── student/    # Student dashboard pages
        ├── services/       # API service layer
        └── App.js          # Main application
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js v16+
- MongoDB (local or Atlas)
- npm or yarn

### Step 1: Clone & Install Backend

```bash
cd campus/backend
npm install
```

### Step 2: Configure Environment Variables

Create `.env` file in the backend folder:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smartcampus
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d
NODE_ENV=development
```

### Step 3: Seed the Database

```bash
npm run seed
# or
node seed.js
```

This will create demo users with the following credentials:

| Role    | Email               | Password    |
|---------|---------------------|-------------|
| Admin   | admin@campus.edu    | admin123    |
| Faculty | faculty@campus.edu  | faculty123  |
| Student | student@campus.edu  | student123  |

### Step 4: Start Backend Server

```bash
npm run dev
# Server runs on http://localhost:5000
```

### Step 5: Install Frontend

```bash
cd ../smartmanagement
npm install --legacy-peer-deps
```

### Step 6: Start Frontend

```bash
npm start
# App runs on http://localhost:3000
```

## 📋 Features

### 🔐 Authentication
- JWT-based authentication
- Role-based access control (Admin/Faculty/Student)
- Protected routes
- Secure password hashing

### 👨‍💼 Admin Dashboard
- **Dashboard Overview** - Stats, charts, quick actions
- **Manage Students** - CRUD operations, activate/deactivate
- **Manage Faculty** - CRUD operations, assign subjects
- **Timetable Management** - Create/edit class schedules
- **Fee Management** - Track payments, generate reports
- **Transport Management** - Manage bus routes
- **Global Notices** - Post announcements (real-time)
- **Reports & Analytics** - Attendance, fees, performance charts

### 👨‍🏫 Faculty Dashboard
- **Dashboard Overview** - Today's classes, pending tasks
- **Mark Attendance** - Real-time attendance marking
- **Upload Marks** - Enter student grades
- **Student List** - View enrolled students
- **Timetable** - View teaching schedule
- **Leave Requests** - Approve/reject student leaves
- **Post Notice** - Class announcements

### 👨‍🎓 Student Dashboard
- **Dashboard Overview** - Attendance, CGPA, schedule
- **View Attendance** - Subject-wise stats & charts
- **View Marks** - Exam results & performance
- **Timetable** - Daily & weekly schedule
- **Fee Details** - Payment status
- **Transport** - Bus route info
- **Apply Leave** - Submit leave applications

### 🔔 Real-time Features
- Live notification updates via Socket.io
- Instant attendance sync
- Real-time notice broadcasting
- Timetable change alerts

## 🎨 UI Components

The application includes these reusable components:

- **Sidebar** - Role-based navigation
- **Navbar** - Search, notifications, profile dropdown
- **StatCard** - Dashboard statistics
- **Modal** - Dialogs and forms
- **DataTable** - Paginated data tables
- **Breadcrumb** - Navigation breadcrumbs
- **EmptyState** - Empty data placeholders
- **LoadingSpinner** - Loading states
- **Skeleton** - Loading skeletons
- **Pagination** - Table pagination

## 📡 API Endpoints

### Authentication
```
POST /api/auth/login       - User login
POST /api/auth/logout      - User logout
GET  /api/auth/me          - Get current user
```

### Admin
```
GET    /api/admin/dashboard     - Dashboard stats
GET    /api/admin/students      - List all students
POST   /api/admin/students      - Create student
PUT    /api/admin/students/:id  - Update student
DELETE /api/admin/students/:id  - Delete student
... (similar for faculty, fees, transport, notices)
```

### Faculty
```
GET  /api/faculty/dashboard    - Dashboard data
GET  /api/faculty/classes      - Get assigned classes
POST /api/faculty/attendance   - Mark attendance
POST /api/faculty/marks        - Upload marks
```

### Student
```
GET  /api/student/dashboard    - Dashboard data
GET  /api/student/attendance   - View attendance
GET  /api/student/marks        - View marks
POST /api/student/leave        - Apply for leave
```

## 🔧 Development

### Running in Development Mode

Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

Terminal 2 - Frontend:
```bash
cd smartmanagement
npm start
```

### Building for Production

```bash
cd smartmanagement
npm run build
```

## 📄 License

This project is for educational purposes.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

Built with ❤️ for Smart Campus Management
