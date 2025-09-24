import { useState, useEffect } from "react";
import { BuddyLogo } from "@/components/buddy-logo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Clock, CheckCircle, XCircle, Menu } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { SettingsModal } from "@/components/settings-modal";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

interface HeaderProps {
  helpRequests: any[];
  connections: any[];
  historyModalOpen: boolean;
  setHistoryModalOpen: (open: boolean) => void;
  getUrgencyEmoji: (urgency: string) => string;
  getStatusColor: (status: string) => "default" | "destructive" | "outline" | "secondary";
  handleConnectionAdded: () => void;
  i18n: any;
}

function Header({
  helpRequests,
  connections,
  historyModalOpen,
  setHistoryModalOpen,
  getUrgencyEmoji,
  getStatusColor,
  handleConnectionAdded,
  i18n,
}: HeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  return (
    <div className="flex justify-between items-center mb-8">
      <BuddyLogo size="lg" />

      <div className="flex items-center gap-4">
        {/* DESKTOP */}
        <div className="hidden md:flex items-center gap-4">
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
                  {t("studentDash.historyTitle")} (
                  {helpRequests.length.toString().padStart(2, "0")})
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {helpRequests.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    {t("studentDash.noneYet")}
                  </p>
                ) : (
                  helpRequests.map((request) => (
                    <div
                      key={request.id}
                      className="p-3 bg-background/50 rounded-lg border border-border"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span>{getUrgencyEmoji(request.urgency || "ok")}</span>
                          <Badge variant={getStatusColor(request.status || "open")}>
                            {request.status === "open" && (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                {t("studentDash.status.waiting")}
                              </>
                            )}
                            {request.status === "answered" && (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {t("studentDash.status.answered")}
                              </>
                            )}
                            {request.status === "closed" && (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                {t("studentDash.status.closed")}
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
          />

          {/* Idioma */}
          <LanguageToggle />

          {/* Tema */}
          <ThemeToggle />

          {/* Logout */}
          <Button
            variant="ghost"
            className="transition-colors duration-200 hover:bg-primary hover:text-primary-foreground"
            onClick={async () => {
              await signOut();
              toast({
                title: t("auth.toast.loggedOut"),
                description: t("auth.toast.seeYou"),
              });
              navigate("/auth");
            }}
          >
            {t("common.logout")}
          </Button>
        </div>

        {/* MOBILE */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-4 flex flex-col gap-4">
              {/* Histórico */}
              <Dialog>
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
              </Dialog>

              {/* Conexões */}
              <SettingsModal
                onConnectionAdded={handleConnectionAdded}
                connections={connections}
              />

              {/* Idioma */}
              <LanguageToggle />

              {/* Tema */}
              <ThemeToggle />

              {/* Logout */}
              <Button
                variant="ghost"
                className="transition-colors duration-200 hover:bg-primary hover:text-primary-foreground"
                onClick={async () => {
                  await signOut();
                  toast({
                    title: t("auth.toast.loggedOut"),
                    description: t("auth.toast.seeYou"),
                  });
                  navigate("/auth");
                }}
              >
                {t("common.logout")}
              </Button>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const { t, i18n } = useTranslation();
  const { user, profile, thriveSprite } = useAuth();
  const [helpRequests, setHelpRequests] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const getUrgencyEmoji = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return '🚨';
      case 'moderate': return '⚠️';
      case 'ok': return '✋';
      default: return '✋';
    }
  };

  const getStatusColor = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case 'open': return 'destructive';
      case 'answered': return 'secondary';
      case 'closed': return 'outline';
      default: return 'default';
    }
  };

  const handleConnectionAdded = () => {
    // Refresh connections logic here
    console.log("Connection added");
  };

  useEffect(() => {
    // Fetch help requests and connections
    const fetchData = async () => {
      if (!user) return;

      try {
        // Fetch help requests
        const { data: helpRequestsData } = await supabase
          .from('help_requests')
          .select('*')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false });

        if (helpRequestsData) {
          setHelpRequests(helpRequestsData);
        }

        // Fetch connections
        const { data: connectionsData } = await supabase
          .from('connections')
          .select(`
            *,
            caregiver_profile:profiles!connections_caregiver_id_fkey(*)
          `)
          .eq('student_id', user.id);

        if (connectionsData) {
          setConnections(connectionsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [user]);

  if (!profile || !thriveSprite) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('general.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <Header
          helpRequests={helpRequests}
          connections={connections}
          historyModalOpen={historyModalOpen}
          setHistoryModalOpen={setHistoryModalOpen}
          getUrgencyEmoji={getUrgencyEmoji}
          getStatusColor={getStatusColor}
          handleConnectionAdded={handleConnectionAdded}
          i18n={i18n}
        />

        {/* Dashboard Content */}
        <div className="grid gap-6">
          <div className="bg-card rounded-lg p-6">
            <h1 className="text-2xl font-bold mb-4">
              {t('studentDash.welcome', { name: profile.username })}
            </h1>
            <p className="text-muted-foreground">
              {t('studentDash.subtitle')}
            </p>
          </div>

          {/* Help Request Section */}
          <div className="bg-card rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              {t('studentDash.needHelp')}
            </h2>
            <Button className="w-full md:w-auto">
              {t('studentDash.requestHelp')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}