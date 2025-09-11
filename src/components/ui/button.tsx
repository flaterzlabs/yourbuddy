import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold ring-offset-background transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-soft hover:shadow-medium active:scale-95',
  {
    variants: {
      variant: {
        default: 'bg-gradient-primary text-primary-foreground hover:opacity-90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border-2 border-primary bg-background text-primary hover:bg-primary hover:text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline shadow-none',
        hero: 'bg-gradient-hero text-white text-lg font-bold hover:opacity-90 shadow-medium hover:shadow-strong',
        success: 'bg-success text-success-foreground hover:bg-success/90',
        warning: 'bg-warning text-warning-foreground hover:bg-warning/90',
        card: 'bg-gradient-card text-card-foreground hover:opacity-90 border border-border',
      },
      size: {
        default: 'h-12 px-6 py-3',
        sm: 'h-10 rounded-xl px-4 text-sm',
        lg: 'h-14 rounded-2xl px-8 text-lg',
        xl: 'h-16 rounded-3xl px-10 text-xl',
        icon: 'h-12 w-12 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
