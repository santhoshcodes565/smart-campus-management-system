# Smart Campus Backend API Documentation

Complete REST API documentation for the Smart Campus Management System backend.

## Quick Start

```bash
cd backend
npm install
npm run dev    # Development server with nodemon
npm start      # Production mode
```

## Prerequisites

- **Node.js** v16+
- **MongoDB** running locally on `mongodb://localhost:27017` OR use MongoDB Atlas

## Test Credentials

After running `node seed.js`:

| Role | Email | Password | Redirect |
|------|-------|----------|----------|
| Admin | admin@campus.edu | admin123 | /admin/dashboard |
| Faculty | faculty@campus.edu | faculty123 | /faculty/dashboard |
| Student | student@campus.edu | student123 | /student/dashboard |

---

## API Endpoints

### Authentication

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/login` | Public | Login with email/password |
| POST | `/api/auth/logout` | Protected | Logout |
| GET | `/api/auth/me` | Protected | Get current user profile |

**Login Request:**
```json
POST /api/auth/login
{
  "email": "student@campus.edu",
  "password": "student123"
}
```

**Login Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "...",
    "name": "Rahul Sharma",
    "email": "student@campus.edu",
    "role": "student"
  },
  "redirectUrl": "/student/dashboard"
}
```

---

### Student APIs (Role: student)

All requests require: `Authorization: Bearer <token>`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/student/profile` | View profile |
| GET | `/api/student/timetable` | View timetable |
| GET | `/api/student/attendance` | View attendance |
| GET | `/api/student/marks` | View marks |
| GET | `/api/student/fees` | View fee details |
| GET | `/api/student/transport` | View bus details |
| GET | `/api/student/notices` | View notices |
| POST | `/api/student/leave` | Apply for leave |
| GET | `/api/student/leave` | View leave requests |

---

### Faculty APIs (Role: faculty)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/faculty/profile` | View profile |
| GET | `/api/faculty/students` | View students list |
| POST | `/api/faculty/attendance` | Mark attendance |
| POST | `/api/faculty/marks` | Upload marks |
| GET | `/api/faculty/leave` | View pending leaves |
| PUT | `/api/faculty/leave/:id` | Approve/reject leave |
| POST | `/api/faculty/notices` | Post notice |
| GET | `/api/faculty/timetable` | View timetable |

**Mark Attendance Request:**
```json
POST /api/faculty/attendance
{
  "date": "2026-01-05",
  "subject": "Data Structures",
  "records": [
    { "studentId": "...", "status": "present" },
    { "studentId": "...", "status": "absent" }
  ]
}
```

---

### Admin APIs (Role: admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST/GET | `/api/admin/students` | Create/List students |
| PUT/DELETE | `/api/admin/students/:id` | Update/Delete student |
| POST/GET | `/api/admin/faculty` | Create/List faculty |
| PUT/DELETE | `/api/admin/faculty/:id` | Update/Delete faculty |
| POST/GET | `/api/admin/timetable` | Manage timetables |
| CRUD | `/api/admin/transport` | Manage transport |
| CRUD | `/api/admin/fees` | Manage fees |
| POST/GET/DELETE | `/api/admin/notices` | Manage notices |
| GET | `/api/admin/reports` | Dashboard analytics |

**Create Student Request:**
```json
POST /api/admin/students
{
  "name": "New Student",
  "email": "newstudent@campus.edu",
  "password": "password123",
  "department": "Computer Science",
  "phone": "9876543210",
  "rollNo": "CS2024002",
  "year": 1,
  "section": "A",
  "course": "B.Tech Computer Science"
}
```

---

## Error Responses

```json
{
  "success": false,
  "error": "Error message here",
  "statusCode": 400
}
```

| Code | Description |
|------|-------------|
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (role not allowed) |
| 404 | Not Found |
| 500 | Server Error |

---

## Environment Variables (.env)

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smartcampus
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
NODE_ENV=development
```

## Folder Structure

```
backend/
├── config/db.js          # MongoDB connection
├── controllers/          # Business logic
├── middleware/           # Auth, role, error handlers
├── models/               # Mongoose schemas (11 models)
├── routes/               # API route definitions
├── utils/                # Helper functions
├── server.js             # Entry point
├── seed.js               # Sample data script
└── .env                  # Configuration
```
