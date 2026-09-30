$ErrorActionPreference = 'Stop'

$outputPath = Join-Path $PSScriptRoot 'Netspeak-SRS-Requirements-Assessment.docx'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$document = $word.Documents.Add()

function Add-Paragraph {
    param(
        [string]$Text,
        [int]$Style = 0,
        [int]$SpaceAfter = 6
    )

    $paragraph = $document.Paragraphs.Add()
    $paragraph.Range.Text = $Text
    if ($Style -gt 0) { $paragraph.Range.Style = $Style }
    $paragraph.SpaceAfter = $SpaceAfter
    $paragraph.Range.InsertParagraphAfter()
}

function Add-Bullets {
    param([string[]]$Items)

    foreach ($item in $Items) {
        $paragraph = $document.Paragraphs.Add()
        $paragraph.Range.Text = $item
        $paragraph.Range.ListFormat.ApplyBulletDefault()
        $paragraph.SpaceAfter = 3
        $paragraph.Range.InsertParagraphAfter()
    }
}

function Add-Table {
    param([object[]]$Rows)

    $tableRange = $document.Range($document.Content.End - 1, $document.Content.End - 1)
    $table = $document.Tables.Add($tableRange, $Rows.Count, 3)
    $table.Borders.Enable = 1
    $table.AllowAutoFit = $true
    $table.Rows.Item(1).Range.Font.Bold = 1

    for ($rowIndex = 0; $rowIndex -lt $Rows.Count; $rowIndex++) {
        $row = $Rows[$rowIndex]
        $table.Cell($rowIndex + 1, 1).Range.Text = $row[0]
        $table.Cell($rowIndex + 1, 2).Range.Text = $row[1]
        $table.Cell($rowIndex + 1, 3).Range.Text = $row[2]
    }

    $document.Paragraphs.Add().Range.InsertParagraphAfter()
}

