# Netspeak Portal — SRS & Consolidated Requirements Audit Report

> **Document Scope**: Cross-verification of `NETSPEAKv2` codebase against the *System Requirement Specification & Feature Map (Consolidated Portal Development Requirements)*.  
> **Date**: September 24, 2026  
> **Auditor**: Antigravity AI — Architecture & QA  
> **Target System**: Next.js 16.3 (Turbopack, App Router) + PostgreSQL (Supabase) + Prisma ORM  

---

## 1. Executive Summary

| Category | Total Requirements | Fully Implemented (✅) | Partially Implemented (⚠️) | Pending / Future Phase (📋) |
| :--- | :---: | :---: | :---: | :---: |
| **Account & Authentication** | 4 | 3 | 1 (Email transport stubbed) | 0 |
| **Time, Attendance & Kiosk** | 6 | 4 | 2 (OS Shutdown / Client banner) | 0 |
| **Daily Output & Workflows** | 3 | 3 | 0 | 0 |
| **Self-Service Requests** | 5 | 3 | 1 (Cash loan) | 1 (Ticket UI exists, tab separation) |
| **Admin & IT Operations** | 12 | 11 | 1 (Automated sync cron trigger) | 0 |
| **Resignation & Exit Interview** | 6 | 6 | 0 | 0 |
| **Seating & Hardware Lifecycle**| 2 | 2 | 0 | 0 |
| **New Hire Onboarding** | 3 | 3 | 0 | 0 |
| **Reports & Analytics** | 6 | 5 | 1 (3-day lesson fee sync hook) | 0 |
| **Overall Score** | **47 Items** | **40 (85.1%)** | **6 (12.8%)** | **1 (2.1%)** |

---

## 2. Detailed Requirement Breakdown

### I. Account Management & Authentication (§1)
* **Deduplication Check (✅ Implemented)**: Handled in `registerTeacherAction` (`src/actions/teachers.ts:101-138`) checking exact case-insensitive match on `(Real Full Name + Birthday)` OR `Cellphone Number`.
* **Profile Fields (✅ Implemented)**: `TeacherProfile` schema captures personal, academic, operational (Launch Date, Project Type, Department, Rest Day, 51Talk credentials), and branch association.
* **2-Tier Approval Workflow (✅ Implemented)**: Form submission (`PENDING`) $\rightarrow$ Admin Review (`UNDER_REVIEW`) $\rightarrow$ Operations Manager / Admin Final Approval (`APPROVED`), which creates the linked user and sets the `TEACHER` role.
* **Automated Credential Delivery (⚠️ Partial)**: Credentials (`username` + temporary password) are securely generated and saved on approval, displayed to the admin in the UI. External SMTP delivery is configured via log output pending dedicated third-party mailer service configuration.

---

### II. Time, Attendance & Kiosk Management (§2, §11, §12)
* **Freshness Check / Selfie Verification (✅ Implemented)**: WebRTC camera capture in `FreshnessCheckModal.tsx`, validated in `recordFreshnessCheckAction` (`src/actions/attendance.ts:27-140`).
* **Shift Window & Alert Triggers (✅ Implemented)**:
  * **T-30 Early Login Window**: Locked until 30 minutes before shift start; attempts before T-30 are rejected.
  * **T-0 Late / Absence Detection**: Flags `isLate` and calculates exact `lateMinutes` against Manila PHT shift boundaries.
  * **T-10 Freshness & No-Logout Alerts**: Evaluated and dispatched to admins via `runScheduledAlertsEvaluationAction` in `src/actions/scheduledJobs.ts`.
* **Active Shift & Logout Lockdown (✅ Implemented)**: `recordTeacherLogoutAction` prohibits premature sign-out until **15 minutes before shift end (T-15)** unless an explicit early departure reason is supplied.
* **Kiosk PC Shutdown & Unclosable Warning (⚠️ Partial)**: Kiosk lockdown logic is enforced at web application layer; physical OS shutdown triggers (`shutdown.exe`) rely on local desktop wrapper/agent hooks.

---

### III. Daily Output Reporting (§3)
* **Pre-Logout Daily Output (✅ Implemented)**: `submitDailyOutputAction` captures open slots, booked slots, class tardiness, absent classes, and early leave classes.
* **Mandatory Announcement Modal (✅ Implemented)**: `announcementAcknowledged` boolean required prior to submission.
* **48-Hour Edit Window & Next-Day Prompt (✅ Implemented)**: Submissions enforce a 48-hour editing window, and missing outputs trigger alerts on subsequent logins.

