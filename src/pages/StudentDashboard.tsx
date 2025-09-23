import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ToastAction } from '@/components/ui/toast'; // Importação do componente
import { BuddyLogo } from '@/components/buddy-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { StudentAvatar } from '@/components/student-avatar';
import { SettingsModal } from '@/components/settings-modal';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  ClipboardList,
  Clock,
  CheckCircle,
  XCircle,
  Link
} from "lucide-react";

import { Database } from '@/integrations/supabase/types';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

type HelpRequest = Database['public']['Tables']['help_requests']['Row'];

type Connection = Database['public']['Tables']['connections']['Row'] & {
  caregiver_profile: {
    username: string;
    role: string;
  };
};

export default function StudentDashboard() {
  const { t, i18n } = useTranslation();
  const { user, profile, thriveSprite, signOut } = useAuth();
  const navigate = useNavigate();
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [urgency, setUrgency] = useState<'ok' | 'attention' | 'urgent'>('ok');
  const [lastStatusChange, setLastStatusChange] = useState<{id: string, status: string} | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const fetchConnections = async () => {
    if (!user) return;

    try {
      // First get connections
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('connections')
        .select('*')
        .eq('student_id', user.id)
        .eq('status', 'active');

      if (connectionsError) {
        console.error('Error fetching connections:', connectionsError);
        throw connectionsError;
      }

      if (!connectionsData || connectionsData.length === 0) {
        setConnections([]);
        return;
      }

      // Get caregiver IDs
      const caregiverIds = connectionsData.map(conn => conn.caregiver_id);
      console.log('Caregiver IDs to fetch:', caregiverIds); // Debug log

      // Fetch caregiver profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username, role')
        .in('user_id', caregiverIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      console.log('Profiles data fetched:', profilesData); // Debug log

      // Combine the data
      const connectionsWithProfiles = connectionsData.map(connection => {
        const caregiverProfile = profilesData?.find(profile => profile.user_id === connection.caregiver_id);
        console.log(`Mapping connection ${connection.id} with caregiver ${connection.caregiver_id}:`, caregiverProfile); // Debug log

        return {
          ...connection,
          caregiver_profile: caregiverProfile || {
            username: 'Professor/Responsável',
            role: 'caregiver'
          }
        };
      });

      console.log('Connected caregivers (final):', connectionsWithProfiles);
      setConnections(connectionsWithProfiles);
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  };

  const handleConnectionAdded = () => {
    fetchConnections();
    // === Alteração: Adicionado variant e viewportId ===
    toast({
      title: "Conexão estabelecida!",
      description: "Você foi conectado com sucesso ao professor/responsável.",
      duration: 3000,
      variant: 'student',
    });
  };

  const fetchHelpRequests = async () => {
    console.time('student:fetchHelpRequests');
    if (!user) return;

    const { data, error } = await supabase
      .from('help_requests')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching help requests:', error);
    } else {
      setHelpRequests(data || []);
    }
    console.timeEnd('student:fetchHelpRequests');
  };

  useEffect(() => {
    fetchHelpRequests();
    fetchConnections();

    if (!user?.id) return;

    // Subscribe to realtime updates with status change notifications
    const channel = supabase
      .channel(`help-requests-student-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'help_requests',
        },
        (payload) => {
          const newRecord = payload.new as HelpRequest;
          const oldRecord = payload.old as HelpRequest;

          // Filter for this student's requests only
          const relevantRecord = newRecord || oldRecord;
          if (!relevantRecord || relevantRecord.student_id !== user.id) return;

          // Check for status changes to show notifications
          if (payload.eventType === 'UPDATE' && newRecord && oldRecord) {
            if (oldRecord.status === 'open' && newRecord.status === 'answered') {
              // === Alteração: Adicionado variant e viewportId ===
              toast({
                title: t('studentDash.helpAnswered'),
                description: t('studentDash.helpAnsweredDesc'),
                duration: 3000,
                variant: 'student',
                action: (
                  <ToastAction
                    altText={t('studentDash.viewDetails')}
                    onClick={() => setHistoryModalOpen(true)}
                  >
                    {t('studentDash.viewDetails')}
                  </ToastAction>
                ),
              });
              setLastStatusChange({id: newRecord.id, status: 'answered'});
            } else if (oldRecord.status !== 'closed' && newRecord.status === 'closed') {
              // === Alteração: Adicionado variant e viewportId ===
              toast({
                title: t('studentDash.helpClosed'),
                description: t('studentDash.helpClosedDesc'),
                duration: 3000,
                variant: 'student',
              });
              setLastStatusChange({id: newRecord.id, status: 'closed'});
            }
          }

          fetchHelpRequests();
        },
      )
      .subscribe();

    // Also listen to broadcast channel for immediate notifications
    const broadcastChannel = supabase
      .channel(`help-status-student-${user.id}`)
      .on('broadcast', { event: 'status-update' }, (payload: any) => {
        const data = payload.payload;
        if (!data || data.student_id !== user.id) return;

        // Show notification for status changes
        if (data.status === 'answered') {
          // === Alteração: Adicionado variant e viewportId ===
          toast({
            title: t('studentDash.helpAnswered'),
            description: t('studentDash.helpAnsweredDesc'),
            duration: 3000,
            variant: 'student',
            action: (
              <ToastAction
                altText={t('studentDash.viewDetails')}
                onClick={() => setHistoryModalOpen(true)}
              >
                {t('studentDash.viewDetails')}
              </ToastAction>
            ),
          });
        } else if (data.status === 'closed') {
          // === Alteração: Adicionado variant e viewportId ===
          toast({
            title: t('studentDash.helpClosed'),
            description: t('studentDash.helpClosedDesc'),
            duration: 3000,
            variant: 'student',
          });
        }

        fetchHelpRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(broadcastChannel);
    };
  }, [user?.id, t]);

  const handleHelpRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    // Optimistic update - add request immediately to UI
    const optimisticRequest: HelpRequest = {
      id: `temp-${Date.now()}`, // Temporary ID
      student_id: user.id,
      message: message || null,
      urgency,
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      resolved_by: null,
      resolved_at: null,
    };

    // Add to UI immediately
    setHelpRequests(prev => [optimisticRequest, ...prev]);

    try {
      const { data, error } = await supabase.from('help_requests').insert({
        student_id: user.id,
        message: message || undefined,
        urgency,
      }).select().single();

      if (error) throw error;

      // === Alteração: Adicionado variant e viewportId ===
      toast({ 
        title: t('studentDash.sentTitle'), 
        description: t('studentDash.sentDesc'), 
        duration: 3000, 
        variant: 'student',
      });

      // Replace optimistic request with real one
      setHelpRequests(prev => prev.map(req =>
        req.id === optimisticRequest.id ? data : req
      ));

      // Notify caregivers via realtime broadcast (fallback independent of DB replication)
      try {
        await supabase
          .channel('help-requests-broadcast')
          .send({
            type: 'broadcast',
            event: 'new-help',
            payload: {
              student_id: user.id,
              urgency,
              message: message || null,
              created_at: new Date().toISOString(),
            },
          });
      } catch (e) {
        // best-effort: ignore broadcast failures
      }

      setMessage('');
      setUrgency('ok');
    } catch (error) {
      console.error('Error creating help request:', error);

      // Remove optimistic request on error
      setHelpRequests(prev => prev.filter(req => req.id !== optimisticRequest.id));

      // === Alteração: Adicionado variant e viewportId ===
      toast({
        title: t('auth.toast.errorTitle'),
        description: t('studentDash.sendError'),
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyStudentCode = () => {
    if (profile?.student_code) {
      navigator.clipboard.writeText(profile.student_code);
      // === Alteração: Adicionado variant e viewportId ===
      toast({ 
        title: t('studentDash.copiedTitle'), 
        description: t('studentDash.copiedDesc'), 
        duration: 3000, 
        variant: 'student',
      });
    }
  };

  const getStatusColor = (status: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
    switch (status) {
      case 'open':
        return 'destructive';
      case 'answered':
        return 'secondary';
      case 'closed':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getUrgencyEmoji = (urgency: string) => {
    switch (urgency) {
      case 'attention':
        return '🟡';
      case 'urgent':
        return '🔴';
      default:
        return '🟢';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex flex-col items-center gap-2">
            <BuddyLogo size="lg" />
            <h2 className="text-lg font-semibold text-muted-foreground">
              {profile?.role === 'student' ? t('studentDash.titleStudent') : t('studentDash.title')}
            </h2>
          </div>

          <div className="flex items-center gap-4">
    {/* Histórico */}
    <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative transition-colors duration-200">
          <ClipboardList className="h-5 w-5" />
          {helpRequests.length > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center">
              {helpRequests.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            {t('studentDash.historyTitle')} ({helpRequests.length.toString().padStart(2, '0')})
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {helpRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              {t('studentDash.noneYet')}
            </p>
          ) : (
            helpRequests.map((request) => (
              <div
                key={request.id}
                className="p-3 bg-background/50 rounded-lg border border-border"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span>{getUrgencyEmoji(request.urgency || 'ok')}</span>
                    <Badge variant={getStatusColor(request.status || 'open')}>
                      {request.status === 'open' && (
                        <>
                          <Clock className="h-3 w-3 mr-1" />
                          {t('studentDash.status.waiting')}
                        </>
                      )}
                      {request.status === 'answered' && (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {t('studentDash.status.answered')}
                        </>
                      )}
                      {request.status === 'closed' && (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          {t('studentDash.status.closed')}
                        </>
                      )}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(request.created_at).toLocaleDateString(i18n.language)}
                  </span>
                </div>
                {request.message && (
                  <p className="text-sm text-muted-foreground">{request.message}</p>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Conexões */}
    <SettingsModal
      onConnectionAdded={handleConnectionAdded}
      connections={connections}
      trigger={
        <Button variant="ghost" size="icon" className="transition-colors duration-200">
          <Link className="h-5 w-5" />
        </Button>
      }
    />

    {/* Idioma */}
    <LanguageToggle
      trigger={
        <Button variant="ghost" size="icon" className="transition-colors duration-200">
          <span className="font-semibold">{i18n.language.startsWith('pt') ? 'PT' : 'EN'}</span>
        </Button>
      }
    />

    {/* Tema */}
    <ThemeToggle />

    {/* Logout */}
    <Button
      variant="ghost"
      className="transition-colors duration-200"
      onClick={async () => {
        await signOut();
        // === Alteração: Adicionado variant e viewportId ===
        toast({ 
          title: t('auth.toast.loggedOut'), 
          description: t('auth.toast.seeYou'),
          variant: 'student',
        });
        navigate('/auth');
      }}
    >
      {t('common.logout')}
    </Button>
  </div>
        </div>



        <div className="max-w-2xl mx-auto">
          {/* Welcome Section */}
          <div className="text-center mb-8">
            <div className="mb-4">
              <h1 className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                {t('studentDash.hello', { name: profile?.username })}
              </h1>
              <p className="text-xl text-muted-foreground">{t('studentDash.feelingToday')}</p>
            </div>
          </div>

          {/* Help Request Form */}
<Card className="p-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 shadow-lg mb-8">
  <div className="text-center mb-6">
    <div className="flex items-center justify-center mx-auto mb-4">
           <StudentAvatar
      imageUrl={thriveSprite?.image_url}
      seed={thriveSprite ? (thriveSprite.options as any)?.seed : undefined}
      style={thriveSprite ? (thriveSprite.options as any)?.style : undefined}
      size={120}
      className="border-4 border-success rounded-full shadow-md shadow-green-500"
    />
    </div>
    <h2 className="text-2xl font-bold mb-2">{t('studentDash.needHelpTitle')}</h2>
    <p className="text-muted-foreground">{t('studentDash.caregiversNotified')}</p>
  </div>

  <form onSubmit={handleHelpRequest} className="space-y-8">
    <div>
      <div className="flex justify-center items-center gap-12">
        {/* Happy/Well Button */}
        <button
          type="button"
          onClick={() => setUrgency('ok')}
          className={`emotion-button emotion-happy ${urgency === 'ok' ? 'selected' : ''}`}
        >
          😊
        </button>

        {/* Need Help Button */}
        <button
          type="button"
          onClick={() => setUrgency('attention')}
          className={`emotion-button emotion-need ${urgency === 'attention' ? 'selected' : ''}`}
        >
          😟
        </button>

        {/* Urgent Button */}
        <button
          type="button"
          onClick={() => setUrgency('urgent')}
          className={`emotion-button emotion-urgent ${urgency === 'urgent' ? 'selected' : ''}`}
        >
          😭
        </button>
      </div>
    </div>

    {/* BOTAO SOS */}
    
  <div className="flex justify-center">
  <Button
    type="submit"
    variant="ghost"
    size="lg"
    disabled={loading}
    className="flex h-24 w-24 items-center justify-center 
               rounded-2xl border-4 border-transparent 
               bg-gradient-to-br from-red-500 via-red-600 to-red-700 
               text-7xl text-white 
               shadow-[0_0_25px_rgba(220,38,38,0.75)]
               hover:shadow-[0_0_45px_rgba(248,113,113,1)]
               hover:scale-105 active:scale-95 
               transition-all duration-200"
  >
    {loading ? (
      <span className="text-white text-base font-bold">
        {t('studentDash.sending')}
      </span>
    ) : (
      <span role="img" aria-label="sos">🆘</span>
    )}
  </Button>
</div>

  </form>
</Card>


        </div>
      </div>
    </div>
  );
}