try {
    $document.PageSetup.TopMargin = $word.CentimetersToPoints(2.2)
    $document.PageSetup.BottomMargin = $word.CentimetersToPoints(2.2)
    $document.PageSetup.LeftMargin = $word.CentimetersToPoints(2.2)
    $document.PageSetup.RightMargin = $word.CentimetersToPoints(2.2)

    $title = $document.Paragraphs.Add()
    $title.Range.Text = 'Netspeak Portal v2.0'
    $title.Range.Style = -63
    $title.Alignment = 1
    $title.SpaceAfter = 4
    $title.Range.InsertParagraphAfter()

    $subtitle = $document.Paragraphs.Add()
    $subtitle.Range.Text = 'System Requirements Specification Assessment'
    $subtitle.Range.Style = -64
    $subtitle.Alignment = 1
    $subtitle.SpaceAfter = 12
    $subtitle.Range.InsertParagraphAfter()

    $meta = $document.Paragraphs.Add()
    $meta.Range.Text = 'Prepared: September 25, 2026 | Assessment type: static source review'
    $meta.Alignment = 1
    $meta.SpaceAfter = 18
    $meta.Range.InsertParagraphAfter()

    Add-Paragraph 'Executive Summary' 1
    Add-Paragraph 'The repository implements a broad operational portal and covers many primary Netspeak modules. It should be treated as an operational MVP rather than a complete implementation of the supplied System Requirement Specification (SRS). The strongest areas are core portal structure, role-based operations, teacher/admin workflows, attendance-related UI, reporting screens, onboarding, seating, requests, notifications, and management dashboards.'
    Add-Paragraph 'The principal gaps are integration- and automation-heavy requirements: email delivery, file storage, scheduled background jobs, file evidence handling, and domain-specific workflows such as cash loans, certificates, referral fees, penalties, and slot-opening compliance.'

    Add-Paragraph 'Assessment Scope and Method' 1
    Add-Bullets @(
        'Compared the supplied SRS with the repository structure, dashboard routes, server actions, components, and Prisma schema.',
        'Classified a requirement as represented when an identifiable module or implementation surface exists in source code.',
        'Did not treat a route, component, or action as proof of production behavior. Live database, SMTP, storage, scheduler, authentication, and browser/device behavior require runtime verification.',
        'Preserved the repository''s existing uncommitted changes; this assessment does not modify application code.'
    )

    Add-Paragraph 'Coverage Overview' 1
    Add-Table @(
        @('Status', 'Meaning', 'Result'),
        @('Represented', 'Dedicated application modules/actions are present.', 'Core operational scope is broadly represented.'),
        @('Partial / verify', 'A related module exists, but required rules or automation need code/runtime proof.', 'Several critical workflows fall here.'),
        @('No clear evidence', 'No dedicated implementation surface was identified during the static review.', 'Multiple SRS requirements remain outstanding.')
    )

    Add-Paragraph 'Requirements Represented in the Project' 1
    Add-Bullets @(
        'Portal foundation: Next.js application, Prisma persistence layer, authentication helpers, role/access concepts, branches, system settings, and audit-log views.',
        'Teacher operations: teacher directory, profiles, registration, onboarding views, teacher attendance, daily output, requests, announcements, concerns/tickets, and resignation views.',
        'Admin and IT operations: attendance/operations desks, shifts, operational checklists, simulations, ticketing, seating management, and management dashboards.',
        'Operational oversight: notifications, reporting, cut-off reporting, dashboard analytics, branches, audit logs, and management-facing pages.',
        'Data model: centralized schema in Prisma supports the intended single-system operational approach.'
    )

    Add-Paragraph 'Requirements That Are Partial or Need Validation' 1
    Add-Table @(
        @('SRS area', 'Static evidence', 'Required validation'),
        @('Freshness check and attendance', 'Attendance and freshness-check UI/modules are present.', 'Confirm photo capture, official timestamping, T-30/T-10/T-0 rules, late/absent decisions, and alerts.'),
        @('Shift/logout controls', 'Shifts, attendance, and checklists are represented.', 'Confirm logout lockdown, 15-minute window, checklist gates, no-logout detection, and shutdown integration.'),
        @('Daily output workflow', 'Daily output module is present.', 'Confirm required announcement acknowledgement, next-login reminders, and 48-hour correction policy.'),
        @('SRD and ETO', 'Request forms and approval-oriented pages/actions are present.', 'Confirm automatic schedule and attendance updates, reviewer notes, notifications, and 30-minute ETO auto-approval.'),
        @('New-hire requirements', 'Onboarding dashboards and teacher onboarding views are present.', 'Confirm every required checklist item, verification states, three-day rule, and slot-opening eligibility.'),
        @('Notifications', 'Notification actions/components are present.', 'Confirm centralized event handling, recipients, scheduled reminders, and delivery channels.'),
        @('Reports and dashboards', 'Reports, cut-off reports, analytics, and management dashboards are present.', 'Confirm all SRS metrics, filters, export behavior, and data correctness against production records.')
    )

    Add-Paragraph 'Requirements With No Clear Implementation Evidence' 1
    Add-Bullets @(
        'Gmail SMTP account verification, credential delivery, password reset, and email notification delivery.',
        'Supabase Storage uploads for selfies, evidence/attachments, resignation letters, and other supporting files.',
        'Cash-loan requests, policy terms, deduction schedules, and due-date reminders.',
        'Exit-interview slot opening, booking, confirmation, and interview-day reminders.',
        'Teacher social-media monitoring tied to active login/logout periods.',
        'Slot-opening compliance tracking, deadlines, and reminder automation.',
        'Automated Certificate of Service generation from teacher profile data.',
        'Referral monitoring and referral-fee status tracking.',
        'Configurable attendance penalty rules synchronized into cut-off reporting.',
        'Resignation/AWOL automation to notify IT, create reformat tasks, release seating, and update TPCAP lists.',
        'Production scheduler/cron execution for alerts, simulation schedules, and other recurring rules.',
        'Windows/PC shutdown behavior after logout.'
    )

    Add-Paragraph 'Key Risks' 1
    Add-Bullets @(
        'A visible dashboard or form does not by itself satisfy the SRS when the requirement depends on an automated downstream action.',
        'External dependencies are not proven by a static checkout: SMTP credentials, Supabase configuration, storage buckets, browser camera permissions, and scheduled-job hosting must be verified in a deployed environment.',
        'Attendance and approval rules affect operational records and should be validated with end-to-end test scenarios before rollout.'
    )

    Add-Paragraph 'Recommended Completion Priorities' 1
    Add-Table @(
        @('Priority', 'Focus', 'Why it matters'),
        @('1', 'Attendance, shifts, and approval synchronization', 'These are core operational controls and source data for reports.'),
        @('2', 'File storage, SMTP, and scheduled automation', 'These unlock mandatory evidence, notifications, reminders, and document workflows.'),
        @('3', 'Unimplemented domain modules', 'Cash loans, exit interviews, certificates, referrals, penalties, and slot compliance close explicit SRS gaps.'),
        @('4', 'End-to-end acceptance testing', 'Confirms RBAC, calculations, reports, notifications, and auditability with real data.')
    )

    Add-Paragraph 'Conclusion' 1
    Add-Paragraph 'Netspeak Portal v2.0 has a strong structural base and broad module coverage, but it does not yet demonstrate complete compliance with the full SRS. Completion should focus on verifying and implementing the automation, integrations, data synchronization, and specialist workflows listed above. A final acceptance decision should follow a live, role-based test pass against a deployed environment.'

    $document.SaveAs([ref]$outputPath, [ref]16)
}
finally {
    if ($document) { $document.Close() }
    if ($word) { $word.Quit() }
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($document) | Out-Null
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
