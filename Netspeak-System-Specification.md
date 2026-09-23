# Netspeak Portal — System Specification

## 1. System Overview

**System Name:** Netspeak Portal  
**System Type:** Centralized Operations Management System  
**Primary Technology Stack:**
- **Frontend / Full-stack Framework:** Next.js
- **Programming Language:** TypeScript
- **Runtime:** Node.js
- **Database / Backend Services:** Supabase
- **Database:** PostgreSQL through Supabase
- **Authentication:** Custom application authentication using Node.js/Next.js and Gmail SMTP for email-based account verification, credential delivery, password reset, and system notifications
- **File Storage:** Supabase Storage
- **Application Architecture:** Next.js App Router with server-side APIs/actions and client-side interactive modules

### Main Objective

The Netspeak Portal will centralize Admin, IT, Teacher, Recruitment, and Operations processes into one system. The system should minimize manual encoding and the need to consolidate information from multiple Google Forms and Google Sheets.

Information should be entered once and automatically synchronize with related attendance, scheduling, monitoring, notification, workflow, and reporting modules.

The core synchronization principle is:

> **One source of truth → automatic synchronization → real-time operational visibility → consolidated reporting**

The requirements below are based on the supplied **System Requirement Specification & Feature Map: Netspeak Portal**. fileciteturn0file0L2-L19

---

# 2. Technology Architecture

## 2.1 Application Stack

### Next.js
Next.js will serve as the primary web application framework.

Responsibilities:
- Application routing
- Server-side rendering where appropriate
- App Router
- API endpoints / Route Handlers
- Server Actions where appropriate
- Authentication-aware pages
- Dashboard interfaces
- Form workflows
- Report generation interfaces

### TypeScript

TypeScript will be used throughout the application to provide:
- Strong typing
- Shared domain models
- Type-safe database access
- Safer API contracts
- Reusable interfaces
- Better maintainability

### Node.js

Node.js will provide the application runtime for:
- Next.js server execution
- Background processing
- Scheduled jobs
- Notification processing
- Synchronization workflows
- Report generation
- Automation services

### Supabase

Supabase will provide the primary backend infrastructure:
- PostgreSQL database
- Row Level Security
- Storage
- Realtime subscriptions where required
- Database functions/triggers where appropriate

Supabase Authentication will **not** be used as the application's authentication mechanism. User authentication will be handled by the Netspeak application using its own account/session system, with Gmail SMTP used for email-based verification, credential delivery, password reset, and system-generated email notifications.

---

# 3. Core System Modules

The Netspeak Portal consists of the following major modules:

1. Account Management & Authentication
2. Teacher Management
3. Teacher Attendance
4. Admin Attendance
5. IT Attendance
6. Time In / Time Out
7. Daily Output Reporting
8. Admin & IT Checklists
9. Switch Rest Day (SRD)
10. Teacher Resignation
11. Exit Interview
12. Incident Reports
13. Teacher Concerns / Tickets
14. Teacher Social Media Monitoring
15. Teacher Reports
16. Seating Arrangement
17. Slot Opening Compliance
18. Certificate of Service
19. Teacher Referral Monitoring
20. Penalty Monitoring
21. Recruitment / New Hire Management
22. New Teacher Requirements
23. Training & Tagging
24. IT Task Management
25. Equipment / System Issues
26. Internet / Power / Genset Simulations
27. Notifications
28. Management Dashboard
29. Daily / Weekly / Monthly Reports
30. Cut-Off Reports
31. Centralized Synchronization

---

# 4. User Roles & Access

The system should support role-based access control.

## 4.1 Teacher

Teachers can:
- Submit registration/application information
- Log in and log out
- Complete Freshness Check
- Submit daily output
- Submit SRD requests
- Submit concerns/tickets
- File resignation
- Book exit interviews
- View attendance
- View request status
- View announcements
- Complete onboarding requirements
- View slot-opening compliance
- Access applicable reports and certificates

## 4.2 Admin

Admins can:
- Manage teacher records
- Verify teacher attendance
- Review registrations
- Manage schedules
- Manage SRD requests
- Monitor resignations
- Monitor daily operations
- Complete Admin Time In/Out
- Complete Admin End-of-Shift Checklist
- Manage administrative tasks
- Review concerns and incidents
- Generate reports

## 4.3 Operations Manager

Operations Managers can:
- Approve requests
- Review attendance
- Monitor teacher and admin operations
- Review resignations
- Manage exit interviews
- Monitor incidents
- Review dashboards
- Receive automated alerts

## 4.4 IT

