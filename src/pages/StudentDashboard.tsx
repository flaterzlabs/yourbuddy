import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BuddyLogo } from '@/components/buddy-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { StudentAvatar } from '@/components/student-avatar';
import { SettingsModal } from '@/components/settings-modal';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Hand, Copy, Clock, CheckCircle, XCircle, Users, GraduationCap } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

type HelpRequest = Database['public']['Tables']['help_requests']['Row'];

type Connection = Database['public']['Tables']['connections']['Row'] & {
  profiles: {
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

  const fetchConnections = async () => {
    if (!user) return;

    try {
        const { data, error } = await supabase
        .from('connections')
        .select(`
          *,
          profiles!caregiver_id (
            username,
            role
          )
        `)
        .eq('student_id', user.id)
        .eq('status', 'active');

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  };

  const handleConnectionAdded = () => {
    fetchConnections();
    toast({
      title: "Conexão estabelecida!",
      description: "Você foi conectado com sucesso ao professor/responsável.",
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
              toast({
                title: t('studentDash.helpAnswered'),
                description: t('studentDash.helpAnsweredDesc'),
              });
              setLastStatusChange({id: newRecord.id, status: 'answered'});
            } else if (oldRecord.status !== 'closed' && newRecord.status === 'closed') {
              toast({
                title: t('studentDash.helpClosed'),
                description: t('studentDash.helpClosedDesc'),
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
          toast({
            title: t('studentDash.helpAnswered'),
            description: t('studentDash.helpAnsweredDesc'),
          });
        } else if (data.status === 'closed') {
          toast({
            title: t('studentDash.helpClosed'),
            description: t('studentDash.helpClosedDesc'),
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

      toast({ title: t('studentDash.sentTitle'), description: t('studentDash.sentDesc') });

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
      
      toast({
        title: t('auth.toast.errorTitle'),
        description: t('studentDash.sendError'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyStudentCode = () => {
    if (profile?.student_code) {
      navigator.clipboard.writeText(profile.student_code);
      toast({ title: t('studentDash.copiedTitle'), description: t('studentDash.copiedDesc') });
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
          <BuddyLogo size="lg" />
          <div className="flex items-center gap-4">
            <SettingsModal onConnectionAdded={handleConnectionAdded} />
            <LanguageToggle />
            <ThemeToggle />
            <Button
              variant="ghost"
              onClick={async () => {
                await signOut();
                toast({ title: t('auth.toast.loggedOut'), description: t('auth.toast.seeYou') });
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

          {/* Help Request Form - Centralized */}
          <Card className="p-6 bg-gradient-card shadow-medium mb-8">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center mx-auto mb-4">
                <StudentAvatar
                  imageUrl={thriveSprite?.image_url}
                  seed={thriveSprite ? (thriveSprite.options as any)?.seed : undefined}
                  style={thriveSprite ? (thriveSprite.options as any)?.style : undefined}
                  size={120}
                  className="border-2 border-success rounded-full"
                />
              </div>
              <h2 className="text-2xl font-bold mb-2">{t('studentDash.needHelpTitle')}</h2>
              <p className="text-muted-foreground">{t('studentDash.caregiversNotified')}</p>
            </div>

            <form onSubmit={handleHelpRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('studentDash.howFeeling')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={urgency === 'ok' ? 'default' : 'outline'}
                    onClick={() => setUrgency('ok')}
                    className="text-sm"
                  >
                    {t('studentDash.feelings.ok')}
                  </Button>
                  <Button
                    type="button"
                    variant={urgency === 'attention' ? 'default' : 'outline'}
                    onClick={() => setUrgency('attention')}
                    className="text-sm"
                  >
                    {t('studentDash.feelings.attention')}
                  </Button>
                  <Button
                    type="button"
                    variant={urgency === 'urgent' ? 'default' : 'outline'}
                    onClick={() => setUrgency('urgent')}
                    className="text-sm"
                  >
                    {t('studentDash.feelings.urgent')}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                variant="hero"
                size="lg"
                disabled={loading}
                className="w-full"
              >
                {loading ? t('studentDash.sending') : t('studentDash.sendHelp')}
              </Button>
            </form>
          </Card>

          {/* Recent Help Requests - Below main form */}
          <Card className="p-6 bg-gradient-card shadow-medium mb-8">
            <h3 className="text-xl font-bold mb-4">{t('studentDash.recentRequests')}</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {helpRequests.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  {t('studentDash.noneYet')}
                </p>
              ) : (
                helpRequests.slice(0, 5).map((request) => (
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
          </Card>

          {/* Connected Teachers/Parents Section */}
          {connections.length > 0 && (
            <Card className="p-6 bg-gradient-card shadow-medium">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('studentDash.connectedCaregivers')}
              </h3>
              <div className="space-y-3">
                {connections.map((connection) => (
                  <div
                    key={connection.id}
                    className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        connection.profiles?.role === 'educator' 
                          ? 'bg-blue-500/10 text-blue-600' 
                          : 'bg-green-500/10 text-green-600'
                      }`}>
                        {connection.profiles?.role === 'educator' ? (
                          <GraduationCap className="h-5 w-5" />
                        ) : (
                          <Users className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">
                          {connection.profiles?.username || 'Professor/Responsável'}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Conectado em {new Date(connection.created_at).toLocaleDateString(i18n.language)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="px-3 py-1">
                      {connection.profiles?.role === 'educator' ? 'Professor' : 'Responsável'}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
