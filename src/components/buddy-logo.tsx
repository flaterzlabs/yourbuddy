import { Heart } from 'lucide-react';

interface BuddyLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function BuddyLogo({ size = 'md', showText = true }: BuddyLogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div
          className={`${sizeClasses[size]} bg-gradient-primary rounded-2xl flex items-center justify-center shadow-soft`}
        >
          <Heart className="h-1/2 w-1/2 text-white fill-current" />
        </div>
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-background animate-pulse"></div>
      </div>
      {showText && (
        <span
          className={`${textSizeClasses[size]} font-bold bg-gradient-primary bg-clip-text text-transparent`}
        >
          BUDDY
        </span>
      )}
    </div>
  );
}