IT users can:
- Time In / Time Out
- Complete IT checklists
- Manage IT tasks
- Manage equipment issues
- Manage system issues
- Process workstation reformatting tasks
- Monitor IT attendance
- Manage simulation activities

## 4.5 Management

Management users can access:
- Centralized dashboards
- Attendance analytics
- Teacher analytics
- Recruitment analytics
- Resignation analytics
- Admin performance
- IT performance
- Branch reports
- Project reports
- Monthly and cut-off reports

## 4.6 System Administrator

The System Administrator manages:
- User accounts
- Roles and permissions
- System configuration
- Branches
- Projects
- Departments
- Shift schedules
- Notification rules
- Penalty rules
- System settings

---

# 5. Account Management & Authentication

## 5.1 Deduplication

The registration process must prevent duplicate account creation using exact matching rules:

- Complete Name + Birthday
- OR Cellphone Number

These validation rules are explicitly required by the source specification. fileciteturn0file0L3-L19

## 5.2 Teacher Profile

### Personal Information

- Teacher Name / Display Name
- Real Complete Name
- Birthday
- Cellphone Number
- Emergency Contact Details
- Complete Address

### Academic Information

- School Attended
- Course
- Major

### Operational Information

- Launch / Start Date
- Project Type
  - FTEX
  - FT
  - TTP
- Department
  - Domestic
  - Overseas / Global
- Assigned Rest Day
- 51Talk Portal Username
- 51Talk Portal Password

## 5.3 Registration Approval Workflow

```text
Teacher Registration
        ↓
Admin Review
        ↓
Manager Final Approval
        ↓
Account Activation
        ↓
Credential Generation
        ↓
Automated Email
```

The supplied requirements define the registration process as teacher submission, Admin review, Manager final approval, and automated credential delivery. fileciteturn0file0L14-L19

---

# 6. Attendance & Time Management

## 6.1 Teacher Login

Teacher login must support Freshness Check through camera/photo capture.

The Freshness Check:
- Requires a selfie/photo
- Confirms the login event
- Serves as the official arrival timestamp

## 6.2 Shift Rules

### T-30

The early login window opens 30 minutes before the scheduled shift.

### T-10

If the teacher has not completed Freshness Check:
- Notify Center Admin

### T-0

At scheduled shift start:
- Evaluate login status
- Flag Late / Absent
- Notify Admin and Manager

### Logout

Teacher logout is restricted during active shift hours.

Logout becomes available:
- 15 minutes before shift end, or
- At exact shift end

After successful logout, the system may initiate the configured Windows/PC shutdown sequence.

The source specification defines these Freshness Check, shift-window, alert, lockdown, and logout rules. fileciteturn0file0L20-L38

---

# 7. Daily Output Reporting

Before completing a shift, the teacher must complete:

1. Daily Output Entry
2. Mandatory Announcement Acknowledgment
3. Logout

Daily Output includes:
- Open Slots
- Booked Slots
- Attendance Exceptions
  - Class Tardiness
  - Absent Class
  - Early Leave

If the report is not submitted:
- The system reminds the teacher on the next login.

Reports may be edited/corrected for up to 48 hours after the shift. fileciteturn0file0L39-L52

---

# 8. Self-Service Requests

## 8.1 Switch Rest Day

Fields:
- Target Date
- Swapped Date
- Reason

Workflow:

```text
Teacher Request
      ↓
Manager Approval
      ↓
Schedule Update
      ↓
Attendance Update
      ↓
Notification
```

Approved SRD requests automatically update the master schedule. fileciteturn0file0L53-L71

## 8.2 Cash Loan

The system should support:
- Loan request form
- Policy terms
- Deduction schedule
- Due-date reminders

## 8.3 Equipment Replacement / Maintenance

Create a ticketing system for:
- PC issues
- Headset issues
- Peripheral issues
- Equipment replacement
- Equipment maintenance

## 8.4 Early Time-Off

Workflow:

```text
Teacher submits request
        ↓
Manager review
        ↓
30-minute response window
        ↓
Approved / Rejected
        ↓
If no action within 30 minutes → Auto-approved
```

The system must display a checklist reminding teachers of steps required to prevent client tardiness.

## 8.5 Notifications

Every request should support status notifications:

- Approved
- Rejected
- Pending Information

Notifications should include reviewer notes where applicable. fileciteturn0file0L63-L71

---

# 9. Admin Module

## 9.1 Admin Time In

The Admin selects **TIME IN**.

The system records:
- Admin Name
- Branch
- Date
- Actual Time In
- Scheduled Shift

