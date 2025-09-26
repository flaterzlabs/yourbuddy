import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BuddyLogo } from '@/components/buddy-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { StudentAvatar } from '@/components/student-avatar';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
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
  Menu,
  BarChart3,
  GraduationCap,
} from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
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
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [studentCode, setStudentCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [overviewModalOpen, setOverviewModalOpen] = useState(false);
  const [studentsModalOpen, setStudentsModalOpen] = useState(false);

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
        const name = conn?.student_profile?.username || 'Student';
        const urgencyVariant = rec.urgency === 'urgent' ? 'caregiver-urgent' : rec.urgency === 'attention' ? 'caregiver-warning' : 'caregiver-success';
        toast({
          title: 'New Help Request',
          description: `${getUrgencyEmoji(rec.urgency || 'ok')} Help request from ${name}`,
          variant: urgencyVariant as 'caregiver-success' | 'caregiver-warning' | 'caregiver-urgent',
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
            const name = conn?.student_profile?.username || 'Student';
            const urgencyVariant = rec.urgency === 'urgent' ? 'caregiver-urgent' : rec.urgency === 'attention' ? 'caregiver-warning' : 'caregiver-success';
            toast({
              title: 'New Help Request',
              description: `${getUrgencyEmoji(rec.urgency || 'ok')} Help request from ${name}`,
              variant: urgencyVariant as 'caregiver-success' | 'caregiver-warning' | 'caregiver-urgent',
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
          title: 'Student connected!',
          description: `Connected with ${result.student.username} (${result.student.student_code})`,
          variant: 'caregiver-success',
        });
        setStudentCode('');
        fetchConnections();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Invalid code',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error connecting to student:', error);
      toast({
        title: 'Error',
        description: 'Could not connect. Please try again.',
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
        title: action === 'answered' ? 'Marked as answered' : 'Request completed',
        description: 'The student has been notified.',
        variant: 'caregiver-success',
      });

      // Notify the student via broadcast
      if (request?.student_id) {
        try {
          const notificationChannel = supabase.channel(`help-status-student-${request.student_id}`);
          await notificationChannel.subscribe();
          
          // Small delay to ensure subscription is ready
          setTimeout(async () => {
            await notificationChannel.send({
              type: 'broadcast',
              event: 'status-update',
              payload: {
                request_id: requestId,
                student_id: request.student_id,
                status: action,
                updated_at: new Date().toISOString(),
              },
            });
            
            // Clean up channel after sending
            setTimeout(() => supabase.removeChannel(notificationChannel), 1000);
          }, 100);
        } catch (e) {
          // Best effort - ignore broadcast failures
          console.log('Broadcast notification failed:', e);
        }
      }

      fetchHelpRequests();
    } catch (error) {
      console.error('Error updating help request:', error);
      toast({
        title: 'Error',
        description: 'Could not update the request.',
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
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      fullLabel: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      requests: counters.get(key) ?? 0,
    }));
  }, [helpRequests]);
  
  const monthlyChartConfig = useMemo(
    () => ({
      requests: {
        label: 'Help Requests',
        color: 'hsl(var(--primary))',
      },
    }),
    [],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-6 md:px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex flex-col items-center gap-2">
            <BuddyLogo size={isMobile ? "md" : "lg"} />
            <h2 className={`text-lg font-semibold text-muted-foreground ${isMobile ? "hidden" : ""}`}>
              {profile?.role === 'educator' ? 'Educator Dashboard' : 'Caregiver Dashboard'}
            </h2>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="ghost" 
              size="icon"
              className="rounded-full border border-border/50 bg-background/50 hover:bg-primary/10 transition-all duration-300"
            >
              <ThemeToggle />
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                await signOut();
                toast({ 
                  title: 'Logged out successfully', 
                  description: 'See you later!',
                  variant: 'caregiver-success',
                });
                navigate('/auth');
              }}
              className="rounded-xl border border-border/50 bg-background/50 hover:bg-purple-600 hover:text-white transition-all duration-300 px-4"
            >
              Sign out
            </Button>
          </div>

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden rounded-xl border border-border/50 bg-background/50 hover:bg-primary/10 transition-all duration-300"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <BuddyLogo size="sm" />
                  Menu
                </SheetTitle>
              </SheetHeader>
              
              <div className="flex flex-col gap-4 mt-8">
                <Button
                  variant="ghost"
                  onClick={() => setOverviewModalOpen(true)}
                  className="justify-start gap-3 h-12"
                >
                  <BarChart3 className="h-5 w-5" />
                  Overview
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => setStudentsModalOpen(true)}
                  className="justify-start gap-3 h-12"
                >
                  <GraduationCap className="h-5 w-5" />
                  My Students
                </Button>
                
                <div className="border-t pt-4 mt-4 space-y-2">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <ThemeToggle trigger={
                      <div className="flex items-center gap-3 w-full">
                        <div className="h-5 w-5 flex items-center justify-center">🌙</div>
                        <span>Theme</span>
                      </div>
                    } />
                  </div>
                  
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      await signOut();
                      toast({ 
                        title: 'Logged out successfully', 
                        description: 'See you later!',
                        variant: 'caregiver-success',
                      });
                      navigate('/auth');
                    }}
                    className="justify-start gap-3 h-12 w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <div className="h-5 w-5 flex items-center justify-center">👋</div>
                    Sign out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Welcome Section for Desktop */}
        <div className="text-center mb-8 hidden md:block">
          <h1 className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            Hello, {profile?.username}!
          </h1>
          <p className="text-xl text-muted-foreground">Welcome to your dashboard</p>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-gradient-card shadow-medium">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Connected Students</p>
                <p className="text-3xl font-bold text-success">{activeConnections.length}</p>
              </div>
              <Users className="h-8 w-8 text-success" />
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-card shadow-medium">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Requests</p>
                <p className="text-3xl font-bold text-warning">{openHelpRequests.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-warning" />
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-card shadow-medium">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved Requests</p>
                <p className="text-3xl font-bold text-primary">{closedHelpRequests.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
          </Card>
        </div>

        {/* Chart Section */}
        <Card className="p-6 bg-gradient-card shadow-medium mb-8">
          <h3 className="text-lg font-semibold mb-4">Help Requests Per Month</h3>
          <ChartContainer config={monthlyChartConfig} className="h-64">
            <BarChart data={helpRequestsByMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="requests" fill="var(--color-requests)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </Card>

        {/* Desktop Layout */}
        <div className="hidden md:grid md:grid-cols-2 gap-8">
          {/* Help Requests Column */}
          <div>
            <Card className="p-6 bg-gradient-card shadow-medium">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Help Requests</h2>
                <Badge variant="destructive" className="px-3 py-1">
                  Open: {openHelpRequests.length}
                </Badge>
              </div>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {openHelpRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No pending help requests</p>
                  </div>
                ) : (
                  openHelpRequests.map((request) => (
                    <div key={request.id} className="p-4 bg-background/50 rounded-lg border border-border">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getUrgencyEmoji(request.urgency || 'ok')}</span>
                            <div>
                              <p className="font-medium text-sm">
                                {request.student_profile?.username ||
                                'Student'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(request.created_at).toLocaleString('en-US')}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Waiting
                          </Badge>
                        </div>
                      </div>
                      {request.message && (
                        <p className="text-sm text-muted-foreground mb-3 p-2 bg-muted/50 rounded">
                          {request.message}
                        </p>
                      )}
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          onClick={() => handleHelpRequestAction(request.id, 'answered')}
                          className="text-xs"
                        >
                          Mark as Complete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Students Column */}
          <div>
            <Card className="p-6 bg-gradient-card shadow-medium">
              <h2 className="text-xl font-bold mb-4">My Students</h2>
              
              {activeConnections.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No connected students yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Use the connect code to add students
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {activeConnections.map((connection) => (
                    <div key={connection.id} className="flex items-center gap-4 p-4 bg-background/50 rounded-lg border border-border">
                      <StudentAvatar
                        imageUrl={connection.thrive_sprite?.image_url}
                        seed={connection.thrive_sprite ? (connection.thrive_sprite.options as any)?.seed : undefined}
                        style={connection.thrive_sprite ? (connection.thrive_sprite.options as any)?.style : undefined}
                        size={48}
                        className="border-2 border-success rounded-full"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">
                          {connection.student_profile?.username ||
                            'Student'}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Connected on {new Date(connection.created_at).toLocaleDateString('en-US')}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Active
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Mobile Help Requests Modal */}
        <Dialog open={overviewModalOpen} onOpenChange={setOverviewModalOpen}>
          <DialogContent className="max-w-md max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Help Requests</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {openHelpRequests.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No pending requests</p>
              ) : (
                openHelpRequests.map((request) => (
                  <div key={request.id} className="p-3 bg-background/50 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span>{getUrgencyEmoji(request.urgency || 'ok')}</span>
                        <div>
                          <p className="font-medium text-sm">
                            {request.student_profile?.username || 'Student'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(request.created_at).toLocaleString('en-US')}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs">
                        {request.status === 'open' && 'Waiting'}
                        {request.status === 'answered' && 'Answered'}
                        {request.status === 'closed' && 'Closed'}
                      </div>
                    </div>
                    {request.message && <p className="text-sm text-muted-foreground">{request.message}</p>}
                    <div className="flex gap-2 justify-end mt-2">
                      <Button
                        size="sm"
                        onClick={() => handleHelpRequestAction(request.id, 'answered')}
                        className="text-xs"
                      >
                        Complete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Mobile Students Modal */}
        <Dialog open={studentsModalOpen} onOpenChange={setStudentsModalOpen}>
          <DialogContent className="max-w-md max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>My Students</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {activeConnections.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No students connected</p>
              ) : (
                activeConnections.map((connection) => (
                  <div key={connection.id} className="flex items-center gap-3 p-3 bg-background/50 rounded-lg border border-border">
                    <StudentAvatar
                      imageUrl={connection.thrive_sprite?.image_url}
                      seed={connection.thrive_sprite ? (connection.thrive_sprite.options as any)?.seed : undefined}
                      style={connection.thrive_sprite ? (connection.thrive_sprite.options as any)?.style : undefined}
                      size={40}
                      className="border-2 border-success rounded-full"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">
                        {connection.student_profile?.username || 'Student'}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Connected {new Date(connection.created_at).toLocaleDateString('en-US')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}