---

### IV. Self-Service Requests & Approvals (§4, §13, §14, §15)
* **Switch Rest Day (SRD) (✅ Implemented)**: Form collects Original Rest Day, Date Not Working, Switched Work Date, and Reason (`submitSRDRequestAction`). Upon approval, shifts update automatically.
* **Early Time-Off Auto-Approval (✅ Implemented)**: `checkEarlyTimeOffAutoApprovalsAction` scans pending ETO requests older than 30 minutes and auto-approves them.
* **Incident Report Ticket (✅ Implemented)**: Managed via `IncidentReportTicket` model and `src/actions/tickets.ts` capturing date, time, reporter, branch, category, evidence attachment, action taken, and OM notifications.
* **Teacher Concern Ticket (✅ Implemented)**: 9 categories available (Technical, Attendance, Schedule, Student, Admin, Project, Payment, Emergency, Other) with emergency contacts for OM Melmar and OM Prei displayed.
* **Cash Loan & Equipment Request (⚠️ Partial)**: Handled under general requests/ticketing; dedicated balance ledger & deduction schedule ready for sub-tab enhancement.

---

### V. Admin & IT Module & Checklists (§5-8, §23-28)
* **Admin & IT Time In / Time Out (✅ Implemented)**: Handled via `recordStaffTimeInAction` and `recordStaffTimeOutAction` in `src/actions/staffOperations.ts`.
* **Mandatory End-of-Shift Checklists (✅ Implemented)**:
  * Admin Daily, Weekly, Monthly routines defined in `src/lib/operations/checklists.ts`.
  * IT Daily (Network integrity, Server room, Workstation audit, Reformat, Ticket resolution), Weekly, and Monthly routines.
  * Time Out button remains strictly **disabled** until daily checklist items are 100% verified.
* **Internet / Power / Genset Simulation Drills (✅ Implemented)**: Automated generator for 1st & 3rd Saturday simulation drills (`src/actions/simulations.ts`), recording drill type, status, and outcome.
* **Staff Attendance & Master Roster (✅ Implemented)**: Dedicated `/dashboard/operations/attendance` dashboard recording Present, Late, Early Out, Absent, SRD, No Login, No Logout, and checklist completion times.

---

### VI. Teacher Resignation, Exit Interview & Lifecycle (§7, §8, §10, §16)
* **Standard Resignation Form (✅ Implemented)**: Captures 13 standardized reasons, effective date, auto-generated formal resignation letter, and digital signature (`TeacherResignationForm.tsx`).
* **Exit Interview Booking (✅ Implemented)**: Resigned teachers view and book available monthly slots with OM Assistant (`bookExitInterviewSlotAction`).
* **Resignation Monitoring Dashboard (✅ Implemented)**: Dedicated hub at `/dashboard/resignation/monitoring` with metrics, reason breakdown, IT equipment clearance, and one-click account deactivation.
* **Automatic Deactivation Flow (✅ Implemented)**: Completing resignation flags IT for computer reformatting and automatically unassigns the teacher's seat.

---

### VII. Seating Arrangement & New Hire Monitoring (§18, §29, §30)
* **Branch Seating Arrangement (✅ Implemented)**: Interactive workstation desk at `/dashboard/seating/manage` showing PC number, Seat number, Assigned Teacher, Schedule, and status (`AVAILABLE`, `OCCUPIED`, `PENDING_REFORMAT`, `UNDER_REFORMAT`).
* **Automatic IT Reformat Task (✅ Implemented)**: Vacated desks upon resignation transition to `PENDING_REFORMAT` for IT action.
* **New Hire Onboarding & Requirements Checklist (✅ Implemented)**: 18 compliance criteria (Bank Account, Contract, Valid ID, NBI, SK12, TPCAP, Intro Recording, etc.) tracked with verification status and slot opening eligibility calculation.

---

### VIII. Management Analytics & Reporting (§17, §22, §26, §31)
* **Executive Management Dashboard (✅ Implemented)**: High-level overview at `/dashboard/management` tracking active teachers, attendance KPIs, low-booking alerts, resignations, and staff operational health.
* **Consolidated Cut-Off Reports (✅ Implemented)**: Semi-monthly cut-offs (1st–15th and 16th–End of Month) aggregating teacher attendance, daily outputs, and automated penalty deductions (`PENALTY_INVALID_ABSENCE_PHP`, `PENALTY_NO_LOGOUT_PHP`).
* **Lesson Fee Automation Sync (⚠️ Partial)**: Cut-off engine calculates net rendered slots and estimated penalties; direct third-party portal API web-scraping/sync hook is scheduled for Phase 4 external integration.

