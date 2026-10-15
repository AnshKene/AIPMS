import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AIPMS - AI-Based Project Management System',
    short_name: 'AIPMS',
    description: 'Enterprise AI-powered closed-loop project management platform',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0F172A',
    theme_color: '#0052FF',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/favicon.ico',
        sizes: '32x32',
        type: 'image/x-icon',
      },
    ],
  };
}
