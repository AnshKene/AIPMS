import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Team Directory & Access',
  description: 'Cross-functional project teams, role assignments, leadership tracking, and membership administration.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function TeamsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
