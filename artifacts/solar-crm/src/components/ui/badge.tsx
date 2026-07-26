import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  // Base — badges never wrap, always pill-shaped
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        // Primary (amber) — default brand colour
        default:
          'border-transparent bg-primary text-primary-foreground shadow-xs',
        // Neutral
        secondary:
          'border-transparent bg-secondary text-secondary-foreground',
        // Destructive / error
        destructive:
          'border-transparent bg-destructive/15 text-destructive border-destructive/20',
        // Subtle bordered
        outline:
          'bg-transparent text-foreground',
        // ── Semantic colour variants ──────────────────────────────────────
        // Used across stage chips, status indicators, and summary pills
        success:
          'border-transparent bg-emerald-50 text-emerald-700 border-emerald-200/60',
        warning:
          'border-transparent bg-amber-50 text-amber-700 border-amber-200/60',
        info:
          'border-transparent bg-blue-50 text-blue-700 border-blue-200/60',
        purple:
          'border-transparent bg-violet-50 text-violet-700 border-violet-200/60',
        rose:
          'border-transparent bg-rose-50 text-rose-700 border-rose-200/60',
        // Muted / inactive
        muted:
          'border-transparent bg-gray-100 text-gray-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
