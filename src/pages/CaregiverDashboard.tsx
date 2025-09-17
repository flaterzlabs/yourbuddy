import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BuddyLogo } from '@/components/buddy-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { StudentAvatar } from '@/components/student-avatar';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  UserPlus,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Activity,
  Copy,
  Check,
} from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { subMonths } from 'date-fns';

type Connection = Database['public']['Tables']['connections']['Row'] & {
  student_profile?: Database['public']['Tables']['profiles']['Row'];
  thrive_sprite?: Database['public']['Tables']['thrive_sprites']['Row'];
};

type HelpRequest = Database['public']['Tables']['help_requests']['Row'] & {
  student_profile?: Database['public']['Tables']['profiles']['Row'];
};

export default function CaregiverDashboard() {
  const { t, i18n } = useTranslation();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [studentCode, setStudentCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  useEffect(() => {
    if (copyStatus !== 'copied') return;
    const timeout = setTimeout(() => setCopyStatus('idle'), 2000);
    return () => clearTimeout(timeout);
  }, [copyStatus]);

  const fetchConnections = async () => {
    console.time('caregiver:fetchConnections');
    if (!user) return;

    const { data, error } = await supabase
      .from('connections')
      .select(
        `
        *,
        student_profile:profiles!connections_student_id_fkey (
          *,
          thrive_sprite:thrive_sprites!thrive_sprites_student_id_fkey (*)
        )
      `,
      )
      .eq('caregiver_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching connections:', error);
      setConnections([]);
      console.timeEnd('caregiver:fetchConnections');
      return;
    }

    // Flatten embedded sprite for compatibility with existing rendering
    const connectionsWithSprites = (data || []).map((c: any) => ({
      ...c,
      thrive_sprite: c?.student_profile?.thrive_sprite ?? null,
    }));

    setConnections(connectionsWithSprites);
    console.timeEnd('caregiver:fetchConnections');
  };

  const fetchHelpRequests = async () => {
    console.time('caregiver:fetchHelpRequests');
    if (!user) return;

    const activeStudents = connections
      .filter((c) => c.status === 'active')
      .map((c) => c.student_id);

    if (activeStudents.length === 0) {
      setHelpRequests([]);
      console.timeEnd('caregiver:fetchHelpRequests');
      return;
    }

    const { data, error } = await supabase
      .from('help_requests')
      .select(
        `
        *,
        student_profile:profiles!help_requests_student_id_fkey (*)
      `,
      )
      .in('student_id', activeStudents)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching help requests:', error);
    } else {
      setHelpRequests(data || []);
    }
    console.timeEnd('caregiver:fetchHelpRequests');
  };

  useEffect(() => {
    fetchConnections();
  }, [user?.id]);

  useEffect(() => {
    if (connections.length > 0) {
      fetchHelpRequests();
    }
  }, [connections]);

  useEffect(() => {
    if (!user) return;

    // Subscribe to connection changes for this caregiver
    const connectionsChannel = supabase
      .channel(`connections-caregiver-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections',
          filter: `caregiver_id=eq.${user.id}`,
        },
        () => {
          fetchConnections();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(connectionsChannel);
    };
  }, [user?.id]);

  // Broadcast-based realtime notification (fallback independent of DB replication)
  useEffect(() => {
    if (!user) return;
    const activeIds = new Set(
      connections.filter((c) => c.status === 'active').map((c) => c.student_id),
    );
    const ch = supabase
      .channel('help-requests-broadcast')
      .on('broadcast', { event: 'new-help' }, (e: any) => {
        const rec = e?.payload;
        if (!rec || !activeIds.has(rec.student_id)) return;
        const conn = connections.find((c) => c.student_id === rec.student_id);
        const name = conn?.student_profile?.username || t('caregiverDash.studentFallback');
        toast({
          title: t('caregiverDash.newHelpTitle'),
          description: `${getUrgencyEmoji(rec.urgency || 'ok')} ${t('caregiverDash.newHelpFrom', { name })}`,
        });
        fetchHelpRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, connections.map((c) => `${c.student_id}:${c.status}`).join('|')]);

  // Subscribe to help_requests changes and react for active students
  useEffect(() => {
    if (!user) return;
    const activeIds = new Set(
      connections.filter((c) => c.status === 'active').map((c) => c.student_id),
    );
    const helpRequestsChannel = supabase
      .channel(`help-requests-caregiver-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'help_requests',
        },
        (payload) => {
          const rec: any = payload.new || payload.old;
          if (!rec || !activeIds.has(rec.student_id)) return;

          if (payload.eventType === 'INSERT') {
            const conn = connections.find((c) => c.student_id === rec.student_id);
            const name = conn?.student_profile?.username || t('caregiverDash.studentFallback');
            toast({
              title: t('caregiverDash.newHelpTitle'),
              description: `${getUrgencyEmoji(rec.urgency || 'ok')} ${t('caregiverDash.newHelpFrom', { name })}`,
            });
          }
          fetchHelpRequests();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(helpRequestsChannel);
    };
  }, [user?.id, connections.map((c) => `${c.student_id}:${c.status}`).join('|')]);

  const handleConnectStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentCode.trim()) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('create_connection_by_code', {
        input_code: studentCode.toUpperCase(),
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; student?: any };

      if (result.success && result.student) {
        toast({
          title: 'Estudante conectado!',
          description: `Conectado com ${result.student.username} (${result.student.student_code})`,
        });
        setStudentCode('');
        fetchConnections(); // This will refresh the "Meus Alunos" section
      } else {
        toast({
          title: 'Erro',
          description: result.error || 'Código inválido',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error connecting to student:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível conectar. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHelpRequestAction = async (requestId: string, action: 'answered' | 'closed') => {
    try {
      // Find the request to get student info for notification
      const request = helpRequests.find(r => r.id === requestId);
      
      const { error } = await supabase
        .from('help_requests')
        .update({
          status: action,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: action === 'answered' ? 'Marcado como respondido' : 'Pedido finalizado',
        description: 'O estudante foi notificado.',
      });

      // Notify the student via broadcast
      if (request?.student_id) {
        try {
          await supabase
            .channel(`help-status-student-${request.student_id}`)
            .send({
              type: 'broadcast',
              event: 'status-update',
              payload: {
                request_id: requestId,
                student_id: request.student_id,
                status: action,
                updated_at: new Date().toISOString(),
              },
            });
        } catch (e) {
          // Best effort - ignore broadcast failures
          console.log('Broadcast notification failed:', e);
        }
      }

      // Atualiza imediatamente enquanto o realtime notifica
      fetchHelpRequests();
    } catch (error) {
      console.error('Error updating help request:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o pedido.',
        variant: 'destructive',
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
      case 'pending':
        return 'destructive';
      case 'active':
        return 'secondary';
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

  const activeConnections = connections.filter((c) => c.status === 'active');
  const openHelpRequests = helpRequests.filter((r) => r.status === 'open');
  const closedHelpRequests = helpRequests.filter(
    (r) => r.status === 'answered' || r.status === 'closed',
  );
  const helpRequestsByMonth = useMemo(() => {
    const months: { key: string; date: Date }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(now, i);
      months.push({ key: `${date.getFullYear()}-${date.getMonth()}`, date });
    }

    const counters = new Map<string, number>();
    helpRequests.forEach((request) => {
      if (!request.created_at) return;
      const created = new Date(request.created_at);
      const key = `${created.getFullYear()}-${created.getMonth()}`;
      counters.set(key, (counters.get(key) ?? 0) + 1);
    });

    return months.map(({ key, date }) => ({
      month: date.toLocaleDateString(i18n.language, { month: 'short' }),
      fullLabel: date.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' }),
      requests: counters.get(key) ?? 0,
    }));
  }, [helpRequests, i18n.language]);
  const monthlyChartConfig = useMemo(
    () => ({
      requests: {
        label: t('caregiverDash.chartRequestsLabel'),
        color: 'hsl(var(--primary))',
      },
    }),
    [t],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex flex-col items-center gap-2">
            <BuddyLogo size="lg" />
            <h2 className="text-lg font-semibold text-muted-foreground">
              {profile?.role === 'educator' ? t('caregiverDash.titleEducator') : t('caregiverDash.title')}
            </h2>
          </div>
          <div className="flex items-center gap-4">
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

        <div className="max-w-6xl mx-auto">
          {/* Welcome Section - Centered */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
              {t('caregiverDash.headerHello', { name: profile?.username })}
            </h1>
            <p className="text-xl text-muted-foreground">{t('caregiverDash.subtitle')}</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Stats Overview */}
            <Card className="p-6 bg-gradient-card shadow-medium">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold mb-2">Visão Geral</h2>
                <p className="text-muted-foreground text-sm">Estatísticas dos seus alunos</p>
              </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-background/50 rounded-lg border border-border">
                <div className="text-3xl font-bold text-primary">{activeConnections.length}</div>
                <div className="text-sm text-muted-foreground">
                  {t('caregiverDash.statConnected')}
                </div>
              </div>
              <div className="text-center p-4 bg-background/50 rounded-lg border border-border">
                <div className="text-3xl font-bold text-warning">{openHelpRequests.length}</div>
                <div className="text-sm text-muted-foreground">
                  {t('caregiverDash.statOpenRequests')}
                </div>
              </div>
              <div className="text-center p-4 bg-background/50 rounded-lg border border-border">
                <div className="text-3xl font-bold text-emerald-500">
                  {closedHelpRequests.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t('caregiverDash.statClosedRequests')}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">
                {t('caregiverDash.requestsPerMonth')}
              </h3>
              <ChartContainer config={monthlyChartConfig} className="w-full h-64">
                <BarChart data={helpRequestsByMonth}>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                  <ChartTooltip content={<ChartTooltipContent labelKey="fullLabel" />} />
                  <Bar dataKey="requests" fill="var(--color-requests)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
          </Card>

          {/* Help Requests */}
            <Card className="p-6 bg-gradient-card shadow-medium">
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="h-6 w-6 text-warning" />
                <h2 className="text-xl font-bold">{t('caregiverDash.helpRequests')}</h2>
                {openHelpRequests.length > 0 && (
                  <Badge variant="destructive">
                    {t('caregiverDash.openCount', { count: openHelpRequests.length })}
                  </Badge>
                )}
              </div>

             <div className="space-y-4 max-h-[32rem] overflow-y-auto">
                {helpRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{t('caregiverDash.emptyHelp')}</p>
                  </div>
                ) : (
                  helpRequests.map((request) => (
                    <div
                      key={request.id}
                      className="p-4 bg-background/50 rounded-lg border border-border"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">
                            {getUrgencyEmoji(request.urgency || 'ok')}
                          </span>
                          <div>
                            <h4 className="font-semibold">
                              {request.student_profile?.username ||
                                t('caregiverDash.studentFallback')}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(request.created_at).toLocaleString(i18n.language)}
                            </p>
                          </div>
                        </div>
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

                      {request.message && (
                        <p className="text-sm mb-3 p-3 bg-background rounded border border-border">
                          "{request.message}"
                        </p>
                      )}

                      {request.status === 'open' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleHelpRequestAction(request.id, 'closed')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {t('caregiverDash.finish')}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Meus Alunos - Always visible */}
          <Card className="mt-8 p-6 bg-gradient-card shadow-medium">
            <div className="flex items-center gap-3 mb-6">
              <Users className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold">{t('caregiverDash.myStudents')}</h2>
            </div>

            {activeConnections.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t('caregiverDash.noStudents')}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t('caregiverDash.useCodeToConnect')}
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeConnections.map((connection) => (
                  <div
                    key={connection.id}
                    className="p-4 bg-background/50 rounded-lg border border-border hover:shadow-soft transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <StudentAvatar
                        imageUrl={connection.thrive_sprite?.image_url}
                        seed={
                          connection.thrive_sprite
                            ? (connection.thrive_sprite.options as any)?.seed
                            : undefined
                        }
                        style={
                          connection.thrive_sprite
                            ? (connection.thrive_sprite.options as any)?.style
                            : undefined
                        }
                        size={48}
                        className="border-2 border-primary/20"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">
                          {connection.student_profile?.username ||
                            t('caregiverDash.studentFallback')}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {t('caregiverDash.connectedOn', {
                            date: new Date(connection.created_at).toLocaleDateString(i18n.language),
                          })}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        <Activity className="h-3 w-3 mr-1" />
                        {t('caregiverDash.active')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

         {/* Connection Code Card */}
{profile?.caregiver_code && (
  <Card className="mt-6 p-5 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 shadow-lg">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/20 rounded-xl">
          <UserPlus className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-base">{t('caregiverDash.connectionCode')}</h3>
          <p className="text-sm text-muted-foreground">
            Compartilhe com alunos para conectar
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge
          variant="outline"
          className="font-mono text-lg px-4 py-2 border-primary/50 bg-primary/5"
        >
          {profile.caregiver_code}
        </Badge>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            if (!profile?.caregiver_code) return;
            try {
              await navigator.clipboard.writeText(profile.caregiver_code);
              setCopyStatus('copied');
              toast({
                title: t('caregiverDash.copySuccessTitle'),
                description: t('caregiverDash.copySuccessDesc'),
              });
            } catch (error) {
              console.error('Erro ao copiar código do cuidador', error);
              toast({
                title: t('caregiverDash.copyErrorTitle'),
                description: t('caregiverDash.copyErrorDesc'),
                variant: 'destructive',
              });
            }
          }}
          className="h-9 w-9 p-0 border-primary/40"
        >
          {copyStatus === 'copied' ? (
            <Check className="h-5 w-5 text-success" />
          ) : (
            <Copy className="h-5 w-5 text-primary" />
          )}
        </Button>
      </div>
    </div>
  </Card>
)}

          )}
        </div>
      </div>
    </div>
  );
}
