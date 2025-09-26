import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { BuddyLogo } from '@/components/buddy-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { StudentAvatar } from '@/components/student-avatar';
import { SettingsModal } from '@/components/settings-modal';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Menu, ClipboardList, Clock, CheckCircle, XCircle, Link, LogOut } from "lucide-react";

import { Database } from '@/integrations/supabase/types';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type HelpRequest = Database['public']['Tables']['help_requests']['Row'];
type Connection = Database['public']['Tables']['connections']['Row'] & {
  caregiver_profile: {
    username: string;
    role: string;
  };
};

// --- Componente para menu mobile ---
function MobileMenu({
  helpRequests,
  historyModalOpen,
  setHistoryModalOpen,
  handleConnectionAdded,
  connections,
  i18n,
  t,
  signOut,
  navigate,
}: {
  helpRequests: HelpRequest[];
  historyModalOpen: boolean;
  setHistoryModalOpen: (open: boolean) => void;
  handleConnectionAdded: () => void;
  connections: Connection[];
  i18n: any;
  t: any;
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
          {/* Histórico de pedidos */}
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
                  {t("studentDash.historyTitle")} ({helpRequests.length.toString().padStart(2, "0")})
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {helpRequests.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    {t("studentDash.noneYet")}
                  </p>
                ) : (
                  helpRequests.map((request) => (
                    <div key={request.id} className="p-3 bg-background/50 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span>{request.urgency === "urgent" ? "🔴" : request.urgency === "attention" ? "🟡" : "🟢"}</span>
                          <Badge variant={request.status === "open" ? "destructive" : request.status === "answered" ? "secondary" : "outline"}>
                            {request.status === "open" && <><Clock className="h-3 w-3 mr-1" />{t("studentDash.status.waiting")}</>}
                            {request.status === "answered" && <><CheckCircle className="h-3 w-3 mr-1" />{t("studentDash.status.answered")}</>}
                            {request.status === "closed" && <><XCircle className="h-3 w-3 mr-1" />{t("studentDash.status.closed")}</>}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(request.created_at).toLocaleDateString(i18n.language)}
                        </span>
                      </div>
                      {request.message && <p className="text-sm text-muted-foreground">{request.message}</p>}
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
                <span className="font-semibold">{i18n.language.startsWith("pt") ? "PT" : "EN"}</span>
              </Button>
            }
          />

          {/* Tema */}
          <ThemeToggle />

          {/* Logout */}
          <Button
            variant="ghost"
            size="icon"
            className="transition-colors duration-200 hover:bg-purple-600 hover:text-white"
            onClick={async () => {
              await signOut();
              toast({
                title: t("auth.toast.loggedOut"),
                description: t("auth.toast.seeYou"),
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
  const { t, i18n } = useTranslation();
  const { user, profile, thriveSprite, signOut } = useAuth();
  const navigate = useNavigate();
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [urgency, setUrgency] = useState<'ok' | 'attention' | 'urgent' | null>(null);
  const [lastStatusChange, setLastStatusChange] = useState<{id: string, status: string} | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
   // 🔹 Estados para o clique duplo
  const [selectedEmoji, setSelectedEmoji] = useState<"ok" | "attention" | "urgent" | null>(null);
  const [confirming, setConfirming] = useState(false);

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
            username: 'Professor/Responsável',
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
      title: "Conexão estabelecida!",
      description: "Você foi conectado com sucesso ao professor/responsável.",
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
          const statusText = data.status === 'answered' ? 'respondido' : 'finalizado';
          toast({
            title: 'Pedido atualizado!',
            description: `Seu pedido foi ${statusText} pelo professor/responsável.`,
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

  // 🔹 Envia o pedido ao confirmar
  const handleHelpRequest = async () => {
    if (!user) return;
    if (!urgency) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('help_requests').insert({
        student_id: user.id,
        urgency,
      });

      if (error) throw error;

      toast({
        title: t('studentDash.sentTitle'),
        description: t('studentDash.sentDesc'),
        duration: 3000,
        variant: 'student',
      });

      fetchHelpRequests();
      setUrgency(null);
      setSelectedEmoji(null);
      setConfirming(false);
    } catch (error) {
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

  // 🔹 Clique no emoji
  const handleEmojiClick = (choice: "ok" | "attention" | "urgent") => {
    if (selectedEmoji === choice && confirming) {
      handleHelpRequest(); // segundo clique → envia
    } else {
      setSelectedEmoji(choice);
      setUrgency(choice);
      setConfirming(true);

      // cancela se não confirmar em 5s
      setTimeout(() => {
        setConfirming(false);
        setSelectedEmoji(null);
        setUrgency(null);
      }, 5000);
    }
  };


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
  {/* Logo e título - visíveis apenas no desktop/tablet */}
  <div className="hidden sm:flex flex-col items-center gap-2">
    <BuddyLogo size="lg" />
    <h2 className="text-lg font-semibold text-muted-foreground">
      {profile?.role === 'student' ? t('studentDash.titleStudent') : t('studentDash.title')}
    </h2>
  </div>

  {/* Saudação - sempre visível, mas no mobile ocupa o lugar do logo */}
<div className="flex flex-col items-center text-center sm:hidden">
    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
      {t('studentDash.hello', { name: profile?.username })}
    </h1>
    <p className="text-base sm:text-xl text-muted-foreground">
      {t('studentDash.feelingToday')}
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
                    {t('studentDash.historyTitle')} ({helpRequests.length.toString().padStart(2, '0')})
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {helpRequests.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">{t('studentDash.noneYet')}</p>
                  ) : (
                    helpRequests.map((request) => (
                      <div key={request.id} className="p-3 bg-background/50 rounded-lg border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span>{getUrgencyEmoji(request.urgency || 'ok')}</span>
                            <Badge variant={getStatusColor(request.status || 'open')}>
                              {request.status === 'open' && <><Clock className="h-3 w-3 mr-1" />{t('studentDash.status.waiting')}</>}
                              {request.status === 'answered' && <><CheckCircle className="h-3 w-3 mr-1" />{t('studentDash.status.answered')}</>}
                              {request.status === 'closed' && <><XCircle className="h-3 w-3 mr-1" />{t('studentDash.status.closed')}</>}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(request.created_at).toLocaleDateString(i18n.language)}
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

            <LanguageToggle
              trigger={
                <Button variant="ghost" size="icon" className="transition-colors duration-200">
                  <span className="font-semibold">{i18n.language.startsWith('pt') ? 'PT' : 'EN'}</span>
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

          {/* Mobile menu */}
          <MobileMenu
            helpRequests={helpRequests}
            historyModalOpen={historyModalOpen}
            setHistoryModalOpen={setHistoryModalOpen}
            handleConnectionAdded={handleConnectionAdded}
            connections={connections}
            i18n={i18n}
            t={t}
            signOut={signOut}
            navigate={navigate}
          />
        </div>

        {/* Conteúdo principal */}
        <div className="max-w-2xl mx-auto">
      {/* Welcome Section */}
<div className="hidden sm:block text-center mb-8">
  <div className="mb-4">
    <h1 className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent">
      {t('studentDash.hello', { name: profile?.username })}
    </h1>
    <p className="text-xl text-muted-foreground">
      {t('studentDash.feelingToday')}
    </p>
  </div>
</div>


          {/* Help Request Form */}
        {/* Emojis de ajuda */}
          <Card className="p-8 sm:p-4 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 shadow-lg mb-8">
            <div className="text-center mb-8">
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
              <p className="hidden sm:block text-muted-foreground mb-4">{t('studentDash.caregiversNotified')}</p>
            </div>

            <div className="flex flex-col items-center justify-center gap-6 p-6">
              <h1 className="text-2xl font-bold">Peça Ajuda</h1>

              <div className="flex gap-6">
                {/* Emoji OK */}
                <button
                  type="button"
                  onClick={() => handleEmojiClick("ok")}
                  className={`relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full transition-all ${selectedEmoji === "ok" ? "scale-110" : ""}`}
                >
                  <span className="text-5xl sm:text-6xl">🙂</span>
                  {selectedEmoji === "ok" && confirming && (
                    <span className="absolute inset-0 rounded-full border-4 border-green-400 animate-ping" />
                  )}
                </button>

                {/* Emoji Attention */}
                <button
                  type="button"
                  onClick={() => handleEmojiClick("attention")}
                  className={`relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full transition-all ${selectedEmoji === "attention" ? "scale-110" : ""}`}
                >
                  <span className="text-5xl sm:text-6xl">😟</span>
                  {selectedEmoji === "attention" && confirming && (
                    <span className="absolute inset-0 rounded-full border-4 border-yellow-400 animate-ping" />
                  )}
                </button>

                {/* Emoji Urgent */}
                <button
                  type="button"
                  onClick={() => handleEmojiClick("urgent")}
                  className={`relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full transition-all ${selectedEmoji === "urgent" ? "scale-110" : ""}`}
                >
                  <span className="text-5xl sm:text-6xl">🚨</span>
                  {selectedEmoji === "urgent" && confirming && (
                    <span className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping" />
                  )}
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
