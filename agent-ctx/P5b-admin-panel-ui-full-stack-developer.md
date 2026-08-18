# Task P5b-admin-panel-ui — Admin Panel UI (full-stack-developer)

This agent built the complete Admin Panel UI for the "سرزمین عسل" Persian e-commerce site.

## Scope
Build the entire `/admin/*` UI:
- Login page (with username/password)
- Auth-gated panel layout with sidebar
- Dashboard (stat cards + charts + recent activity)
- Manage agents (filter tabs + search + table + actions)
- Agent details (profile + stats + status manager + order/payment history)
- All orders (filter dropdowns + pagination)
- Reports (deep charts + CSV download button)

## Files Created
- `src/components/admin/AdminSidebar.tsx`
- `src/components/admin/AdminHeader.tsx`
- `src/components/admin/StatCard.tsx`
- `src/components/admin/StatusBadge.tsx`
- `src/components/admin/RejectReasonDialog.tsx`
- `src/components/admin/AgentActionsButtons.tsx`
- `src/components/admin/AgentStatusManager.tsx`
- `src/components/admin/AdminDashboardCharts.tsx`
- `src/components/admin/ReportsCharts.tsx`
- `src/components/admin/AgentsFilters.tsx`
- `src/components/admin/OrdersFilters.tsx`
- `src/components/admin/DownloadAgentsCsvButton.tsx`
- `src/app/admin/login/page.tsx`
- `src/app/admin/(panel)/layout.tsx`
- `src/app/admin/(panel)/page.tsx` (dashboard)
- `src/app/admin/(panel)/agents/page.tsx`
- `src/app/admin/(panel)/agents/[id]/page.tsx`
- `src/app/admin/(panel)/orders/page.tsx`
- `src/app/admin/(panel)/reports/page.tsx`

## Notes for Future Agents
- The admin panel uses a `(panel)` route group so the login page lives outside the protected layout — exactly like the agent panel pattern (`src/app/agent/(panel)/`).
- Default admin credentials (already seeded): username=`admin`, password=`admin12345`.
- All admin API endpoints (`/api/admin/*`) and auth (`/api/auth/admin/login`, `/api/auth/admin/logout`) already existed before this task — only UI was added.
- `computeAdminStats()` is called server-side on the dashboard and reports pages directly (no API round-trip).
- Recharts is used in client components (`AdminDashboardCharts`, `ReportsCharts`). The honey color palette has NO indigo/blue.
- The `AgentActionsButtons` component fetches `PATCH /api/admin/agents/[id]` client-side and calls `router.refresh()` to re-run the server component.
- The `RejectReasonDialog` is a controlled shadcn Dialog (open state owned by the parent).
- The CSV download button (`DownloadAgentsCsvButton`) fetches `/api/admin/agents?limit=500` then synthesizes a CSV Blob in-browser with a UTF-8 BOM so Excel opens Persian text correctly.
- Lint passes with 0 errors and 0 warnings. Verified at runtime with curl: `/admin/login`→200, `/admin`→307 (no auth) → `/admin`→200 (with auth), `/admin/agents`, `/admin/orders`, `/admin/reports` all → 200, non-existent agent → 404.

## Design
- Honey color palette throughout (amber/orange/yellow).
- RTL layout, Persian text everywhere.
- Managerial feel with Crown icon, slightly more serious than agent panel.
- Sidebar items: داشبورد، مدیریت نمایندگان، سفارش‌ها، گزارش‌ها + logout.
- Mobile responsive: sidebar collapses to Sheet, tables become card lists on small screens.
