/**
 * Operational Checklist Definitions for Admin and IT Roles
 * Per Netspeak-System-Specification.md §9.2, §12, §28.1, §28.2, §29
 */

export interface ChecklistItemDef {
  key: string;
  label: string;
  category: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  role: 'ADMIN' | 'IT';
  description?: string;
}

export const ADMIN_DAILY_CHECKLIST: ChecklistItemDef[] = [
  {
    key: 'ADMIN_CENTER_OPENING',
    label: 'Center opening routine & air conditioning inspection completed',
    category: 'DAILY',
    role: 'ADMIN',
    description: 'Ensure premises are unlocked, lighted, and climate-controlled.',
  },
  {
    key: 'ADMIN_TEACHER_ARRIVAL_CHECK',
    label: 'Morning/Afternoon teacher arrival and freshness check verification',
    category: 'DAILY',
    role: 'ADMIN',
    description: 'Check attendance roster for T-10 freshness check compliance.',
  },
  {
    key: 'ADMIN_CLASSROOM_READINESS',
    label: 'Classroom cubicles, headsets, and cleanliness verified',
    category: 'DAILY',
    role: 'ADMIN',
    description: 'Confirm teaching stations have functioning hardware and sanitation.',
  },
  {
    key: 'ADMIN_TICKET_REVIEW',
    label: 'Pending teacher concern & incident tickets processed',
    category: 'DAILY',
    role: 'ADMIN',
    description: 'Review active tickets submitted during the shift.',
  },
  {
    key: 'ADMIN_DAILY_OUTPUT_RECONCILE',
    label: 'Shift daily outputs & departure acknowledgments reconciled',
    category: 'DAILY',
    role: 'ADMIN',
    description: 'Verify teachers have submitted daily slot outputs prior to sign-off.',
  },
  {
    key: 'ADMIN_CENTER_CLOSING',
    label: 'End-of-day facility lockdown & lights-out verification',
    category: 'DAILY',
    role: 'ADMIN',
    description: 'Ensure all non-critical electronics are shut down and doors secured.',
  },
];

export const IT_DAILY_CHECKLIST: ChecklistItemDef[] = [
  {
    key: 'IT_NETWORK_INTEGRITY',
    label: 'Primary & secondary ISP bandwidth and latency diagnostics verified',
    category: 'DAILY',
    role: 'IT',
    description: 'Ping tests, gateway response time, and load balancer health.',
  },
  {
    key: 'IT_SERVER_ROOM_CHECK',
    label: 'Server rack temperature, UPS power status & switches visual check',
    category: 'DAILY',
    role: 'IT',
    description: 'Inspect rack lights, battery levels, and ambient temperature.',
  },
  {
    key: 'IT_WORKSTATION_AUDIT',
    label: 'Workstation hardware, audio drivers & browser audio check',
    category: 'DAILY',
    role: 'IT',
    description: 'Confirm noise-cancelling mics and camera inputs function normally.',
  },
  {
    key: 'IT_REFORMAT_CLEARANCE',
    label: 'Pending PC reformat / offboarding cleanups processed',
    category: 'DAILY',
    role: 'IT',
    description: 'Execute OS reimaging or credential wipe on vacated stations.',
  },
  {
    key: 'IT_TICKET_RESOLUTION',
    label: 'Assigned IT equipment and system tickets reviewed & updated',
    category: 'DAILY',
    role: 'IT',
    description: 'Address open hardware/software tickets in the queue.',
  },
];

export const IT_WEEKLY_CHECKLIST: ChecklistItemDef[] = [
  {
    key: 'IT_WEEKLY_BACKUP_VERIFY',
    label: 'Off-site backup sync and snapshot integrity verified',
    category: 'WEEKLY',
    role: 'IT',
  },
  {
    key: 'IT_WEEKLY_CABLE_MANAGEMENT',
    label: 'Floor cable trays, power strips and patch panel inspection',
    category: 'WEEKLY',
    role: 'IT',
  },
  {
    key: 'IT_WEEKLY_PERIPHERALS_INVENTORY',
    label: 'Spare headsets, webcams, mice & keyboards inventory count',
    category: 'WEEKLY',
    role: 'IT',
  },
];

export const IT_MONTHLY_CHECKLIST: ChecklistItemDef[] = [
  {
    key: 'IT_MONTHLY_GENSET_CHECK',
    label: 'Genset fuel level, battery charge & manual start test log',
    category: 'MONTHLY',
    role: 'IT',
  },
  {
    key: 'IT_MONTHLY_FIREWALL_SECURITY',
    label: 'Firewall rules, router firmware updates & guest Wi-Fi rotation',
    category: 'MONTHLY',
    role: 'IT',
  },
  {
    key: 'IT_MONTHLY_OS_PATCHING',
    label: 'Centralized OS updates and antivirus definitions deployment',
    category: 'MONTHLY',
    role: 'IT',
  },
];
