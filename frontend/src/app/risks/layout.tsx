import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Risk Management Matrix',
  description: 'Project risk register, probability-impact matrix, mitigation action items, and risk scoring.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function RisksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