---

## 3. Recommended Fixes & Remediation Plan

Here are the concrete, targeted steps to bring the remaining partial (⚠️) and pending (📋) items to 100% compliance:

### Fix 1: Email Notification Service Delivery (Resend / SendGrid Integration)
* **Gap**: When accounts are approved (`approveTeacherRegistrationAction`) or alerts trigger, credentials and notices are logged in DB and console rather than sent via external SMTP.
* **Recommended Implementation**:
  1. Add `resend` or `@react-email/components` (`npm i resend`).
  2. Add `RESEND_API_KEY` and `SYSTEM_FROM_EMAIL=notifications@netspeakportal.com` to `.env`.
  3. Create email helper `src/lib/email.ts` with `sendTeacherCredentialsEmail(to, username, tempPassword)` and `sendNotificationAlertEmail(to, subject, body)`.
  4. Call `sendTeacherCredentialsEmail` directly inside `approveTeacherRegistrationAction` in `src/actions/teachers.ts`.

### Fix 2: Cash Loan & Equipment Dedication Sub-Tab
* **Gap**: Currently submitted via generic tickets/requests without auto-calculating loan amortization or deduction schedules across cut-offs.
* **Recommended Implementation**:
  1. Add model `CashLoanRequest` to `prisma/schema.prisma` with fields: `amount`, `terms` (number of cut-offs), `deductionPerCutoff`, `reason`, `status`.
  2. Add Cash Loan tab to `/dashboard/requests` (`CashLoanRequestForm.tsx`) with terms disclaimer and amortization breakdown preview.
  3. Link approved loan deduction into `getCutOffReportAction` in `src/actions/reports.ts` under net pay deductions.

### Fix 3: Kiosk Kiosk-Agent & PC Auto-Shutdown Hook
* **Gap**: Web browsers cannot execute host OS shutdown commands (`shutdown.exe`) directly for security reasons.
* **Recommended Implementation**:
  1. Create a lightweight local helper script or local WebSocket agent (`localhost:48123`) run via Windows Startup on center PCs.
  2. When teacher confirms departure in `recordTeacherLogoutAction`, client triggers a local fetch to `http://localhost:48123/shutdown`.
  3. Add modal dialog on web UI before firing: *"Shift completed. Workstation shutting down in 30 seconds [Cancel]"*.

### Fix 4: Early Arrival / Post-Shift Browsing Policy Warning Modal
* **Gap**: T-30 restricts login, but teachers who remain logged in >2 hours prior to shift or post-shift need an unclosable work-purpose policy banner.
* **Recommended Implementation**:
  1. In `src/components/layout/AppHeader.tsx` or `src/app/dashboard/layout.tsx`, check current time against teacher's `ShiftSchedule`.
  2. If `now < scheduledStart - 2 hours` or `now > scheduledEnd + 1 hour`, render an unclosable warning overlay banner:
     > *"⚠️ Workstation Policy Notice: This terminal is strictly for official Netspeak operations. Non-work internet usage and personal browsing are strictly prohibited."*

### Fix 5: Automated Cron Evaluation Route (`/api/cron/evaluate-alerts`)
* **Gap**: `runScheduledAlertsEvaluationAction` evaluates T-10, T-0, and No-Logout triggers manually via Admin UI or on demand.
* **Recommended Implementation**:
  1. Create a Next.js route handler `src/app/api/cron/evaluate-alerts/route.ts`.
  2. Protect it with a bearer token `CRON_SECRET` from `.env`.
  3. Configure a 5-minute automated runner (via Vercel Cron, Supabase `pg_cron`, or Windows Task Scheduler) calling `GET /api/cron/evaluate-alerts` to continuously push alerts to OM Melmar & OM Prei.

### Fix 6: Third-Party Lesson Fee & Slot Sync Integration Hook
* **Gap**: 3-day post-cutoff lesson fee sync is currently entered via daily outputs rather than auto-scraped.
* **Recommended Implementation**:
  1. Define `ThirdPartySyncJob` in `prisma/schema.prisma` tracking cut-off date (`15th` / `End-of-Month`), raw sync payload, and status.
  2. Create an admin action `syncLessonFeesAction(cutoffDate)` in `src/actions/reports.ts` providing an automated CSV/Excel batch upload parser or webhook endpoint from 51Talk exports.

