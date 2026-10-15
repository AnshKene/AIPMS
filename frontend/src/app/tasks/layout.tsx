import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Task Lifecycle & Kanban',
  description: 'Interactive Kanban board and task lifecycle management with dependency tracking and priority filters.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
