import React from 'react';
import { requirePermission, PERMISSIONS } from '@/lib/auth/rbac';
import { getCutOffReportAction, getStaffOperationsReportAction } from '@/actions/reports';
import CutOffReportsView from '@/components/reports/CutOffReportsView';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  await requirePermission(PERMISSIONS.REPORTS_VIEW);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  // Default to Current Cut-Off (1-15 or 16-End)
  let start = new Date();
  let end = new Date();

  if (day <= 15) {
    start = new Date(year, month, 1);
    end = new Date(year, month, 15);
  } else {
    start = new Date(year, month, 16);
    end = new Date(year, month + 1, 0);
  }

  const defaultStartDate = start.toISOString().split('T')[0];
  const defaultEndDate = end.toISOString().split('T')[0];

  const [teacherRes, staffRes] = await Promise.all([
    getCutOffReportAction({
      startDate: defaultStartDate,
      endDate: defaultEndDate,
    }),
    getStaffOperationsReportAction({
      startDate: defaultStartDate,
      endDate: defaultEndDate,
    }),
  ]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <CutOffReportsView
        initialReportData={teacherRes.success ? teacherRes.data || null : null}
        initialStaffData={staffRes.success ? staffRes.data || [] : []}
        defaultStartDate={defaultStartDate}
        defaultEndDate={defaultEndDate}
      />
    </div>
  );
}