## 9.2 Admin Time Out

Admin Time Out remains disabled until the Admin End-of-Shift Checklist is completed.

The system records:
- Checklist completion
- Completion timestamp
- Time Out

The requirements explicitly require checklist completion before Admin logout. fileciteturn0file0L121-L139

## 9.3 Admin Attendance Dashboard

Fields/statuses include:
- Admin Name
- Branch
- Date
- Scheduled Shift
- Time In
- Time Out
- Present
- Late
- Early Out
- Absent
- SRD
- Absence Reason
- No Login
- No Logout
- Checklist Status
- Remarks

Actual login/logout events must synchronize with attendance automatically. fileciteturn0file0L140-L159

## 9.4 Admin No Login / No Logout

The system monitors scheduled Admin attendance.

Trigger conditions:
- No login on scheduled workday
- Login without logout
- Incomplete checklist

The system sends alerts to configured management personnel.

---

# 10. Admin SRD & Absence

The system must:
- Record Admin SRD
- Record Admin absence
- Notify management
- Include status in daily attendance summary

Notification data:
- Admin Name
- Branch
- Date
- SRD/Absent Status
- Reason
- Approval Status

---

# 11. Admin Attendance Reporting

## Daily

Display:
- Total Admins Scheduled
- Present
- Late
- Early Out
- Absent
- SRD
- No Login
- No Logout
- Incomplete Checklist

## Weekly

Display:
- Attendance Percentage
- Absences
- SRDs
- Late
- Early Out
- No Login
- No Logout

## Monthly

Generate complete monthly Admin attendance report.

---

# 12. Admin Task Monitoring

Daily tracking includes:
- Tasks Completed
- Pending Tasks
- Teacher Concerns
- Attendance Monitoring
- Resignations Processed
- SRDs Processed
- Incident Reports
- Other Assigned Tasks

Weekly and monthly summaries must consolidate completed and pending tasks. fileciteturn0file0L215-L228

---

# 13. Teacher Resignation

Teachers must be able to submit resignation through the portal.

Required fields:
- Full Name
- Branch
- Project
- Date Filed
- Effectivity Date
- Reason
- Resignation Letter
- Signature
- Remarks

Supported reasons include:
- Personal / Family Reasons
- Health / Medical Reasons
- Schedule Conflict
- Found Another Job / Better Opportunity
- Higher Pay / Compensation
- Studies / Education
- Relocation
- Workload / Burnout
- Project / Work Concerns
- Management / Workplace Concerns
- Internet / Equipment Issues
- Career Change / No Longer Interested in Teaching
- Other / Not Specified

The source specification provides this resignation workflow and reason list. fileciteturn0file0L229-L255

---

# 14. Resignation Letter

The system should provide a standard resignation letter template containing:

- Teacher Name
- Date
- Effectivity Date
- Reason
- Signature

Upon submission:
- Notify Admin
- Notify Operations Manager

---

# 15. Exit Interview

The Operations Manager Assistant opens available Exit Interview slots every first day of the month.

Teachers can:
- View available slots
- Book a slot
- Receive confirmation

The system sends:
- Confirmation
- Day-of-interview reminder

---

# 16. Resignation Monitoring

Weekly and monthly dashboards should show:

- Teacher Name
- Branch
- Project
- Date Filed
- Effectivity Date
- Reason
- Exit Interview Status

Filters/reports:
- Weekly
- Monthly
- Branch
- Project
- Resignation Reason

Workflow:

```text
Teacher Resignation
        ↓
Resignation Monitoring
        ↓
Notifications
        ↓
Exit Interview
        ↓
IT / TPCAP Actions
        ↓
Teacher Deactivation
```

---

# 17. Teacher Attendance

Teacher attendance must synchronize with login/logout.

Status options:
- Present
- Late
- Early Out
- Absent – Valid
- Absent – Invalid
- No Logout
- SRD
- Approved Rest Day

Admins can manually verify attendance and enter absence reasons.

If a teacher logs in without logging out:
- Flag teacher
- Notify Admin
- Include teacher in next-day No Logout Summary

The attendance statuses and no-logout behavior are defined in the supplied specification. fileciteturn0file0L296-L314

---

# 18. Teacher SRD

Fields:
- Date Filed
- Full Name
- Teacher Name
- Original Rest Day
- Date Not Working
- Switched Work Date
- Reason
- Approval Status
- Approver
- Remarks

Approval:

```text
Teacher
   ↓
Operations Manager
   ↓
Approved / Rejected
```

After approval:

```text
SRD
 ↓
Attendance Update
 ↓
Schedule Update
 ↓
Notifications
```

