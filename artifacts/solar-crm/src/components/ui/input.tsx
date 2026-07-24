import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Layout & shape
          'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm',
          // Placeholder
          'placeholder:text-muted-foreground/60',
          // Shadow & transitions
          'shadow-sm transition-[border-color,box-shadow]',
          // Focus
          'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0',
          // File input
          'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
          // Disabled
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
