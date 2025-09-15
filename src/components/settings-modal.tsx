import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { Settings, UserPlus } from 'lucide-react';

interface SettingsModalProps {
  onConnectionAdded?: () => void;
}

export function SettingsModal({ onConnectionAdded }: SettingsModalProps) {
  const [caregiverCode, setCaregiverCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

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
          title: "Conectado com sucesso!",
          description: `Você está agora conectado com ${result.caregiver.username}`,
        });
        setCaregiverCode('');
        setOpen(false);
        onConnectionAdded?.();
      } else {
        toast({
          title: "Erro na conexão",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: "Erro na conexão",
        description: "Ocorreu um erro ao tentar conectar. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleConnectCaregiver} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="caregiver-code" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Conectar Professor/Responsável
            </Label>
            <Input
              id="caregiver-code"
              placeholder="Digite o código do professor..."
              value={caregiverCode}
              onChange={(e) => setCaregiverCode(e.target.value.toUpperCase())}
              maxLength={8}
              className="text-center font-mono text-lg tracking-wider"
            />
            <p className="text-sm text-muted-foreground">
              Insira o código de 8 caracteres fornecido pelo seu professor ou responsável.
            </p>
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isConnecting || !caregiverCode.trim()}
          >
            {isConnecting ? "Conectando..." : "Conectar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}