The supplied specification requires approved SRD requests to automatically update Attendance and Schedule. fileciteturn0file0L315-L339

---

# 19. Incident Report Ticket

Fields:
- Date
- Time
- Reporter
- Branch
- Person Involved
- Category
- Description
- Evidence / Attachment
- Action Taken
- Remarks
- Status

Automatically notify configured management personnel.

---

# 20. Teacher Concern Ticket

Teachers can submit concerns through a ticketing interface.

Categories:
- Technical Concern
- Attendance Concern
- Schedule Concern
- Student Concern
- Admin Concern
- Project Concern
- Payment Concern
- Emergency
- Other

Ticket lifecycle:

```text
Submitted
   ↓
Assigned
   ↓
Under Review
   ↓
Action Taken
   ↓
Resolved / Closed
```

The source document explicitly defines these teacher concern categories. fileciteturn0file0L362-L373

---

# 21. Teacher Social Media Monitoring

When a teacher successfully logs in:

```text
Teacher Login
     ↓
Social Media Monitoring Starts
     ↓
Teacher Logout
     ↓
Monitoring Stops
```

Monitoring must follow the actual login/logout period. fileciteturn0file0L384-L387

---

# 22. Teacher Reports

Reports must support filtering by:
- Teacher
- Branch
- Project
- Date Range
- Cut-Off

## Daily

- Attendance
- Login
- Logout
- Late
- Early Out
- Low Bookings
- Slot Activity
- Other Concerns

## Weekly

Summary of daily activity.

## Monthly

Complete teacher activity summary.

## Cut-Off

Management can generate reports on demand.

---

# 23. Seating Arrangement

Create a branch seating arrangement module.

Fields:
- Branch
- Computer / Workstation Number
- Seat Number
- Assigned Teacher
- Schedule
- Status

When a teacher becomes Resigned or AWOL:

1. Notify IT
2. Identify assigned computer
3. Create IT reformatting task
4. Remove teacher from active assignment
5. Notify TPCAP
6. Remove teacher from applicable TPCAP list

The source specification defines this automated workflow. fileciteturn0file0L405-L422

---

# 24. Slot Opening Compliance

Teachers must open slots one month in advance.

The system must:
- Monitor compliance
- Send reminder 3 days before deadline
- Identify teachers who opened slots
- Identify teachers who have not opened slots
- Display deadline
- Display compliance status

---

# 25. Certificate of Service

Create an automated Certificate of Service generator.

Pull from Teacher Profile:
- Full Name
- Position
- Project
- Branch
- Start Date
- End Date
- Other required information

Use a standardized company template. fileciteturn0file0L431-L442

---

# 26. Teacher Referral Monitoring

During application, ask:

> Were you referred by a current teacher?

If YES:
- Require referring teacher name.

Track:
- Applicant
- Referring Teacher
- Application Date
- Hiring Status
- Starting Date
- Referral Status
- Referral Fee Status

If the applicant does not identify the referring teacher during application, the referring teacher cannot claim the referral fee according to the supplied requirement. fileciteturn0file0L443-L456

---

# 27. Penalty Monitoring

The system should identify configured attendance-related violations.

Examples:
- Invalid Absence
- Unapproved Absence
- Cancellation
- Other configured violations

Penalty amount must be configurable.

Workflow:

```text
Login / Logout
      ↓
Attendance
      ↓
Absence Validation
      ↓
Penalty
      ↓
Cut-Off Report
```

The supplied requirements define this synchronization flow. fileciteturn0file0L457-L468

---

# 28. IT Module

## 28.1 IT Time In / Time Out

Workflow:

```text
TIME IN
   ↓
WORK
   ↓
CHECKLIST
   ↓
TIME OUT
```

Record:
- IT Name
- Branch
- Date
- Time In
- Time Out
- Attendance Status

The IT checklist must not require document uploading.

## 28.2 IT No Login / No Logout

Trigger if:
- No login
- Login without logout
- Checklist incomplete

Rules:
- Notify configured management personnel
- Prevent logout while checklist is incomplete

---

# 29. IT Task Management

## Weekly

Use IT Weekly Tasks Checklist.

## Monthly

Use IT Monthly Tasks Checklist.

Generate:
- Daily IT Report
- Weekly IT Report
- Monthly IT Report
- Completed Tasks
- Pending Tasks
- IT Concerns
- Equipment Issues
- System Issues

---

# 30. Centralized Admin & IT Attendance Report

Create a unified report containing:

