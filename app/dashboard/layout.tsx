// No layout wrapper here — each dashboard page manages its own shell.
// TemplateDashboard (main /dashboard) has its own full-screen layout.
// Sub-pages (/dashboard/agents, /calls, etc.) use AppSidebar directly.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
