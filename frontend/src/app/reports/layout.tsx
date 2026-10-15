import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analytics & Reports',
  description: 'Project delivery reporting, status breakdowns, and printable operational summaries.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
