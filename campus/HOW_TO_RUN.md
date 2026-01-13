# Smart Campus Management System - How to Run

## Prerequisites
- Node.js (v16 or higher recommended)
- npm (Node Package Manager)
- MongoDB connection (configured in backend `.env` file)

---

## Project Structure
```
campus/
├── backend/          # Node.js/Express API server
│   ├── server.js     # Main server file
│   ├── package.json  # Backend dependencies
│   └── ...
├── smartmanagement/  # React frontend application
│   ├── src/          # React source code
│   ├── package.json  # Frontend dependencies
│   └── ...
└── HOW_TO_RUN.md     # This file
```

---

## Step 1: Install Dependencies

### Backend Dependencies
```bash
cd campus/backend
npm install
```

### Frontend Dependencies
```bash
cd campus/smartmanagement
npm install
```

---

## Step 2: Start the Application

### Option A: Run Both Servers (Recommended)

Open **two separate terminals**:

**Terminal 1 - Start Backend Server:**
```bash
cd campus/backend
npm start
```
- Backend runs on: `http://localhost:5000`

**Terminal 2 - Start Frontend Server:**
```bash
cd campus/smartmanagement
npm start
```
- Frontend runs on: `http://localhost:3000`

---

### Option B: Run Backend in Development Mode (with auto-reload)
```bash
cd campus/backend
npm run dev
```
*Requires nodemon (already in devDependencies)*

---

## Step 3: Access the Application

Once both servers are running:
- Open your browser and go to: **http://localhost:3000**

---

## Available Scripts

### Backend (`campus/backend/`)
| Command | Description |
|---------|-------------|
| `npm start` | Start the production server |
| `npm run dev` | Start with nodemon (auto-reload on changes) |
| `npm run seed` | Seed the database with initial data |

### Frontend (`campus/smartmanagement/`)
| Command | Description |
|---------|-------------|
| `npm start` | Start development server |
| `npm run build` | Build for production |
| `npm test` | Run tests |

---

## Ports Used
| Service | Port | URL |
|---------|------|-----|
| Backend API | 5000 | http://localhost:5000 |
| Frontend React | 3000 | http://localhost:3000 |

---

## Troubleshooting

### Port Already in Use
If you see "port already in use" error:
```bash
# Windows - Kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Windows - Kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### MongoDB Connection Issues
- Ensure your MongoDB URI is correctly set in `backend/.env`
- Check if MongoDB Atlas IP whitelist includes your current IP

### Missing Dependencies
```bash
# In the respective directory
npm install
```

---

## Quick Start (Copy-Paste Commands)

```bash
# Open Terminal 1
cd campus/backend
npm install
npm start

# Open Terminal 2
cd campus/smartmanagement
npm install
npm start
```

Then open **http://localhost:3000** in your browser!
