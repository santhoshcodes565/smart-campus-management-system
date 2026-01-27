# Smart Campus Management System - End-to-End Flow Validation

## System Description
The **Smart Campus Management System** is a role-based ERP solution designed for university administration. It features a strict segregation of duties between **Admin**, **Faculty**, and **Student** roles. The system manages user lifecycles, faculty attendance tracking with smart analytics, and a comprehensive non-payment fee accounting ledger. It relies on a microservice-like backend architecture communicating with a MongoDB cluster.

## System Flow Diagram

```mermaid
flowchart LR
    %% ==========================================
    %% 1. SYSTEM ENTRY & AUTHENTICATION
    %% ==========================================
    subgraph Entry [Entry & Security]
        direction TB
        Landing[Landing Page] --> Login[Login Page]
        Login --> |Credentials| Auth[Auth Validation]
        
        Auth -- Success --> RoleCheck{Role Detection}
        RoleCheck -- Admin --> AdminDash[Admin Dashboard]
        RoleCheck -- Student --> StuDash[Student Dashboard]
        RoleCheck -- Faculty --> FacDash[Faculty Dashboard]
        
        Logout((Logout Action)) --> |Clear Session| Login
    end

    %% ==========================================
    %% 2. ADMIN MODULE
    %% ==========================================
    subgraph AdminMod [ADMIN MODULE]
        direction TB
        
        %% User Management Branch
        AdminDash --> UM_Menu[User Management]
        UM_Menu --> UM_AddS[Add Student]
        UM_Menu --> UM_AddF[Add Faculty]
        UM_Menu --> UM_View[View/Edit Users]
        
        UM_AddS --> |Enter DOB & Save| Svc_User
        UM_AddF --> |Enter DOB & Save| Svc_User
        
        %% Birthday Intelligence Branch
        AdminDash --> BD_Widget[Birthday Widget]
        BD_Widget --> |Fetch Today's| Svc_Bday
        BD_Widget --> |Display Global Msg| AdminDash
        
        %% Faculty Attendance Branch
        AdminDash --> FA_Dash[Faculty Attendance System]
        FA_Dash --> FA_View[View Today's Status]
        FA_Dash --> FA_Hist[View History]
        FA_Dash --> FA_Smart[Smart Analyzer]
        
        FA_View --> |Checked-In/Out/Absent| Svc_Attend
        FA_Smart --> |Early Output/Freq Absent| Svc_Attend
        
        %% Fees Management Branch
        AdminDash --> FM_Dash[Fees Management]
        FM_Dash --> FM_Struct[Fee Structures]
        FM_Dash --> FM_Ledger[Student Fee Ledger]
        FM_Dash --> FM_Rcpt[Receipt Management]
        FM_Dash --> FM_Rep[Reports]
        
        FM_Struct --> |Create/Lock| Svc_Fee
        FM_Ledger --> |Assign/View| Svc_Fee
        FM_Rcpt --> |Manual Entry/Reversal| Svc_Fee
        FM_Rep --> |Aging/Defaulters| Svc_Fee
        
        %% Admin Return Paths
        UM_View --> AdminDash
        FA_Hist --> AdminDash
    end

    %% ==========================================
    %% 3. STUDENT MODULE
    %% ==========================================
    subgraph StudentMod [STUDENT MODULE]
        direction TB
        
        %% Birthday
        StuDash --> SB_Disp[Birthday Display]
        SB_Disp --> |Check Personal/Global| Svc_Bday
        
        %% Fees
        StuDash --> SF_View[Fees View]
        SF_View --> |View Ledger| Svc_Fee
        SF_View --> |Download Stmt| Svc_Fee
        
        %% Profile
        StuDash --> SP_View[Profile View]
        SP_View --> |Read Details| Svc_User
        
        SP_View -- DOB Read-Only --> SP_View
    end

    %% ==========================================
    %% 4. FACULTY MODULE
    %% ==========================================
    subgraph FacultyMod [FACULTY MODULE]
        direction TB
        
        %% Check-In/Out
        FacDash --> FC_IO[Check-In / Check-Out]
        FC_IO --> |Click Check-In| Svc_Attend
        FC_IO --> |Click Check-Out| Svc_Attend
        
        %% Attendance View
        FacDash --> FV_View[Attendance Status]
        FV_View --> |View History| Svc_Attend
        
        %% Birthday
        FacDash --> FB_Disp[Birthday Display]
        FB_Disp --> Svc_Bday
    end

    %% ==========================================
    %% 5. BACKEND SERVICES
    %% ==========================================
    subgraph Backend [BACKEND SERVICES]
        direction TB
        
        Svc_User[User Service]
        Svc_Bday[Birthday Intelligence Service]
        Svc_Attend[Attendance Service]
        Svc_Fee[Fee Accounting Service]
        Svc_Audit[Audit Logging Service]
        
        %% Logic Processing Note
        Svc_User --- |Process Logic| Svc_User
        Svc_Attend --- |Calc Work Hours| Svc_Attend
    end

    %% ==========================================
    %% 6. DATABASE LAYER
    %% ==========================================
    subgraph Database [MONGODB CLUSTER]
        direction TB
        DB_Users[("Users Collection
        (Auth, Profile, DOB)")]
        
        DB_Attend[("FacultyAttendance
        (Timestamps, DailyStatus)")]
        
        DB_FeeStruct[("FeeStructure
        (Tuition, Lab, Term)")]
        
        DB_FeeLedger[("StudentFeeLedger
        (Debits, Credits, Bal)")]
        
        DB_Rcpt[("FeeReceipt
        (Payments, Reversals)")]
        
        DB_Audit[("FeeAuditLog
        (Transactions, user_id)")]
    end

    %% ==========================================
    %% 7. CONNECTIONS: SERVICE TO DB
    %% ==========================================
    
    %% User & Birthday flows
    Svc_User <--> DB_Users
    Svc_Bday <--> |Read DOB| DB_Users
    
    %% Attendance flows
    Svc_Attend <--> DB_Attend
    
    %% Fee flows
    Svc_Fee <--> DB_FeeStruct
    Svc_Fee <--> DB_FeeLedger
    Svc_Fee <--> DB_Rcpt
    
    %% Audit Logic
    Svc_Fee -- Log Event --> Svc_Audit
    Svc_Audit --> DB_Audit

    %% ==========================================
    %% 8. LOGOUT LOOPS
    %% ==========================================
    AdminDash -.-> |Click Logout| Logout
    StuDash -.-> |Click Logout| Logout
    FacDash -.-> |Click Logout| Logout

```
