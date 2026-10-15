import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sprint Management',
  description: 'Sprint planning, active iteration tracking, sprint health metrics, and backlog grooming.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SprintsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
