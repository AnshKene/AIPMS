import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Executive Dashboard',
  description: 'Executive delivery dashboard with velocity trajectories, sprint statuses, team workload distribution, and AI insights.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
