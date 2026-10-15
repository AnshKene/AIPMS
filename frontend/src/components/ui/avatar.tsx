import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback = 'U', size = 'md', ...props }, ref) => {
    const [hasError, setHasError] = React.useState(false);

    return (
      <div
        ref={ref}
        role="img"
        aria-label={alt || fallback || 'User Avatar'}
        className={cn(
          'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-200/80 dark:border-blue-800/60 bg-blue-100 dark:bg-blue-950/60 font-bold text-blue-700 dark:text-blue-300 select-none transition-colors',
          size === 'sm' && 'h-7 w-7 text-[10px]',
          size === 'md' && 'h-9 w-9 text-xs',
          size === 'lg' && 'h-11 w-11 text-sm',
          className,
        )}
        {...props}
      >
        {src && !hasError ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={src}
            alt={alt || 'Avatar'}
            loading="lazy"
            decoding="async"
            onError={() => setHasError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{fallback}</span>
        )}
      </div>
    );
  },
);
Avatar.displayName = 'Avatar';

export { Avatar };
