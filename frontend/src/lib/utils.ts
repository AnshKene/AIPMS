import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatProjectName(name?: string | null): string {
  if (!name) return 'Untitled Project';
  if (/^[A-Z0-9_]+$/.test(name) && name.includes('_')) {
    return name
      .split('_')
      .map((word) =>
        word === 'AIPMS' || word === 'AI' || word === 'ID' || word === 'API'
          ? word
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
      )
      .join(' ');
  }
  return name;
}
