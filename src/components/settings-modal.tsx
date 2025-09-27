import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { Link, UserPlus, Users, GraduationCap } from 'lucide-react';

interface SettingsModalProps {
  onConnectionAdded?: () => void;
  connections?: Array<{
    id: string;
    created_at: string;
    caregiver_profile?: {
      username: string;
      role: string;
    };
  }>;
  trigger?: React.ReactNode;
}

export function SettingsModal({ onConnectionAdded, connections = [], trigger }: SettingsModalProps) {
  const [caregiverCode, setCaregiverCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('pt') ? 'pt-BR' : 'en-US';

  const formatDate = (date: string) => {
    try {
      return new Intl.DateTimeFormat(locale).format(new Date(date));
    } catch {
      return new Date(date).toLocaleDateString(locale);
    }
  };

  const handleConnectCaregiver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caregiverCode.trim()) return;

    setIsConnecting(true);
    try {
      const { data, error } = await supabase.rpc('create_student_connection_by_caregiver_code', {
        input_code: caregiverCode.trim().toUpperCase()
      });

      if (error) throw error;

      const result = data as any;
      if (result.success) {
        toast({
          title: t('settingsModal.toast.successTitle'),
          description: t('settingsModal.toast.successDesc', {
            username: result.caregiver.username,
          }),
        });
        setCaregiverCode('');
        setOpen(false);
        onConnectionAdded?.();
      } else {
        toast({
          title: t('settingsModal.toast.errorTitle'),
          description: result.error ?? t('settingsModal.toast.errorDesc'),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: t('settingsModal.toast.errorTitle'),
        description: t('settingsModal.toast.errorDesc'),
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="icon" className="h-9 w-9">
            <Link className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            {t('settingsModal.title')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleConnectCaregiver} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="caregiver-code" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              {t('settingsModal.connectLabel')}
            </Label>
            <Input
              id="caregiver-code"
              placeholder={t('settingsModal.codePlaceholder')}
              value={caregiverCode}
              onChange={(e) => setCaregiverCode(e.target.value.toUpperCase())}
              maxLength={8}
              className="text-center font-mono text-lg tracking-wider"
            />
            <p className="text-sm text-muted-foreground">
              {t('settingsModal.codeHelper')}
            </p>
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isConnecting || !caregiverCode.trim()}
          >
            {isConnecting ? t('settingsModal.connecting') : t('settingsModal.connectButton')}
          </Button>
        </form>
        
        {/* Connected Caregivers Section */}
        <div className="mt-6 pt-4 border-t border-border">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('settingsModal.connectedCaregivers')}
          </h3>
          
          {connections.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('settingsModal.emptyState')}
            </p>
          ) : (
            <div className="space-y-3">
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      connection.caregiver_profile?.role === 'educator' 
                        ? 'bg-blue-500/10 text-blue-600' 
                        : 'bg-green-500/10 text-green-600'
                    }`}>
                      {connection.caregiver_profile?.role === 'educator' ? (
                        <GraduationCap className="h-4 w-4" />
                      ) : (
                        <Users className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">
                        {connection.caregiver_profile?.username || t('settingsModal.role.fallback')}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {t('settingsModal.connectedOn', {
                          date: formatDate(connection.created_at),
                        })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs px-2 py-1">
                    {connection.caregiver_profile?.role === 'educator'
                      ? t('settingsModal.role.educator')
                      : t('settingsModal.role.caregiver')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
