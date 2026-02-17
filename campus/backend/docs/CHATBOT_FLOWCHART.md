# AI Chatbot Architecture Flowchart

## Complete System Flow

```mermaid
flowchart TD
    subgraph Frontend["🖥️ Frontend (React)"]
        A[User Types Message] --> B[ChatbotWidget.js]
        B --> C[POST /api/chat]
    end

    subgraph Auth["🔐 Authentication Layer"]
        C --> D{JWT Token Valid?}
        D -->|No| E[401 Unauthorized]
        D -->|Yes| F[Extract userId & role]
    end

    subgraph Intent["🎯 Intent Service"]
        F --> G[chatController.js]
        G --> H[ChatbotServiceV2.js]
        H --> I{Campus Query?}
        I -->|No| J["❌ Out of Scope Response"]
        I -->|Yes| K[detectIntent]
        K --> L[Intent + Entities]
    end

    subgraph Authorization["🛡️ Authorization Service"]
        L --> M{Role Authorized?}
        M -->|No| N["🚫 Access Denied"]
        M -->|Yes| O[Proceed to Retrieval]
    end

    subgraph Retrieval["📊 Data Retrieval Service"]
        O --> P{Intent Type}
        P -->|attendance| Q[getStudentAttendance]
        P -->|marks| R[getStudentMarks]
        P -->|timetable| S[getTodayTimetable]
        P -->|fees| T[getFeeStatus]
        P -->|exams| U[getUpcomingExams]
        P -->|analytics| V[getDepartmentAnalytics]
        Q & R & S & T & U & V --> W[MongoDB Query]
        W --> X[Live Campus Data]
    end

    subgraph AI["🤖 OpenAI Service"]
        X --> Y{OpenAI Configured?}
        Y -->|No| Z[Fallback Response]
        Y -->|Yes| AA[Build Context]
        AA --> AB[OpenRouter API Call]
        AB --> AC[AI Generated Response]
        AC --> AD{Response Valid?}
        AD -->|No| Z
        AD -->|Yes| AE[Final Response]
        Z --> AE
    end

    subgraph Response["📤 Response"]
        J --> AF[Return to Frontend]
        N --> AF
        AE --> AF
        AF --> AG[Display in Chat Widget]
    end

    style Frontend fill:#e1f5fe
    style Auth fill:#fff3e0
    style Intent fill:#e8f5e9
    style Authorization fill:#fce4ec
    style Retrieval fill:#f3e5f5
    style AI fill:#e8eaf6
    style Response fill:#e0f2f1
```

---

## Role-Based Access Flow

```mermaid
flowchart LR
    subgraph Roles["User Roles"]
        S[Student]
        F[Faculty]
        A[Admin]
    end

    subgraph StudentAccess["Student Access"]
        S --> S1[Own Attendance ✅]
        S --> S2[Own Marks ✅]
        S --> S3[Own Timetable ✅]
        S --> S4[Own Fees ✅]
        S --> S5[Analytics ❌]
    end

    subgraph FacultyAccess["Faculty Access"]
        F --> F1[Class Attendance ✅]
        F --> F2[Class Marks ✅]
        F --> F3[Own Timetable ✅]
        F --> F4[Fees ❌]
        F --> F5[Class Analytics ✅]
    end

    subgraph AdminAccess["Admin Access"]
        A --> A1[All Attendance ✅]
        A --> A2[All Marks ✅]
        A --> A3[All Timetables ✅]
        A --> A4[All Fees ✅]
        A --> A5[Full Analytics ✅]
    end

    style StudentAccess fill:#e3f2fd
    style FacultyAccess fill:#fff8e1
    style AdminAccess fill:#fce4ec
```

---

## Intent Detection Flow

```mermaid
flowchart TD
    A[User Message] --> B[Normalize to lowercase]
    B --> C{Check Non-Campus Keywords}
    C -->|Found: cricket, politics, movie| D[Reject: Out of Scope]
    C -->|Not Found| E{Check Campus Keywords}
    E -->|Found| F[Match Intent Patterns]
    E -->|Not Found| G[Check Message Length]
    G -->|<20 chars| F
    G -->|>20 chars| D
    
    F --> H{Pattern Match}
    H -->|attendance| I[my_attendance]
    H -->|marks/grades| J[my_marks]
    H -->|timetable/schedule| K[today_timetable]
    H -->|fees/payment| L[my_fees]
    H -->|exam/test| M[exam_dates]
    H -->|hello/hi/hey| N[greeting]
    H -->|help| O[help]
    H -->|No Match| P[general]

    style D fill:#ffcdd2
    style I fill:#c8e6c9
    style J fill:#c8e6c9
    style K fill:#c8e6c9
    style L fill:#c8e6c9
    style M fill:#c8e6c9
```

---

## Files Structure

```
backend/
├── services/
│   ├── ChatbotServiceV2.js    ← Main Orchestrator
│   ├── openaiService.js       ← OpenAI/OpenRouter Integration
│   ├── intentService.js       ← Intent Detection
│   ├── authorizationService.js ← Role-Based Access Control
│   └── retrievalService.js    ← MongoDB Data Retrieval
├── controllers/
│   └── chatController.js      ← API Handler
└── routes/
    └── chatRoutes.js          ← POST /api/chat
```