- Employee
- Department
- Branch
- Date
- Time In
- Time Out
- Status
- SRD
- Absent
- Late
- Early Out
- No Login
- No Logout
- Checklist

Report filters:
- Daily
- Weekly
- Monthly
- Employee
- Branch
- Department

---

# 31. Daily Admin & IT Attendance Notification

Automatically generate daily summaries.

## Admin

- Present
- Late
- Early Out
- Absent
- SRD
- No Login
- No Logout
- Incomplete Checklist

## IT

- Present
- Late
- Early Out
- Absent
- No Login
- No Logout
- Incomplete Checklist

Automatically notify appropriate management personnel.

---

# 32. Internet / Power / Genset Simulation

Schedule simulations on:

- Every 1st Saturday
- Every 3rd Saturday

Activities:
- Internet outage simulation
- Power outage simulation
- Genset operation
- Backup internet testing
- Emergency procedures

Notify:
- Teachers
- Admins
- IT
- Managers
- COs

Record:
- Attendance
- Completion
- Issues
- Remarks
- Person Responsible

The schedule and tracking requirements are specified in the supplied document. fileciteturn0file0L570-L592

---

# 33. New Hire Management

Create a New Hire Dashboard.

Display:
- Teacher Name
- Starting Date
- Branch
- Project
- Requirements
- Training
- Tagging
- Completion %
- Slot Opening Eligibility

Generate:
- Daily Summary
- Weekly Summary
- Monthly Summary

---

# 34. New Teacher Requirements

New teachers receive at least 3 days to complete requirements before opening slots.

Requirements include:
- Bank Account
- Contract Signing
- Valid ID
- Proof of Education
- Professional Picture
- Intro Recording
- NBI
- Self-Video Introduction
- SK12 Tagging
- TPCAP Tagging
- Additional Special Taggings
- Global Teacher Tagging
- Flowers
- Signed Double SA
- TTP Orientation
- Trainings
- TESOL
- ZTP Training
- Learning Hub
- Props

Each requirement should have a status:
- Completed
- Pending
- Missing
- Verified

The system must also display:
- Days Remaining
- Eligible / Not Eligible to Open Slots

Eligibility flow:

```text
New Hire
   ↓
Requirements Completion
   ↓
Admin Verification
   ↓
Eligible to Open Slots
```

The requirements and eligibility flow are defined in the source specification. fileciteturn0file0L608-L642

---

# 35. Management Dashboard

Create a centralized management dashboard.

## Teacher

Display:
- Active Teachers
- Newly Hired
- Resigned
- AWOL
- Attendance
- Late
- Early Out
- No Logout
- Low Bookings
- SRD
- Incidents
- Penalties

## Admin

Display:
- Attendance
- Daily Tasks
- Weekly Tasks
- Monthly Tasks
- Absences
- SRDs
- No Login
- No Logout
- Checklist Compliance

## IT

Display:
- Attendance
- Daily Tasks
- Weekly Tasks
- Monthly Tasks
- Tickets
- Equipment Issues
- System Issues
- Simulations
- No Login
- No Logout
- Checklist Compliance

## Recruitment

Display:
- Applicants
- Newly Hired
- Requirements
- Pending Requirements
- Referrals
- Referral Fees

## Resignation

Display:
- Weekly Resignations
- Monthly Resignations
- Resignation Reasons
- Exit Interviews
- Effectivity Dates
- Branch / Project Breakdown

The source specification defines these dashboard categories. fileciteturn0file0L643-L695

---

# 36. Notification System

The system should provide a centralized notification engine.

Notification channels may include:
- In-app notifications
- Email via Gmail SMTP
- Dashboard alerts
- System banners
- Scheduled reminders

Notification events include:
- Late / absent
- No login
- No logout
- Incomplete checklist
- SRD approval/rejection
- Request status changes
- Incident creation
- Resignation submission
- Exit interview reminders
- Slot opening reminders
- Requirement deadlines
- Simulation reminders
- Low booking alerts

Notifications should be generated from centralized events rather than duplicated independently in each module.

---

# 37. Database Architecture

Supabase PostgreSQL should act as the system's central source of truth.

Suggested core entities:

```text
users
profiles
roles
permissions
branches
departments
projects
shifts
schedules
teacher_profiles
admin_profiles
it_profiles

attendance
attendance_events
login_sessions
freshness_checks

daily_outputs
announcements
announcement_acknowledgements

srd_requests
cash_loan_requests
time_off_requests
equipment_tickets
concern_tickets
incident_reports

resignations
resignation_reasons
exit_interviews
exit_interview_slots

seating_assignments
workstations

applications
referrals
new_hires
onboarding_requirements
training_records
teacher_tags

penalty_rules
penalties

it_tasks
admin_tasks
simulations

notifications
notification_preferences

reports
audit_logs
system_settings
```

