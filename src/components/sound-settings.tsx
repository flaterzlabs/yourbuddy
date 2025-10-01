import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SoundOption, useNotificationSound } from '@/hooks/use-notification-sound';

const SOUND_OPTIONS: { value: SoundOption; label: string; description: string }[] = [
  { value: 'blip1', label: 'Blip 1', description: 'Short soft beep' },
  { value: 'blip2', label: 'Blip 2', description: 'Gentle notification' },
  { value: 'chime', label: 'Chime', description: 'Subtle bell tone' },
  { value: 'none', label: 'None', description: 'No sound' },
];

export function SoundSettings() {
  const { selectedSound, updateSound, previewSound } = useNotificationSound();

  const handleSoundSelect = (sound: SoundOption) => {
    updateSound(sound);
    if (sound !== 'none') {
      previewSound(sound);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          {selectedSound === 'none' ? (
            <VolumeX className="h-5 w-5" />
          ) : (
            <Volume2 className="h-5 w-5" />
          )}
          <span className="sr-only">Notification sound settings</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Notification Sound</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SOUND_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleSoundSelect(option.value)}
            className="flex flex-col items-start gap-1 cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-medium">{option.label}</span>
              {selectedSound === option.value && (
                <span className="text-xs text-primary">✓</span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{option.description}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          Click to select and preview
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
