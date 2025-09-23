import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface RoleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  selected?: boolean;
}

export function RoleCard({ title, description, icon: Icon, onClick, selected }: RoleCardProps) {
  return (
   <Card
  className={`p-6 cursor-pointer max-w-sm mx-auto
    transition-all duration-300 ease-in-out 
    ${selected
      ? 'bg-gradient-primary text-primary-foreground shadow-medium scale-105'
      : 'bg-gradient-card hover:shadow-soft'
    }`}
>
  <div className="text-center space-y-4" onClick={onClick}>
    <div
      className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ease-in-out
        ${selected ? 'bg-white/20' : 'bg-primary/10'}
      `}
    >
      <Icon className={`h-8 w-8 transition-all duration-300 ease-in-out ${selected ? 'text-white' : 'text-primary'}`} />
    </div>
    <div>
      <h3 className={`text-xl font-bold mb-2 transition-all duration-300 ease-in-out ${selected ? 'text-white' : 'text-foreground'}`}>
        {title}
      </h3>
      <p className={`text-sm transition-all duration-300 ease-in-out ${selected ? 'text-white/80' : 'text-muted-foreground'}`}>
        {description}
      </p>
    </div>
  </div>
</Card>

  );
}