The exact schema should be finalized during database design based on normalization, security, reporting requirements, and workflow dependencies.

---

# 38. Database Relationships

High-level relationship model:

```text
User
 ├── Profile
 ├── Role
 ├── Attendance
 ├── Schedule
 ├── Requests
 ├── Notifications
 └── Audit Logs

Teacher
 ├── Profile
 ├── Schedule
 ├── Attendance
 ├── Daily Output
 ├── SRD
 ├── Resignation
 ├── Requirements
 ├── Training
 ├── Referral
 ├── Penalties
 ├── Seating Assignment
 └── Reports

Admin
 ├── Profile
 ├── Attendance
 ├── Checklist
 ├── Tasks
 └── Reports

IT
 ├── Profile
 ├── Attendance
 ├── Checklist
 ├── Tasks
 ├── Tickets
 ├── Equipment Issues
 └── Reports
```

---

# 39. Supabase Security

The application should use Supabase Row Level Security (RLS).

Examples:

### Teacher

A teacher should only be able to:
- View permitted profile information
- Create their own requests
- View their own requests
- View their own attendance
- Submit their own daily output
- View applicable announcements

### Admin

Admins can access operational records according to assigned permissions.

### Manager

Managers can access approval queues, reports, and operational dashboards.

### IT

IT users can access IT tasks, tickets, equipment, and assigned operational records.

### Management

Management users can access centralized dashboards and reports according to permissions.

Sensitive fields, particularly credentials and personal information, must have restricted access.

---

# 40. File Storage

Supabase Storage should be used for uploaded files instead of storing binary files directly inside database records.

Potential storage categories:
- Resignation letters
- Signatures
- Incident evidence
- Teacher requirements
- Professional pictures
- Intro recordings
- Self-video introductions
- Supporting documents
- Other authorized attachments

Database records should store file metadata and storage paths rather than large binary payloads.

---

# 41. Authentication Architecture

Netspeak will use **application-managed authentication** rather than Supabase Auth.

The authentication layer will be implemented using Next.js/Node.js and the Netspeak PostgreSQL database hosted through Supabase.

Gmail SMTP will be used as the system's email transport for authentication-related and operational emails.

## 41.1 Authentication Responsibilities

The application authentication system should support:

- User login
- Password authentication
- Password hashing
- Password reset
- Email verification where required
- Account activation/deactivation
- Session management
- Role-based access
- Permission-based module access
- Credential delivery for approved teacher accounts
- Authentication-related email notifications

## 41.2 Gmail SMTP

Gmail SMTP will be used to send system emails such as:

- Account verification emails
- Password reset emails
- Generated account credentials
- Approval notifications
- Request status notifications
- Attendance alerts
- No-login / no-logout alerts
- Exit interview reminders
- Slot-opening reminders
- Other configured system notifications

SMTP credentials must be stored securely as environment variables and must never be hard-coded in the application.

Example configuration:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
```

The actual Gmail account and SMTP credentials should be configured during deployment.

## 41.3 Authentication Flow

```text
User
  ↓
Login Form
  ↓
Next.js / Node.js Authentication Service
  ↓
Validate Credentials
  ↓
Password Hash Verification
  ↓
Create Secure Session
  ↓
Load User Role / Permissions
  ↓
Authorized Portal Access
```

## 41.4 Registration / Account Activation

Teacher registration follows the required approval process:

```text
Teacher Registration
        ↓
Admin Review
        ↓
Manager Final Approval
        ↓
Account Created / Activated
        ↓
Credentials Generated
        ↓
Gmail SMTP
        ↓
Credential Email Sent
```

## 41.5 Password Security

Passwords must never be stored in plain text.

The application should:
- Hash passwords using a modern password-hashing algorithm
- Never expose password hashes to the client
- Never include passwords in application logs
- Use secure password reset tokens
- Expire password reset tokens
- Invalidate appropriate sessions after password changes

## 41.6 Session Security

Authenticated sessions should:
- Use secure, HTTP-only cookies
- Use appropriate expiration and refresh rules
- Be invalidated on logout
- Be protected against session fixation
- Respect role and permission changes

## 41.7 Authorization

Authentication and authorization are separate concerns.

The application must verify:
1. The user is authenticated.
2. The user's account is active.
3. The user has the required role.
4. The user has permission to perform the requested action.

Authorization must be enforced server-side. Frontend checks should only control the user interface and must not be treated as the primary security boundary.

## 41.8 Recommended User Relationship

```text
Application User
        ↓
