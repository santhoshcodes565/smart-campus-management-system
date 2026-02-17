---
description: How to use and test the AI Chatbot
---

# AI Chatbot Workflow

## Prerequisites

1. **Backend running** on port 5000
2. **Frontend running** on port 3000
3. **OpenAI API key** configured in `.env`

---

## Starting the Chatbot

// turbo
1. Start backend:
```bash
cd c:\Users\sathv\Downloads\campus\campus\backend
npm start
```

// turbo
2. Start frontend:
```bash
cd c:\Users\sathv\Downloads\campus\campus\smartmanagement
npm start
```

3. Open browser at http://localhost:3000

---

## Testing the Chatbot API

// turbo
1. Login and get token:
```powershell
$login = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"username":"admin","password":"admin123"}'
$token = $login.token
```

// turbo
2. Test chatbot with a message:
```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/chat" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{"message":"hello"}'
$response | ConvertTo-Json
```

---

## Test Queries by Role

### Student Queries
- "my attendance" → Shows subject-wise attendance
- "my marks" → Shows published marks
- "today timetable" → Today's schedule
- "pending fees" → Fee status
- "exam dates" → Upcoming exams

### Faculty Queries
- "my timetable" → Teaching schedule
- "class attendance" → Students attendance
- "announcements" → Recent notices

### Admin Queries
- "department analytics" → System stats
- "announcements" → All notices

---

## Domain Control Test

Test that non-campus queries are rejected:
- "who won the cricket match" → Should return "I can assist only with Smart Campus related queries"
- "tell me about politics" → Should be rejected

---

## Architecture Flow

```
User Message
    ↓
Domain Check (isCampusQuery)
    ↓ No → "Campus only" response
    ↓ Yes
Intent Detection (detectIntent)
    ↓
Authorization Check (authorize)
    ↓ No → "Access denied" response
    ↓ Yes
Data Retrieval (retrievalService)
    ↓
OpenAI Response (openaiService)
    ↓
Return to User
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `services/ChatbotServiceV2.js` | Main orchestrator |
| `services/openaiService.js` | OpenAI integration |
| `services/intentService.js` | Intent detection |
| `services/authorizationService.js` | Role-based access |
| `services/retrievalService.js` | MongoDB queries |
| `controllers/chatController.js` | API handler |
| `routes/chatRoutes.js` | Chat endpoints |
