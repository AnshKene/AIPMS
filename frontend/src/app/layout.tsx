import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Calistoga } from 'next/font/google';
import { AuthProvider } from '@/lib/auth/auth-context';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const calistoga = Calistoga({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    template: '%s | AIPMS',
    default: 'AIPMS - AI-Based Project Management System',
  },
  description: 'Enterprise AI-powered closed-loop project management platform with real-time delivery insights, risk analysis, and team collaboration.',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${calistoga.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
