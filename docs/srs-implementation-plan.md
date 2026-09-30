# Netspeak Portal v2.0 — Comprehensive SRS Implementation Plan

> **Goal**: Fully implement all remaining ignored (❌) and incomplete/partially implemented (⚠️) requirements identified in [`docs/srs-requirements-gap-analysis.md`](file:///c:/Users/Admin/Desktop/NETSPEAKv2/docs/srs-requirements-gap-analysis.md) based on the official [`docs/System-Requirement-Specification.pdf`](file:///c:/Users/Admin/Desktop/NETSPEAKv2/docs/System-Requirement-Specification.pdf).  
> **Target Stack**: Next.js 16 (App Router, Turbopack) + TypeScript + Prisma ORM + PostgreSQL (Supabase) + Vanilla CSS  
> **Status**: Ready for Execution

---

## Architecture & Phasing Overview

```mermaid
graph TD
    subgraph Phase 1: High-Impact Operational Gaps
        P1A["1.1 Teacher Referral Engine (§XXI)"]
        P1B["1.2 Slot-Opening Compliance & Reminders (§XIX)"]
        P1C["1.3 Birthday Recognition Banner & Incentives (§5)"]
    end

    subgraph Phase 2: Intelligence & Workflow Automation
        P2A["2.1 Low-Booking Multi-Day Intelligence (§5, §XXXI)"]
        P2B["2.2 Cash Loan Payroll Deduction Sync (§4.2)"]
        P2C["2.3 Exit Interview Auto-Opening & Day-of Reminder (§IX)"]
        P2D["2.4 Resignation TPCAP Roster Automation (§XVIII)"]
    end

    subgraph Phase 3: Administration & IT Task Desk
        P3A["3.1 Admin & IT Task Productivity Desk (§VI, §XXV)"]
        P3B["3.2 Daily Executive Summary Push to OM Melmar & Prei (§XXVII)"]
        P3C["3.3 IT Weekly & Monthly Checklist Submission Desk (§XXV)"]
    end

    subgraph Phase 4: Integrations & External Hooks
        P4A["4.1 External SMTP Delivery & Password Reset Flow (§1.4, §41)"]
        P4B["4.2 Lesson Fee Cut-Off Sync Staging Hook (§5)"]
        P4C["4.3 Social Media Shift Monitoring Hook (§XVI)"]
    end

    Phase 1 --> Phase 2
    Phase 2 --> Phase 3
    Phase 3 --> Phase 4
```

---

## Phase 1: High-Impact Operational Gaps

### 1.1 Teacher Referral Monitoring (§XXI, p. 17)
* **Objective**: Fulfill rule *"Were you referred by a current teacher?"* during teacher registration, track the referral lifecycle, and enforce referral fee forfeiture if not declared at application.
* **Schema Updates (`prisma/schema.prisma`)**:
  - Add enums:
    ```prisma
    enum ReferralStatus {
      PENDING
      HIRED
      ACTIVE_PROBATIONARY
      REGULARIZED
      DISQUALIFIED
    }
    enum ReferralFeeStatus {
      NOT_APPLICABLE
      PENDING_ELIGIBILITY
      APPROVED_FOR_PAYMENT
      PAID
      FORFEITED
    }
    ```
  - Add `referredByTeacherId` (`String?`), `referringTeacherName` (`String?`), `referralStatus` (`ReferralStatus?`), `referralFeeStatus` (`ReferralFeeStatus?`), and `referralNotes` (`String?`) to `TeacherProfile`.
  - Add relation `referrals TeacherProfile[] @relation("TeacherReferrals")`.
* **Server Actions (`src/actions/teachers.ts` & new `src/actions/referrals.ts`)**:
  - Update `registerTeacherAction` to validate and accept optional referral fields.
  - Create `getReferralMonitoringAction()` returning all applicants/teachers with referrals, hiring status, launch date, and fee payment status.
  - Create `updateReferralFeeStatusAction(teacherId, feeStatus, notes)` restricted to `MANAGEMENT` and `ADMIN`.
* **UI Components**:
  - Update `src/components/teachers/TeacherRegistrationForm.tsx` Step 1/3 with radio *"Were you referred by a current teacher?"* and autocomplete/input for referring teacher name with legal disclaimer.
  - Add **Referrals Tab** in `/dashboard/teachers` (`src/components/teachers/ReferralMonitoringDesk.tsx`) displaying applicant name, referrer, starting date, hiring status, and payout authorization toggle.
  - Add Referral overview widget in Management Dashboard (`/dashboard/management`).

---

### 1.2 Slot-Opening Compliance & Reminders (§XIX, p. 16)
* **Objective**: Enforce the policy that teachers must open slots 1 month in advance, display compliance deadlines, and trigger automatic reminders **3 days before the deadline**.
* **Schema Updates (`prisma/schema.prisma`)**:
  - Add model `SlotOpeningCompliance`:
    ```prisma
    model SlotOpeningCompliance {
      id               String   @id @default(uuid())
      teacherId        String
      teacher          TeacherProfile @relation(fields: [teacherId], references: [id], onDelete: Cascade)
      targetMonth      String   // e.g. "November 2026"
      deadlineDate     DateTime // 1st of previous month
      slotsOpenedCount Int      @default(0)
      isCompliant      Boolean  @default(false)
      reminderSentAt   DateTime?
      verifiedAt       DateTime?
      verifiedById     String?
      createdAt        DateTime @default(now())
      updatedAt        DateTime @updatedAt
      @@unique([teacherId, targetMonth])
    }
    ```
* **Server Actions & Scheduled Jobs**:
  - In `src/actions/scheduledJobs.ts`, add slot opening evaluator in `runScheduledAlertsEvaluationAction`:
    - Checks teachers who haven't met slot opening threshold by `deadlineDate - 3 days`.
    - Dispatches high-priority `SLOT_DEADLINE` in-app notification.
  - Create `getSlotComplianceReportAction(month)` in `src/actions/slots.ts`.
* **UI Components**:
  - Add Slot Compliance status badge and tracker in Teacher Dashboard (`/dashboard`).
  - Add Slot Compliance desk in `/dashboard/teachers` or `/dashboard/operations`.

---

### 1.3 Teacher Birthday Recognition Banner & Incentives (§5, p. 3)
* **Objective**: Display an official birthday banner across the portal whenever an active teacher celebrates a birthday, with direct action buttons for Managers/Officers to award incentives (Cash Voucher / In-Kind Token).
* **Schema Updates (`prisma/schema.prisma`)**:
  - Add model `TeacherIncentive`:
    ```prisma
    enum IncentiveType {
      BIRTHDAY_CASH_VOUCHER
      BIRTHDAY_IN_KIND_TOKEN
      PERFORMANCE_AWARD
      OTHER
    }
    model TeacherIncentive {
      id          String        @id @default(uuid())
      teacherId   String
      teacher     TeacherProfile @relation(fields: [teacherId], references: [id], onDelete: Cascade)
      type        IncentiveType
      amountPhp   Decimal?
      description String
      grantedById String
      grantedByName String
      grantedAt   DateTime      @default(now())
    }
    ```
* **Server Actions (`src/actions/incentives.ts`)**:
  - `getTodayTeacherBirthdaysAction()`: queries active teachers whose birthday month/day match today (Manila PHT).
  - `grantTeacherIncentiveAction(teacherId, type, amount, remarks)`.
* **UI Components**:
  - Create `TeacherBirthdayBanner.tsx` in `src/components/layout/AppHeader.tsx` or top of `/dashboard`.
  - For Managers/Admins, clicking the banner opens a modal: *"Grant Birthday Incentive to [Teacher Name]"* (Cash Voucher ₱500 / Token).
  - Record audit log for awarded incentives.

---

## Phase 2: Intelligence & Workflow Automation

### 2.1 Low-Booking Multi-Day Intelligence Tab (§5, p. 3 & §XXXI, p. 24)
* **Objective**: Track consecutive under-booking patterns across 1-day, 3-day (URGENT), and 5-day (CRITICAL) thresholds, with recommended manager actions.
* **Logic & Algorithm (`src/actions/intelligence.ts`)**:
  - Daily output has `bookedSlots` and `openSlots`. Threshold rule: Booking rate $< 50\%$ or booked slots $< 10$.
  - Evaluate last 5 active working days:
    - **1 Day Under-Target**: Flag: *"TPCAP Profile Upgrade Recommended"*.
    - **3 Consecutive Days Under-Target**: Severity: **URGENT** $\rightarrow$ Manager outreach flag.
    - **5 Consecutive Days Under-Target**: Severity: **CRITICAL** $\rightarrow$ Immediate corrective intervention.
* **UI Components**:
  - Add **Low-Booking Intelligence Tab** in `/dashboard/management` (`src/components/management/LowBookingIntelligenceTab.tsx`).
  - Table displaying: Teacher, Branch, Consecutive Days Low, Booking %, Status Badge, and One-Click Action button (*"Request TPCAP Upgrade"*, *"Notify Teacher"*).

---

### 2.2 Cash Loan Payroll Deduction Sync (§4.2, p. 2)
* **Objective**: Automatically sync approved cash loan terms into the semi-monthly cut-off calculation so deductions are subtracted from net compensation.
* **Implementation (`src/actions/reports.ts`)**:
  - In `getCutOffReportAction`, query approved `CashLoanRequest` where `status = APPROVED` and remaining balance $> 0$.
  - Calculate deduction for the current cutoff: `Math.min(request.deductionPerCutoff, remainingBalance)`.
  - Display loan deductions as an explicit deduction column in the cut-off report table alongside absence penalties.
  - Add deduction ledger history in the teacher's self-service requests view.

---

### 2.3 Exit Interview Slot Auto-Opening & Day-of Reminder (§IX, p. 10)
* **Objective**: Automate slot generation on the 1st of every month and trigger interview reminders on the morning of the appointment.
* **Implementation**:
  - In `src/actions/scheduledJobs.ts`, if today is the 1st day of the month, auto-seed default interview slots for the OM Assistant (`OM Prei`).
  - Add daily morning alert scan: If teacher has an exit interview booked for `today`, push high-priority in-app notification and email alert.

---

### 2.4 Resignation TPCAP Roster Automation (§XVIII, p. 16)
* **Objective**: When a teacher is tagged as Resigned or AWOL, automatically flag TPCAP removal and generate notification events.
* **Implementation**:
  - In `deactivateResignedTeacherAction` (`src/actions/resignation.ts`):
    - Update `TeacherProfile.registrationStatus` or add `operationalStatus = RESIGNED/AWOL`.
    - Auto-create a high-priority `Notification` to Operations Managers and TPCAP coordinator: *"Teacher [Name] Resigned/AWOL — Workstation [PC#] marked for reformat; Remove from active TPCAP rosters"*.
    - Log event in audit log (`TPCAP_ROSTER_DEACTIVATION`).

---

## Phase 3: Administration & IT Task Desk

### 3.1 Admin & IT Task Productivity Desk (§VI, p. 8 & §XXV, p. 19)
* **Objective**: Provide an operational desk tracking daily, weekly, and monthly tasks completed vs. pending across teacher concerns, attendance reconciliations, resignations, SRDs, and incident reports.
* **Server Action (`src/actions/taskMonitoring.ts`)**:
  - Aggregate metrics per branch and date range:
    - Teacher concerns resolved vs. pending.
    - Attendance reconciliations done vs. unverified.
    - Incident reports resolved vs. in investigation.
    - Resignations processed.
    - SRD / ETO requests reviewed.
* **UI Components**:
  - Add **Operations Productivity Desk** in `/dashboard/operations/tasks` with Daily, Weekly, and Monthly breakdown views and staff attribution.

---

### 3.2 Daily Executive Summary Push to OM Melmar & Prei (§XXVII, p. 20)
* **Objective**: Automatically compile an end-of-day summary of Admin and IT attendance/checklist statuses and dispatch directly to OM Melmar and OM Prei.
* **Implementation**:
  - Add `generateDailyStaffOperationsSummaryAction()` in `src/actions/staffOperations.ts`.
  - Wire into `/api/cron/evaluate-alerts` to fire at end of day (e.g. 23:00 PHT):
    - Tallies Admin (Present, Late, Early Out, Absent, SRD, No Login, No Logout, Incomplete Checklist).
    - Tallies IT (Present, Late, Early Out, Absent, SRD, No Login, No Logout, Incomplete Checklist).
    - Dispatches a targeted system notification to all users with `OPERATIONS_MANAGER` or `MANAGEMENT` roles.

---

### 3.3 IT Weekly & Monthly Checklist Submission Desk (§XXV, p. 19)
* **Objective**: Provide dedicated weekly and monthly checklist submission and historical tracking interfaces for IT staff.
* **Implementation**:
  - Create `/dashboard/operations/it-schedules` allowing IT personnel to check off weekly routines (backup, cable management, peripheral inventory) and monthly routines (genset maintenance, firewall review, OS patching).
  - Store submissions in `StaffChecklistResponse` linked with periodicity (`WEEKLY`, `MONTHLY`).

---

## Phase 4: Integrations & External Hooks

### 4.1 Production SMTP Email Transport & Password Reset (§1.4, §41)
* **Objective**: Enable live SMTP email dispatch for credentials, password resets, and critical alerts.
* **Implementation**:
  - Configure nodemailer transport with Gmail / SendGrid / Amazon SES in `src/lib/email.ts`.
  - Add `/forgot-password` and `/reset-password` self-service token flows using bcrypt-hashed tokens with 1-hour expiration.

### 4.2 Lesson Fee Cut-Off Sync Staging Hook (§5, p. 3)
* **Objective**: Provide a semi-automated upload/sync hook 3 days after cut-off (18th and 3rd/4th) to ingest external lesson fees from 51Talk.
* **Implementation**:
  - Build `LessonFeeSyncDesk.tsx` in `/dashboard/reports` supporting CSV/Excel drag-and-drop parser matching teacher portal usernames to actual lesson payouts.

### 4.3 Social Media Shift Monitoring Hook (§XVI, p. 15)
* **Objective**: Address the SRS rule *"Teacher Login $\rightarrow$ Social Media Monitoring Starts"*.
* **Implementation**:
  - Web applications cannot sniff external desktop browser traffic directly.
  - Implement a policy monitor hook:
    - Extend `scripts/workstation-local-guard.ps1` to log active browser processes or block known social media domains during active duty hours.
    - Provide an in-portal Shift Compliance Activity log in the attendance desk.

---

## Verification & Acceptance Criteria

1. **Schema Integrity**: `npx prisma db push` succeeds without breaking existing data.
2. **Type Safety**: `npx tsc --noEmit` passes with 0 errors.
3. **Build Cleanliness**: `npm run build` succeeds across all routes.
4. **RBAC Enforcement**: All new server actions strictly enforce permissions via `requirePermission()`.
5. **Multi-Branch Isolation**: All new views honor the active user's branch scope.