User Profile
        ↓
Role
        ↓
Permissions
        ↓
Module Access
```

The application database remains the source of truth for users, roles, permissions, and application access.

---

# 42. Audit Logging

Important system actions should be recorded.

Audit events may include:
- Login
- Logout
- Attendance modification
- Schedule modification
- Approval
- Rejection
- Profile update
- Resignation submission
- Requirement verification
- Penalty creation
- Ticket status change
- Role/permission change
- Administrative changes

Suggested fields:

```text
id
user_id
action
module
entity_type
entity_id
old_value
new_value
ip_address
user_agent
created_at
```

---

# 43. Automated Synchronization

The system must connect related modules automatically.

Core workflows:

```text
Admin/IT Login
    ↓
Attendance
    ↓
Daily Report
```

```text
Admin/IT Logout
    ↓
Checklist
    ↓
Logout
    ↓
Attendance
    ↓
Daily Report
```

```text
Incomplete Checklist
    ↓
Logout Disabled
    ↓
Alert
```

```text
Scheduled Workday
    ↓
No Login
    ↓
Management Notification
```

```text
Login Recorded
    ↓
No Logout
    ↓
Management Notification
```

```text
SRD Approval
    ↓
Schedule
    ↓
Attendance
    ↓
Notification
```

```text
Resignation
    ↓
Monitoring
    ↓
Exit Interview
    ↓
TPCAP Notification
    ↓
IT Reformat Task
    ↓
Teacher Deactivation
```

```text
Teacher Attendance
    ↓
Absence Validation
    ↓
Penalty
    ↓
Cut-Off Report
```

```text
New Hire
    ↓
Referral
    ↓
Onboarding
    ↓
Requirements
    ↓
Training / Tagging
    ↓
Slot Eligibility
```

```text
Incident
    ↓
Notification
    ↓
Monitoring
    ↓
Resolution
```

These synchronization flows are explicitly required in the supplied specification. fileciteturn0file0L696-L721

---

# 44. Scheduled Jobs

Node.js / server-side scheduled processing should support:

- Shift-based alerts
- T-30 login window
- T-10 Freshness Check alerts
- T-0 attendance alerts
- No-login detection
- No-logout detection
- Requirement deadline reminders
- Slot-opening reminders
- Exit interview reminders
- Simulation reminders
- Birthday notifications
- Lesson fee synchronization
- Daily summaries
- Weekly summaries
- Monthly summaries
- Cut-off report generation

Scheduled jobs should be idempotent to prevent duplicate notifications or duplicate processing.

---

# 45. Reporting Architecture

Reports should support:

- Daily
- Weekly
- Monthly
- Cut-Off
- Branch
- Project
- Department
- Employee
- Date Range

The reporting layer should use the normalized operational database rather than requiring manual consolidation.

---

# 46. Development Phases

## Phase 1 — Core Operations

Priority modules:

- Admin Time In/Out
- IT Time In/Out
- Teacher Login/Logout
- Admin/IT Checklists
- Logout Restrictions
- No Login / No Logout Alerts
- Admin Attendance
- Teacher Attendance
- SRD
- Basic Notifications
- Incident Tickets

## Phase 2 — Monitoring & Automation

- Resignation System
- Exit Interview
- Admin/IT Task Monitoring
- Teacher Reports
- Penalty Monitoring
- Seating Assignment
- No-Logout Monitoring
- TPCAP / IT Notifications

## Phase 3 — Recruitment & Teacher Management

- New Hire Dashboard
- Requirements Checklist
- Referral Monitoring
- Certificate of Service
- Slot Opening Reminders
- Teacher Assignment

## Phase 4 — Management Analytics

- Daily Reports
- Weekly Reports
- Monthly Reports
- Cut-Off Reports
- Branch Reports
- Attendance Analytics
- Resignation Analytics
- Admin Performance
- IT Performance
- Teacher Performance
- Management Dashboard

The supplied source defines the same four-phase development priority. fileciteturn0file0L722-L763

---

# 47. Non-Functional Requirements

## Performance

The system should:
- Load common dashboard views quickly
- Avoid unnecessary polling
- Use database indexes for frequently queried fields
- Paginate large datasets
- Use server-side filtering for large reports
- Cache appropriate read-heavy data

## Reliability

The system should:
- Prevent duplicate workflow processing
- Maintain audit history
- Handle transient notification failures
- Support retry mechanisms
- Preserve attendance records
- Prevent accidental duplicate submissions

## Security

The system should:
- Enforce authentication
- Enforce role-based authorization
- Use Supabase RLS
- Protect sensitive personal information
- Protect credentials
- Validate uploaded files
- Restrict administrative operations
- Maintain audit logs

## Maintainability

The codebase should:
- Use TypeScript
- Follow modular architecture
- Use reusable components
- Separate business logic from presentation
- Use typed database interfaces
- Maintain environment-specific configuration
- Provide clear migration procedures

---

# 48. Suggested Next.js Project Structure

```text
netspeak/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── dashboard/
│   │   ├── teacher/
│   │   ├── admin/
│   │   ├── it/
│   │   ├── management/
│   │   ├── recruitment/
│   │   ├── reports/
│   │   └── api/
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── forms/
│   │   ├── tables/
│   │   ├── dashboards/
│   │   └── notifications/
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   ├── auth/
│   │   ├── permissions/
│   │   ├── notifications/
│   │   ├── reports/
│   │   └── validation/
│   │
│   ├── modules/
│   │   ├── attendance/
│   │   ├── teachers/
│   │   ├── admin/
│   │   ├── it/
│   │   ├── recruitment/
│   │   ├── resignation/
│   │   ├── requests/
│   │   └── reports/
│   │
│   ├── types/
│   └── config/
│
├── supabase/
│   ├── migrations/
│   ├── functions/
│   └── seed/
│
├── public/
├── tests/
├── .env.example
├── next.config.ts
├── package.json
└── README.md
```

---

# 49. Environment Configuration

Expected environment configuration should be maintained separately from source code.

Example:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_APP_URL=

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=

CRON_SECRET=
```

