import { Volume2, VolumeX, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SoundOption, UrgencyLevel, useNotificationSound } from "@/hooks/use-notification-sound";

const SOUND_OPTIONS: { value: SoundOption; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "blip1", label: "Blip 1" },
  { value: "blip2", label: "Blip 2" },
  { value: "chime", label: "Chime" },
  { value: "ding", label: "Ding" },
  { value: "softbell", label: "Soft Bell" },
  { value: "windchime", label: "Wind Chime" },
  { value: "pop", label: "Pop" },
  { value: "ping", label: "Ping" },
  { value: "twinkle", label: "Twinkle" },
  { value: "spark", label: "Spark" },
  { value: "woodtap", label: "Wood Tap" },
];

const URGENCY_CONFIG: { level: UrgencyLevel; emoji: string; label: string; color: string }[] = [
  { level: "ok", emoji: "🟢", label: "OK", color: "text-green-600 dark:text-green-400" },
  { level: "attention", emoji: "🟡", label: "Attention", color: "text-yellow-600 dark:text-yellow-400" },
  { level: "urgent", emoji: "🔴", label: "Urgent", color: "text-red-600 dark:text-red-400" },
];

interface SoundSettingsProps {
  trigger?: React.ReactNode;
}

export function SoundSettings({ trigger }: SoundSettingsProps = {}) {
  const { soundsByUrgency, updateSound, previewSound } = useNotificationSound();

  const hasAnySound = Object.values(soundsByUrgency).some(sound => sound !== "off");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="rounded-full">
            {!hasAnySound ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            <span className="sr-only">Notification sound settings</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Sons de Notificação por Urgência</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="space-y-4 p-2">
          {URGENCY_CONFIG.map(({ level, emoji, label, color }) => (
            <div key={level} className="space-y-2">
              <label className={`text-sm font-medium flex items-center gap-2 ${color}`}>
                <span className="text-base">{emoji}</span>
                {label}
              </label>
              <div className="flex items-center gap-2">
                <Select
                  value={soundsByUrgency[level]}
                  onValueChange={(value) => updateSound(level, value as SoundOption)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOUND_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {soundsByUrgency[level] !== "off" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => previewSound(soundsByUrgency[level])}
                    className="shrink-0"
                  >
                    <Play className="h-4 w-4" />
                    <span className="sr-only">Preview sound</span>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          As configurações são salvas automaticamente
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
