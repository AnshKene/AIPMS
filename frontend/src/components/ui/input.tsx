import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-xl border bg-slate-50/50 dark:bg-slate-900/60 px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 transition-all disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-rose-500 focus-visible:border-rose-500 focus-visible:ring-rose-500/20'
            : 'border-slate-200/80 dark:border-slate-800 focus-visible:border-blue-500 focus-visible:ring-blue-500/20',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export interface FormFieldProps {
  label?: string;
  id?: string;
  helperText?: string;
  errorText?: string;
  children?: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  id,
  helperText,
  errorText,
  children,
  className,
}: FormFieldProps) {
  const helperId = id ? `${id}-helper` : undefined;
  const errorId = id ? `${id}-error` : undefined;

  return (
    <div className={cn('space-y-1.5 text-left', className)}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-bold text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
      )}
      {children}
      {errorText ? (
        <p id={errorId} className="text-[11px] font-medium text-rose-500">
          {errorText}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-[11px] text-slate-400">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

export { Input };
