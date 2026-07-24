import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        // Layout & shape
        'flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2.5',
        // Typography
        'text-sm leading-relaxed',
        // Placeholder
        'placeholder:text-muted-foreground/60',
        // Shadow & transitions
        'shadow-sm transition-[border-color,box-shadow]',
        // Focus
        'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0',
        // Disabled
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
        // Resize
        'resize-y',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
