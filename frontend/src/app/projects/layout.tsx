import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Projects Workspace',
  description: 'Manage enterprise projects, milestones, task completions, and delivery progress across teams.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
