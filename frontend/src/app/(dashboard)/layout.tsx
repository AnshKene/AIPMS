import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'System Administration',
  description: 'AIPMS Platform Administration and Governance',
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardRouteGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
