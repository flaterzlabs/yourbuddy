import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { BuddyLogo } from '@/components/buddy-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { StudentAvatar } from '@/components/student-avatar';
import { SettingsModal } from '@/components/settings-modal';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Menu, ClipboardList, Clock, CheckCircle, XCircle, Link, LogOut, Loader2 } from "lucide-react";
import { Database } from '@/integrations/supabase/types';
import { useNavigate } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type HelpRequest = Database['public']['Tables']['help_requests']['Row'];
type Connection = Database['public']['Tables']['connections']['Row'] & {
  caregiver_profile: {
    username: string;
    role: string;
  };
};

// Mobile Menu Component
function MobileMenu({
  helpRequests,
  historyModalOpen,
  setHistoryModalOpen,
  handleConnectionAdded,
  connections,
  signOut,
  navigate,
}: {
  helpRequests: HelpRequest[];
  historyModalOpen: boolean;
  setHistoryModalOpen: (open: boolean) => void;
  handleConnectionAdded: () => void;
  connections: Connection[];
  signOut: () => Promise<void>;
  navigate: (path: string) => void;
}) {
  return (
    <div className="md:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="transition-colors duration-200">
            <Menu className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="flex flex-col gap-2 p-2 min-w-[3rem]">
          {/* Request History */}
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
                  Request History ({helpRequests.length.toString().padStart(2, "0")})
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {helpRequests.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No requests yet
                  </p>
                ) : (
                  helpRequests.map((request) => (
                    <div key={request.id} className="p-3 bg-background/50 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span>{request.urgency === "urgent" ? "🔴" : request.urgency === "attention" ? "🟡" : "🟢"}</span>
                          <Badge variant={request.status === "open" ? "destructive" : request.status === "answered" ? "secondary" : "outline"}>
                            {request.status === "open" && <><Clock className="h-3 w-3 mr-1" />Waiting</>}
                            {request.status === "answered" && <><CheckCircle className="h-3 w-3 mr-1" />Answered</>}
                            {request.status === "closed" && <><XCircle className="h-3 w-3 mr-1" />Closed</>}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(request.created_at).toLocaleDateString('en-US')}
                        </span>
                      </div>
                      {request.message && <p className="text-sm text-muted-foreground">{request.message}</p>}
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Connections */}
          <SettingsModal
            onConnectionAdded={handleConnectionAdded}
            connections={connections}
            trigger={
              <Button variant="ghost" size="icon" className="transition-colors duration-200">
                <Link className="h-5 w-5" />
              </Button>
            }
          />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Logout */}
          <Button
            variant="ghost"
            size="icon"
            className="transition-colors duration-200 hover:bg-purple-600 hover:text-white"
            onClick={async () => {
              await signOut();
              toast({
                title: "Logged out successfully",
                description: "See you soon!",
                variant: "student",
              });
              navigate("/auth");
            }}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function StudentDashboard() {
  const { user, profile, thriveSprite, signOut } = useAuth();
  const navigate = useNavigate();
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [urgency, setUrgency] = useState<'ok' | 'attention' | 'urgent' | null>(null);
  const [pendingUrgency, setPendingUrgency] = useState<'ok' | 'attention' | 'urgent' | null>(null);
  const [sendTimer, setSendTimer] = useState<NodeJS.Timeout | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [lastStatusChange, setLastStatusChange] = useState<{id: string, status: string} | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const fetchConnections = async () => {
    if (!user) return;
    try {
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('connections')
        .select('*')
        .eq('student_id', user.id)
        .eq('status', 'active');

      if (connectionsError) throw connectionsError;
      if (!connectionsData || connectionsData.length === 0) {
        setConnections([]);
        return;
      }

      const caregiverIds = connectionsData.map(conn => conn.caregiver_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username, role')
        .in('user_id', caregiverIds);

      if (profilesError) throw profilesError;

      const connectionsWithProfiles = connectionsData.map(connection => {
        const caregiverProfile = profilesData?.find(profile => profile.user_id === connection.caregiver_id);
        return {
          ...connection,
          caregiver_profile: caregiverProfile || {
            username: 'Teacher/Caregiver',
            role: 'caregiver'
          }
        };
      });

      setConnections(connectionsWithProfiles);
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  };

  const handleConnectionAdded = () => {
    fetchConnections();
    toast({
      title: "Connection established!",
      description: "You have been successfully connected to your teacher/caregiver.",
      duration: 3000,
      variant: 'student',
    });
  };

  const fetchHelpRequests = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('help_requests')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });

    if (!error) setHelpRequests(data || []);
  };

  useEffect(() => {
    fetchHelpRequests();
    fetchConnections();
  }, [user?.id]);

  // Listen for help request status updates from caregivers
  useEffect(() => {
    if (!user) return;

    const statusChannel = supabase
      .channel(`help-status-student-${user.id}`)
      .on('broadcast', { event: 'status-update' }, (payload) => {
        const data = payload.payload;
        if (data?.status) {
          const statusText = data.status === 'answered' ? 'answered' : 'closed';
          toast({
            title: 'Request updated!',
            description: `Your request has been ${statusText} by your teacher/caregiver.`,
            variant: 'student',
            duration: 4000,
          });
          fetchHelpRequests();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(statusChannel);
    };
  }, [user?.id]);

  // Listen for real-time help request changes
  useEffect(() => {
    if (!user) return;

    const helpRequestsChannel = supabase
      .channel(`help-requests-student-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'help_requests',
          filter: `student_id=eq.${user.id}`,
        },
        (payload) => {
          fetchHelpRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(helpRequestsChannel);
    };
  }, [user?.id]);

  const handleEmojiClick = (selectedUrgency: 'ok' | 'attention' | 'urgent') => {
    if (!user) return;

    if (pendingUrgency === selectedUrgency && sendTimer) {
      clearTimeout(sendTimer);
      setSendTimer(null);
      setPendingUrgency(null);
      return;
    }

    if (sendTimer) clearTimeout(sendTimer);

    setPendingUrgency(selectedUrgency);

    // 4 seconds delay
    const timer = setTimeout(() => {
      sendHelpRequest(selectedUrgency);
    }, 4000);

    setSendTimer(timer);
  };

  const sendHelpRequest = async (urgencyLevel: 'ok' | 'attention' | 'urgent') => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.from('help_requests').insert({
        student_id: user.id,
        message: message || undefined,
        urgency: urgencyLevel,
      }).select().single();

      if (error) throw error;

      // Send broadcast notification to caregivers
      try {
        const broadcastChannel = supabase.channel('help-requests-broadcast');
        await broadcastChannel.subscribe();
        
        setTimeout(async () => {
          await broadcastChannel.send({
            type: 'broadcast',
            event: 'new-help',
            payload: {
              student_id: user.id,
              urgency: urgencyLevel,
              message: message || undefined,
              created_at: new Date().toISOString(),
            },
          });
          
          setTimeout(() => supabase.removeChannel(broadcastChannel), 1000);
        }, 100);
      } catch (broadcastError) {
        console.log('Broadcast notification failed:', broadcastError);
      }

      // Success animation and notification
      setUrgency(urgencyLevel);
      setTimeout(() => {
        setUrgency(null);
      }, 1000);

      toast({
        title: 'Request sent!',
        description: 'Your help request has been sent to your teacher/caregiver.',
        duration: 3000,
        variant: 'student',
      });

      fetchHelpRequests();
      setMessage('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'There was an error sending your request. Please try again.',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setLoading(false);
      setPendingUrgency(null);
      setSendTimer(null);
      setCountdown(0);
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (sendTimer) {
        clearTimeout(sendTimer);
      }
    };
  }, [sendTimer]);

  const getStatusColor = (status: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
    switch (status) {
      case 'open': return 'destructive';
      case 'answered': return 'secondary';
      case 'closed': return 'outline';
      default: return 'secondary';
    }
  };

  const getUrgencyEmoji = (urgency: string) => {
    switch (urgency) {
      case 'attention': return '🟡';
      case 'urgent': return '🔴';
      default: return '🟢';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          {/* Logo and title - visible only on desktop/tablet */}
          <div className="hidden sm:flex flex-col items-center gap-2">
            <BuddyLogo size="lg" />
            <h2 className="text-lg font-semibold text-muted-foreground">
              {profile?.role === 'student' ? 'Student Dashboard' : 'Dashboard'}
            </h2>
          </div>

          {/* Greeting - always visible, but on mobile takes the place of logo */}
          <div className="flex flex-col items-center text-center sm:hidden">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              Hello, {profile?.username || 'Student'}!
            </h1>
            <p className="text-base sm:text-xl text-muted-foreground">
              How are you feeling today?
            </p>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center gap-4">
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
                    Request History ({helpRequests.length.toString().padStart(2, '0')})
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {helpRequests.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No requests yet</p>
                  ) : (
                    helpRequests.map((request) => (
                      <div key={request.id} className="p-3 bg-background/50 rounded-lg border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span>{getUrgencyEmoji(request.urgency || 'ok')}</span>
                            <Badge variant={getStatusColor(request.status || 'open')}>
                              {request.status === 'open' && <><Clock className="h-3 w-3 mr-1" />Waiting</>}
                              {request.status === 'answered' && <><CheckCircle className="h-3 w-3 mr-1" />Answered</>}
                              {request.status === 'closed' && <><XCircle className="h-3 w-3 mr-1" />Closed</>}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(request.created_at).toLocaleDateString('en-US')}
                          </span>
                        </div>
                        {request.message && <p className="text-sm text-muted-foreground">{request.message}</p>}
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <SettingsModal
              onConnectionAdded={handleConnectionAdded}
              connections={connections}
              trigger={
                <Button variant="ghost" size="icon" className="transition-colors duration-200">
                  <Link className="h-5 w-5" />
                </Button>
              }
            />

            <ThemeToggle />

            <Button
              variant="ghost"
              className="transition-colors duration-200 hover:bg-purple-600 hover:text-white"
              onClick={async () => {
                await signOut();
                toast({
                  title: 'Logged out successfully',
                  description: 'See you soon!',
                  variant: 'student',
                });
                navigate('/auth');
              }}
            >
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </Button>
          </div>

          {/* Mobile menu */}
          <MobileMenu
            helpRequests={helpRequests}
            historyModalOpen={historyModalOpen}
            setHistoryModalOpen={setHistoryModalOpen}
            handleConnectionAdded={handleConnectionAdded}
            connections={connections}
            signOut={signOut}
            navigate={navigate}
          />
        </div>

        {/* Greeting section for larger screens */}
        <div className="text-center mb-12 hidden sm:block">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
            Hello, {profile?.username || 'Student'}!
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8">
            How are you feeling today?
          </p>
        </div>

        {/* Main content area */}
        <div className="max-w-4xl mx-auto">
          {/* Avatar Section */}
          <div className="flex justify-center mb-12">
            <StudentAvatar 
              imageUrl={thriveSprite?.image_url}
              className="w-24 h-24 md:w-32 md:h-32" 
              size={128}
            />
          </div>

          {/* Status Selection */}
          <Card className="p-8 mb-8 shadow-lg bg-card/50 backdrop-blur border-0 bg-gradient-to-br from-card to-card/80">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                Need help with something?
              </h2>
              <p className="text-muted-foreground text-lg">
                Click on how you're feeling and let your teacher know you need help!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* I'm OK */}
              <Card 
                className={`p-6 cursor-pointer transition-all duration-300 hover:scale-105 border-2 ${
                  urgency === 'ok' 
                    ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20' 
                    : pendingUrgency === 'ok'
                    ? 'border-green-400 bg-green-400/20 animate-pulse'
                    : 'border-border hover:border-green-300'
                }`}
                onClick={() => handleEmojiClick('ok')}
              >
                <div className="text-center">
                  <div className="text-6xl mb-4">🟢</div>
                  <h3 className="text-xl font-semibold mb-2">I'm OK</h3>
                  <p className="text-muted-foreground text-sm">
                    Everything is going well, just checking in!
                  </p>
                </div>
              </Card>

              {/* Need Attention */}
              <Card 
                className={`p-6 cursor-pointer transition-all duration-300 hover:scale-105 border-2 ${
                  urgency === 'attention' 
                    ? 'border-yellow-500 bg-yellow-500/10 shadow-lg shadow-yellow-500/20' 
                    : pendingUrgency === 'attention'
                    ? 'border-yellow-400 bg-yellow-400/20 animate-pulse'
                    : 'border-border hover:border-yellow-300'
                }`}
                onClick={() => handleEmojiClick('attention')}
              >
                <div className="text-center">
                  <div className="text-6xl mb-4">🟡</div>
                  <h3 className="text-xl font-semibold mb-2">Need Attention</h3>
                  <p className="text-muted-foreground text-sm">
                    I could use some help when you have a moment
                  </p>
                </div>
              </Card>

              {/* Urgent Help */}
              <Card 
                className={`p-6 cursor-pointer transition-all duration-300 hover:scale-105 border-2 ${
                  urgency === 'urgent' 
                    ? 'border-red-500 bg-red-500/10 shadow-lg shadow-red-500/20' 
                    : pendingUrgency === 'urgent'
                    ? 'border-red-400 bg-red-400/20 animate-pulse'
                    : 'border-border hover:border-red-300'
                }`}
                onClick={() => handleEmojiClick('urgent')}
              >
                <div className="text-center">
                  <div className="text-6xl mb-4">🔴</div>
                  <h3 className="text-xl font-semibold mb-2">Urgent Help</h3>
                  <p className="text-muted-foreground text-sm">
                    I need help right now, please!
                  </p>
                </div>
              </Card>
            </div>

            {/* Message input */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Want to add a message? (optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell your teacher what you need help with..."
                className="w-full p-3 border border-border rounded-lg resize-none h-24 bg-background/50"
                maxLength={200}
              />
              <div className="text-xs text-muted-foreground mt-1 text-right">
                {message.length}/200 characters
              </div>
            </div>

            {/* Status indicators */}
            {pendingUrgency && (
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending request in 3 seconds... Click again to cancel</span>
                </div>
              </div>
            )}

            {loading && (
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending your request...</span>
                </div>
              </div>
            )}
          </Card>

          {/* Connection Status */}
          {connections.length === 0 && (
            <Card className="p-6 mb-8 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2 text-amber-800 dark:text-amber-200">
                  No connections yet
                </h3>
                <p className="text-amber-700 dark:text-amber-300 mb-4">
                  You need to connect with a teacher or caregiver to send help requests.
                </p>
                <SettingsModal
                  onConnectionAdded={handleConnectionAdded}
                  connections={connections}
                  trigger={
                    <Button variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/30">
                      <Link className="h-4 w-4 mr-2" />
                      Connect with Teacher/Caregiver
                    </Button>
                  }
                />
              </div>
            </Card>
          )}

          {/* Active connections info */}
          {connections.length > 0 && (
            <Card className="p-6 mb-8 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2 text-green-800 dark:text-green-200">
                  Connected to {connections.length} teacher{connections.length > 1 ? 's' : ''}/caregiver{connections.length > 1 ? 's' : ''}
                </h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {connections.map((connection) => (
                    <Badge key={connection.id} variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
                      {connection.caregiver_profile.username}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}