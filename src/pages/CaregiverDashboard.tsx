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
        title: action === 'answered' ? 'Marked as answered' : 'Request closed',
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
                  description: 'See you soon!',
                  variant: 'caregiver-success',
                });
                navigate('/auth');
              }}
              className="rounded-xl border border-border/50 bg-background/50 hover:bg-purple-600 hover:text-white transition-all duration-300 px-4"
            >
              Logout
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
                        description: 'See you soon!',
                        variant: 'caregiver-success',
                      });
                      navigate('/auth');
                    }}
                    className="justify-start gap-3 h-12 w-full text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <span className="h-5 w-5 flex items-center justify-center">↗️</span>
                    Logout
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Welcome Message */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
            Welcome, {profile?.username || 'Caregiver'}!
          </h1>
          <p className="text-xl text-muted-foreground">
            Monitor and support your students
          </p>
        </div>

        {/* Stats Cards for Desktop */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">Students</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{activeConnections.length}</p>
              </div>
              <Users className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 dark:text-red-400 text-sm font-medium">Open Requests</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">{openHelpRequests.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Total Requests</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{helpRequests.length}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">Resolved</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{closedHelpRequests.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Connect Student Card */}
          <Card className="p-8 shadow-lg bg-card/50 backdrop-blur border-0 bg-gradient-to-br from-card to-card/80">
            <div className="flex items-center gap-3 mb-6">
              <UserPlus className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Connect Student</h2>
            </div>
            
            <form onSubmit={handleConnectStudent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Student Code
                </label>
                <Input
                  type="text"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-character code"
                  className="text-center text-lg font-mono tracking-wider"
                  maxLength={6}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ask your student for their unique 6-character code
                </p>
              </div>
              
              <Button 
                type="submit" 
                disabled={loading || studentCode.length !== 6}
                className="w-full h-12 text-lg font-semibold"
              >
                {loading ? 'Connecting...' : 'Connect Student'}
              </Button>
            </form>

            {/* Your Connection Code */}
            {profile?.caregiver_code && (
              <div className="mt-8 p-4 bg-primary/10 rounded-lg border border-primary/20">
                <h3 className="font-semibold mb-2 text-primary">Your Connection Code</h3>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-lg font-mono bg-background/50 px-3 py-2 rounded border">
                    {profile.caregiver_code}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(profile.caregiver_code);
                      setCopyStatus('copied');
                      toast({
                        title: 'Code copied!',
                        description: 'Share this code with your students',
                        variant: 'caregiver-success',
                      });
                    }}
                    className="shrink-0"
                  >
                    {copyStatus === 'copied' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Students can use this code to connect with you
                </p>
              </div>
            )}
          </Card>

          {/* Current Help Requests */}
          <Card className="p-8 shadow-lg bg-card/50 backdrop-blur border-0 bg-gradient-to-br from-card to-card/80">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <h2 className="text-2xl font-bold">Current Requests</h2>
              </div>
              <Badge variant="destructive" className="text-lg px-3 py-1">
                {openHelpRequests.length}
              </Badge>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {openHelpRequests.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No open requests</p>
                  <p className="text-sm text-muted-foreground">All students are doing well!</p>
                </div>
              ) : (
                openHelpRequests.map((request) => (
                  <div key={request.id} className="p-4 bg-background/50 rounded-lg border">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <StudentAvatar
                            imageUrl={connections.find(c => c.student_id === request.student_id)?.thrive_sprite?.image_url}
                            className="w-10 h-10"
                            size={40}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">
                              {getUrgencyEmoji(request.urgency || 'ok')}
                            </span>
                            <h3 className="font-semibold">
                              {request.student_profile?.username || 'Student'}
                            </h3>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(request.created_at).toLocaleString('en-US')}
                          </p>
                        </div>
                      </div>
                      <Badge variant={getStatusColor(request.status || 'open')}>
                        <Clock className="h-3 w-3 mr-1" />
                        Waiting
                      </Badge>
                    </div>

                    {request.message && (
                      <div className="mb-3 p-3 bg-muted/50 rounded">
                        <p className="text-sm">{request.message}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleHelpRequestAction(request.id, 'answered')}
                        className="flex-1"
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Mark as Answered
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleHelpRequestAction(request.id, 'closed')}
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Close Request
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Mobile Stats Cards */}
        <div className="md:hidden grid grid-cols-2 gap-4 mt-8">
          <Card className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-800">
            <div className="text-center">
              <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
              <p className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">Students</p>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{activeConnections.length}</p>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
            <div className="text-center">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 mx-auto mb-2" />
              <p className="text-red-600 dark:text-red-400 text-xs font-medium">Open</p>
              <p className="text-xl font-bold text-red-700 dark:text-red-300">{openHelpRequests.length}</p>
            </div>
          </Card>
        </div>

        {/* Quick Action Buttons for Mobile */}
        <div className="md:hidden grid grid-cols-2 gap-4 mt-6">
          <Button
            onClick={() => setOverviewModalOpen(true)}
            variant="outline"
            className="h-14 flex flex-col gap-1"
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs">Overview</span>
          </Button>
          
          <Button
            onClick={() => setStudentsModalOpen(true)}
            variant="outline"
            className="h-14 flex flex-col gap-1"
          >
            <GraduationCap className="h-5 w-5" />
            <span className="text-xs">Students</span>
          </Button>
        </div>

        {/* Overview Modal */}
        <Dialog open={overviewModalOpen} onOpenChange={setOverviewModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Overview and Analytics
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-800">
                  <div className="text-center">
                    <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                    <p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">Students</p>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{activeConnections.length}</p>
                  </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
                  <div className="text-center">
                    <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 mx-auto mb-2" />
                    <p className="text-red-600 dark:text-red-400 text-sm font-medium">Open</p>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-300">{openHelpRequests.length}</p>
                  </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
                  <div className="text-center">
                    <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                    <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Total</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{helpRequests.length}</p>
                  </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
                  <div className="text-center">
                    <CheckCircle className="h-6 w-6 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                    <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">Resolved</p>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{closedHelpRequests.length}</p>
                  </div>
                </Card>
              </div>

              {/* Monthly Chart */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Help Requests by Month</h3>
                <ChartContainer config={monthlyChartConfig} className="h-64 w-full">
                  <BarChart data={helpRequestsByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar 
                      dataKey="requests" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </Card>

              {/* Recent Activity */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Help Requests</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {helpRequests.slice(0, 10).map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{getUrgencyEmoji(request.urgency || 'ok')}</span>
                        <div>
                          <p className="font-medium">{request.student_profile?.username || 'Student'}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(request.created_at).toLocaleDateString('en-US')}
                          </p>
                        </div>
                      </div>
                      <Badge variant={getStatusColor(request.status || 'open')}>
                        {request.status === 'open' && <><Clock className="h-3 w-3 mr-1" />Waiting</>}
                        {request.status === 'answered' && <><CheckCircle className="h-3 w-3 mr-1" />Answered</>}
                        {request.status === 'closed' && <><XCircle className="h-3 w-3 mr-1" />Closed</>}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </DialogContent>
        </Dialog>

        {/* Students Modal */}
        <Dialog open={studentsModalOpen} onOpenChange={setStudentsModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                My Students ({activeConnections.length})
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {activeConnections.length === 0 ? (
                <div className="text-center py-8">
                  <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No students connected yet</p>
                  <p className="text-sm text-muted-foreground">Use the connect form to add students</p>
                </div>
              ) : (
                activeConnections.map((connection) => {
                  const studentRequests = helpRequests.filter(r => r.student_id === connection.student_id);
                  const openRequests = studentRequests.filter(r => r.status === 'open');
                  
                  return (
                    <Card key={connection.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <StudentAvatar
                            imageUrl={connection.thrive_sprite?.image_url}
                            className="w-12 h-12"
                            size={48}
                          />
                          <div>
                            <h3 className="font-semibold text-lg">
                              {connection.student_profile?.username || 'Student'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Connected {new Date(connection.created_at).toLocaleDateString('en-US')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          {openRequests.length > 0 && (
                            <Badge variant="destructive" className="mb-1">
                              {openRequests.length} open request{openRequests.length > 1 ? 's' : ''}
                            </Badge>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {studentRequests.length} total request{studentRequests.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      {/* Recent requests for this student */}
                      {studentRequests.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <h4 className="text-sm font-medium mb-2">Recent Requests</h4>
                          <div className="space-y-2">
                            {studentRequests.slice(0, 3).map((request) => (
                              <div key={request.id} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <span>{getUrgencyEmoji(request.urgency || 'ok')}</span>
                                  <span className="text-muted-foreground">
                                    {new Date(request.created_at).toLocaleDateString('en-US')}
                                  </span>
                                </div>
                                <Badge variant={getStatusColor(request.status || 'open')} className="text-xs">
                                  {request.status === 'open' && 'Waiting'}
                                  {request.status === 'answered' && 'Answered'}
                                  {request.status === 'closed' && 'Closed'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}