Secrets must never be committed to the repository.

---

# 50. Development Standards

## Code

- TypeScript strict mode
- ESLint
- Consistent formatting
- Reusable components
- Server-side validation
- Client-side validation for user experience
- Typed database operations
- Centralized error handling

## Database

- Use migrations
- Foreign keys for relational integrity
- Index frequently queried columns
- Avoid duplicated source-of-truth data
- Use timestamps consistently
- Use database constraints for critical validation

## API / Server Actions

All mutations should:
1. Authenticate the user
2. Validate input
3. Authorize the requested action
4. Execute the transaction
5. Record audit information
6. Trigger required synchronization/notifications
7. Return a typed response

---

# 51. Data Integrity Principles

The system must prioritize a single source of truth.

Examples:

### Attendance

Do not separately encode the same attendance information in multiple modules.

```text
Login/Logout Event
       ↓
Attendance Record
       ↓
Reports
       ↓
Penalty
       ↓
Cut-Off
```

### Resignation

```text
Resignation Record
       ↓
Monitoring
       ↓
Exit Interview
       ↓
IT/TPCAP Actions
       ↓
Teacher Status
```

### SRD

```text
Approved SRD
       ↓
Schedule
       ↓
Attendance
       ↓
Reports
```

### New Hire

```text
Application
       ↓
Requirements
       ↓
Training
       ↓
Tagging
       ↓
Eligibility
```

---

# 52. Final System Goal

The Netspeak Portal should become the centralized operations management system for the organization.

The primary design principle is:

> **Information should only need to be entered once and should automatically synchronize with all related modules.**

Key examples:

```text
Attendance
    → Reports
    → Penalties
    → Cut-Off
```

```text
Resignation
    → Exit Interview
    → Monitoring
    → IT/TPCAP Notification
```

```text
SRD Approval
    → Schedule
    → Attendance
```

```text
Login
    → Checklist
    → Logout
    → Attendance
```

```text
New Hire
    → Requirements
    → Training
    → Slot Eligibility
```

```text
Incident
    → Notification
    → Monitoring
    → Resolution
```

The intended outcome is accurate, real-time daily, weekly, monthly, and cut-off reporting without manual consolidation across multiple Google Forms and Google Sheets. fileciteturn0file0L764-L777

---

# 53. Implementation Note

This document defines the functional and technical direction of the Netspeak Portal based on the supplied system requirements.

Before implementation, the development team should produce the following technical artifacts:

1. Database ERD
2. Supabase database schema
3. RLS policy matrix
4. Role and permission matrix
5. API / Server Action specification
6. Notification event map
7. Workflow state diagrams
8. UI/UX page map
9. Report specification
10. Scheduled-job specification
11. File-storage structure
12. Testing strategy
13. Deployment architecture
14. Backup and recovery plan

These artifacts should be finalized before the corresponding modules are moved into production.
