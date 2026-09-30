# Netspeak Source-of-Truth UX Audit

**Source:** `Netspeak-System-Specification.md`  
**Rule:** The specification overrides earlier implementation-status and audit claims.

## Verified user journeys

| Specification area | Current implementation | Status |
| --- | --- | --- |
| Teacher registration, deduplication, review, approval, and account activation | Registration, admin review, operations approval, and server-side RBAC are implemented. | Implemented |
| Freshness Check and shift timing | Camera capture, T-30/T-10/T-0 rules, T-15 logout guard, attendance roster, and private Storage upload are implemented. | Implemented and live Storage verified |
| Daily output, SRD, and ETO | Teacher submission, history, manager approval, SRD attendance synchronization, and ETO auto-approval are implemented. | Implemented |
| Incident and teacher concern tickets | Required categories and lifecycle are implemented; incident and concern image evidence upload to private Supabase Storage. | Implemented and live Storage verified |
| Admin and IT operations | Staff attendance, mandatory checklists, and simulation drills are implemented. | Implemented |
| Resignation, exit interview, seating, onboarding, reports, notifications, and audit logs | Dedicated routes and workflows are present. | Implemented |

## Confirmed gaps to close

1. **Cash Loan (Â§8.2):** no dedicated request form, policy terms acknowledgement, repayment schedule, or due-date reminder workflow exists.
2. **Equipment Replacement / Maintenance (Â§8.3):** the concern ticket supports technical concerns, but no dedicated equipment classification and maintenance/replacement workflow exists.
3. **Authentication emails (Â§41):** password reset, email verification, and SMTP-backed credential delivery are not implemented as user-facing flows.
4. **Automated scheduler trigger (Â§44):** alert evaluation exists, but no protected scheduled route and deployment scheduler configuration is present.
5. **External/system-bound requirements:** social-media monitoring and Windows shutdown require approved external agents or service integration; they cannot be delivered solely by the web application.

## Acceptance rule

Each gap is complete only when its data model, role-specific UI, server-side authorization, required notifications, and a focused build/runtime check are all present. Live Supabase Storage verification passed on September 26, 2026 for `freshness-checks` and `ticket-evidence`.
