import DashboardShell from './dashboard-shell';

// Server actions called from dashboard pages (CV scans, CV Builder, Bubbl)
// wait on Gemini, which can take longer than Vercel's default limit.
export const maxDuration = 60;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
