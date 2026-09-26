import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback = 'AP', ...props }, ref) => {
    const [hasError, setHasError] = React.useState(false);

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-sm font-medium text-slate-700 items-center justify-center select-none',
          className,
        )}
        {...props}
      >
        {src && !hasError ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={src}
            alt={alt || 'Avatar'}
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
