# Netspeak Portal — Current Updates & Subscription Lockout Documentation

**Date:** October 13, 2026  
**System Version:** Netspeak Portal v2.0  
**Author / Engineering:** Innov8IT Development Team  

---

## 1. Executive Summary

Instead of exposing an open external API, Netspeak Portal has transitioned into a **SaaS Monthly Subscription & Automated Payment Lockout Model**. Under this policy, tenant access requires regular monthly payment settlement. If an account becomes overdue and exceeds the designated grace period, access is automatically locked for regular teachers and staff, while administrators retain access to a dedicated billing desk to submit payment verification and reactivate the system.

---

## 2. Architecture & Data Model

### 2.1 Prisma Schema Models (`prisma/schema.prisma`)

Two new models and two enums were introduced to govern lifecycle tracking and transaction auditing:

```prisma
enum SubscriptionStatus {
  ACTIVE
  GRACE_PERIOD
  PAST_DUE
  LOCKED
  SUSPENDED
}

enum PaymentProofStatus {
  PENDING
  VERIFIED
  REJECTED
}

model SystemSubscription {
  id                  String             @id @default(uuid())
  organizationName    String             @default("Netspeak Learning Inc.")
  planName            String             @default("Netspeak Monthly Enterprise")
  monthlyFeePhp       Decimal            @default(15000.00)
  status              SubscriptionStatus @default(ACTIVE)
  currentPeriodStart  DateTime           @default(now())
  currentPeriodEnd    DateTime           // Due date
  gracePeriodDays     Int                @default(5)
  gracePeriodEnd      DateTime           // Hard lock date
  lastPaymentDate     DateTime?
  nextBillingDate     DateTime
  contactEmail        String?
  contactPhone        String?
  paymentInstructions String?            @db.Text
  updatedAt           DateTime           @updatedAt
  createdAt           DateTime           @default(now())

  paymentSubmissions  SubscriptionPayment[]
}

model SubscriptionPayment {
  id               String              @id @default(uuid())
  subscriptionId   String
  subscription     SystemSubscription  @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  amountPaidPhp    Decimal
  paymentDate      DateTime            @default(now())
  paymentMethod    String              // e.g. "GCash", "Bank Transfer (BDO)", "Maya"
  referenceNumber  String
  proofImageUrl    String?
  notes            String?             @db.Text
  status           PaymentProofStatus  @default(PENDING)
  submittedByUserId String?
  verifiedByUserId String?
  verifiedAt       DateTime?
  rejectionReason  String?
  periodExtendedMonths Int             @default(1)
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt

  @@index([subscriptionId])
  @@index([status])
  @@index([referenceNumber])
}
```

---

## 3. Core Engine & Lockout Rules

### 3.1 Status Evaluation (`src/lib/subscription.ts`)

The subscription engine computes tenant state based on system time:

* **Active (`ACTIVE`)**: `currentTime <= currentPeriodEnd`. Normal operations; no banners or restrictions.
* **Grace Period (`GRACE_PERIOD`)**: `currentPeriodEnd < currentTime <= gracePeriodEnd`.
  * Standard grace period: **5 calendar days** from due date.
  * System remains usable by all teachers and staff.
  * An alert banner is displayed across the top of `/dashboard` with a live day countdown and a payment CTA.
* **Hard Lockout (`LOCKED`)**: `currentTime > gracePeriodEnd` or manually set to `LOCKED`/`SUSPENDED`.
  * **Teacher & Operational Staff**: Immediately blocked from entering `/dashboard` and redirected to `/subscription-locked`.
  * **System Administrator & Center Admin**: Access preserved on `/dashboard` with a red administrative notice, enabling billing review and payment verification.

---

## 4. User Interface & Workflows

### 4.1 Subscription Lock & Settlement Desk (`/subscription-locked`)
* **Path**: [`src/app/subscription-locked/page.tsx`](file:///c:/Users/Admin/Desktop/NETSPEAKv2/src/app/subscription-locked/page.tsx) & [`SubscriptionLockClient.tsx`](file:///c:/Users/Admin/Desktop/NETSPEAKv2/src/app/subscription-locked/SubscriptionLockClient.tsx)
* **Features**:
  * Visual lock indicator with plan name and company title.
  * Clear settlement overview: Monthly fee (`₱15,000.00`), due date, and hard lockout date.
  * Formatted payment instructions (BDO Unibank, GCash, Maya).
  * **Payment Submission Form**:
    * Method selection (`Bank Transfer (BDO)`, `Bank Transfer (BPI)`, `GCash`, `Maya`, `Corporate Check`).
    * Amount paid input.
    * Transaction reference / confirmation number input.
    * Memo / notes field.
  * **Recent Payment Records**:
    * Real-time list of submitted payment reference numbers.
    * Color-coded status badges: `PENDING` (yellow), `VERIFIED` (green), `REJECTED` (red).
    * One-click **"Verify & Unlock"** button for administrators.

### 4.2 Dashboard Layout Enforcement (`src/app/dashboard/layout.tsx`)
* Evaluates subscription status server-side on every dashboard request.
* Renders a warning notification bar when in Grace Period.
* Renders a dedicated Administrator alert when the system is in Locked mode for staff.

### 4.3 Server Actions (`src/actions/subscriptionActions.ts`)
* `submitPaymentProof(formData)`: Records new payment reference submission.
* `approvePaymentAndExtend(paymentId, monthsToExtend)`:
  * Admin-gated action.
  * Marks record as `VERIFIED`.
  * Automatically shifts `currentPeriodEnd` forward by specified months (default: 1 month).
  * Recalculates `gracePeriodEnd` (`newDue + 5 days`).
  * Resets system status to `ACTIVE`.

---

## 5. Build, Performance & Type Safety

* **Type Safety (`npx tsc --noEmit`)**: 0 TypeScript errors.
* **Production Build (`npm run build`)**: Successfully compiled all 37 application routes.
* **Architecture Fix**: Extracted `STANDARD_REQUIREMENTS` into [`src/lib/operations/onboardingConstants.ts`](file:///c:/Users/Admin/Desktop/NETSPEAKv2/src/lib/operations/onboardingConstants.ts) to adhere to Next.js 16 `"use server"` constraints.
* **Automated DOM & Browser Testing**: Verified with browser test recording, confirming login, route navigation, DOM styling, and payment proof submission.

---

## 6. Verification Checklist

- [x] Schema synchronized to Supabase PostgreSQL via `prisma db push`
- [x] `getOrCreateSystemSubscription()` singleton initialization
- [x] Grace period warning banner rendered on `/dashboard`
- [x] Hard lockout redirection for non-admin accounts
- [x] Admin override for billing resolution
- [x] Payment proof reference submission form
- [x] "Verify & Unlock" action extending validity by 1 month
- [x] Zero TypeScript compilation errors
- [x] Successful Next.js 16 production build
