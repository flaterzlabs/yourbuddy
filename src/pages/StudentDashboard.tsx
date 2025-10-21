import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { BuddyLogo } from "@/components/buddy-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { StudentAvatar } from "@/components/student-avatar";
import { SettingsModal } from "@/components/settings-modal";
import { OpenRequestsModalContent } from "@/components/open-requests-modal";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Menu, ClipboardList, Link, LogOut, Loader2, UserCircle } from "lucide-react";
import { StudentStatsPopover } from "@/components/student-stats-popover";
import { Database } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
type HelpRequest = Database["public"]["Tables"]["help_requests"]["Row"];
type Connection = Database["public"]["Tables"]["connections"]["Row"] & {
  caregiver_profile: {
    username: string;
    role: string;
  };
};

const formatCaregiverRecipients = (connections: Connection[]) => {
  if (!connections || connections.length === 0) {
    return "No caregivers connected yet";
  }

  const names = connections
    .map((connection) => connection.caregiver_profile?.username)
    .filter((name): name is string => Boolean(name?.trim()));

  if (names.length === 0) {
    return "Your connected caregivers";
  }

  const uniqueNames = Array.from(new Set(names));
  return uniqueNames.join(", ");
};

// --- Componente para menu mobile ---
function MobileMenu({
  helpRequests,
  historyModalOpen,
  setHistoryModalOpen,
  handleConnectionAdded,
  connections,
  signOut,
  navigate,
  userId,
}: {
  helpRequests: HelpRequest[];
  historyModalOpen: boolean;
  setHistoryModalOpen: (open: boolean) => void;
  handleConnectionAdded: () => void;
  connections: Connection[];
  signOut: () => Promise<void>;
  navigate: (path: string) => void;
  userId: string;
}) {
  const recipientsText = formatCaregiverRecipients(connections);
  const openRequestsCount = useMemo(() => helpRequests.filter((r) => r.status === "open").length, [helpRequests]);

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
                {openRequestsCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center">
                    {openRequestsCount}
                  </span>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[100%] overflow-hidden flex flex-col">
              <OpenRequestsModalContent helpRequests={helpRequests} recipientsText={recipientsText} />
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

          {/* Estatísticas */}
          <StudentStatsPopover userId={userId} />

          {/* Change Avatar */}
          <Button
            variant="ghost"
            size="icon"
            className="transition-colors duration-200"
            onClick={() => navigate("/avatar-selection")}
          >
            <UserCircle className="h-5 w-5" />
          </Button>

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
                title: "Signed out successfully",
                description: "See you next time!",
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
  const [message, setMessage] = useState("");
  const [urgency, setUrgency] = useState<"ok" | "attention" | "urgent" | null>(null);
  const [pendingUrgency, setPendingUrgency] = useState<"ok" | "attention" | "urgent" | null>(null);
  const [sendTimer, setSendTimer] = useState<NodeJS.Timeout | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [lastStatusChange, setLastStatusChange] = useState<{
    id: string;
    status: string;
  } | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const recipientsText = formatCaregiverRecipients(connections);
  const openRequestsCount = useMemo(() => helpRequests.filter((r) => r.status === "open").length, [helpRequests]);
  const fetchConnections = async () => {
    if (!user) return;
    try {
      const { data: connectionsData, error: connectionsError } = await supabase
        .from("connections")
        .select("*")
        .eq("student_id", user.id)
        .eq("status", "active");
      if (connectionsError) throw connectionsError;
      if (!connectionsData || connectionsData.length === 0) {
        setConnections([]);
        return;
      }
      const caregiverIds = connectionsData.map((conn) => conn.caregiver_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, username, role")
        .in("user_id", caregiverIds);
      if (profilesError) throw profilesError;
      const connectionsWithProfiles = connectionsData.map((connection) => {
        const caregiverProfile = profilesData?.find((profile) => profile.user_id === connection.caregiver_id);
        return {
          ...connection,
          caregiver_profile: caregiverProfile || {
            username: "Professor/Responsável",
            role: "caregiver",
          },
        };
      });
      setConnections(connectionsWithProfiles);
    } catch (error) {
      console.error("Error fetching connections:", error);
    }
  };
  const handleConnectionAdded = () => {
    fetchConnections();
    toast({
      title: "Connected!",
      description: "You’re now connected to the teacher / caregiver.",
      duration: 3000,
      variant: "student",
    });
  };
  const fetchHelpRequests = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("help_requests")
      .select("*")
      .eq("student_id", user.id)
      .order("created_at", {
        ascending: false,
      });
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
      .on(
        "broadcast",
        {
          event: "status-update",
        },
        (payload) => {
          const data = payload.payload;
          if (data?.status) {
            const statusText = data.status === "answered" ? "respondido" : "finalizado";
            toast({
              title: "Request updated!",
              description: `Your request was ${statusText} by the teacher / caregiver.`,
              variant: "student",
              duration: 4000,
            });
            fetchHelpRequests();
          }
        },
      )
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
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "help_requests",
          filter: `student_id=eq.${user.id}`,
        },
        (payload) => {
          fetchHelpRequests();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(helpRequestsChannel);
    };
  }, [user?.id]);
  const handleEmojiClick = (selectedUrgency: "ok" | "attention" | "urgent") => {
    if (!user) return;
    if (pendingUrgency === selectedUrgency && sendTimer) {
      clearTimeout(sendTimer);
      setSendTimer(null);
      setPendingUrgency(null);
      setCountdown(0);
      return;
    }
    if (sendTimer) clearTimeout(sendTimer);
    setPendingUrgency(selectedUrgency);
    setCountdown(5);

    // 5 segundos
    const timer = setTimeout(() => {
      sendHelpRequest(selectedUrgency);
    }, 5000);
    setSendTimer(timer);
  };
  const sendHelpRequest = async (urgencyLevel: "ok" | "attention" | "urgent") => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("help_requests")
        .insert({
          student_id: user.id,
          message: message || undefined,
          urgency: urgencyLevel,
        })
        .select()
        .single();
      if (error) throw error;

      // Send broadcast notification to caregivers
      try {
        const broadcastChannel = supabase.channel("help-requests-broadcast");
        await broadcastChannel.subscribe();
        setTimeout(async () => {
          await broadcastChannel.send({
            type: "broadcast",
            event: "new-help",
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
        console.log("Broadcast notification failed:", broadcastError);
      }

      // Success animation and notification
      setUrgency(urgencyLevel);
      setShowSuccessAnimation(true);

      setTimeout(() => {
        setUrgency(null);
        setShowSuccessAnimation(false);
      }, 2000);

      toast({
        title: "Help request sent!",
        description: "Your request has been sent to connected caregivers",
        duration: 3000,
        variant: "student",
      });
      fetchHelpRequests();
      setMessage("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send help request. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setLoading(false);
      setPendingUrgency(null);
      setSendTimer(null);
      setCountdown(0);
    }
  };

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0 && pendingUrgency) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, pendingUrgency]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (sendTimer) {
        clearTimeout(sendTimer);
      }
    };
  }, [sendTimer]);
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          {/* Logo e título - visíveis apenas no desktop/tablet */}
          <div className="hidden sm:flex flex-col items-center gap-1">
            <BuddyLogo size="lg" />
            <h2 className="text-lg font-semibold text-muted-foreground">
              {profile?.role === "student" ? "Student Dashboard" : "Dashboard"}
            </h2>
          </div>

          {/* Saudação - sempre visível, mas no mobile ocupa o lugar do logo */}
          <div className="flex flex-col items-center text-center sm:hidden">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              Hello, {profile?.username || "User"}!
            </h1>
            <p className="text-base sm:text-xl text-muted-foreground">How are you feeling today?</p>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center gap-4">
            <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="relative transition-colors duration-200">
                  <ClipboardList className="h-5 w-5" />
                  {openRequestsCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-6 w-6 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center">
                      {openRequestsCount}
                    </span>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[90vw] sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col mx-auto">
                <OpenRequestsModalContent helpRequests={helpRequests} recipientsText={recipientsText} />
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

            <StudentStatsPopover userId={user?.id || ""} />

            {/* Change Avatar */}
            <Button
              variant="ghost"
              size="icon"
              className="transition-colors duration-200"
              onClick={() => navigate("/avatar-selection")}
            >
              <UserCircle className="h-5 w-5" />
            </Button>

            <ThemeToggle />

            <Button
              variant="ghost"
              className="transition-colors duration-200 hover:bg-purple-600 hover:text-white"
              onClick={async () => {
                await signOut();
                toast({
                  title: "Signed out successfully",
                  description: "See you next time!",
                  variant: "student",
                });
                navigate("/auth");
              }}
            >
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
            userId={user?.id || ""}
          />
        </div>

        {/* Conteúdo principal */}
        <div className="max-w-2xl mx-auto">
          {/* Welcome Section */}
          <div className="hidden sm:block text-center mb-8">
            <div className="mb-4">
              <h1 className="bg-gradient-hero bg-clip-text text-transparent font-extrabold text-4xl">
                Hello, {profile?.username || "User"}!
              </h1>
              <p className="text-xl text-muted-foreground">How are you feeling today?</p>
            </div>
          </div>

          {/* Help Request Form */}
          <motion.div
            animate={{
              scale: urgency ? [1, 1.02, 1] : 1,
            }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className={`rounded-lg ${
              urgency === "ok"
                ? "animate-pulse-success"
                : urgency === "attention"
                  ? "animate-pulse-warning"
                  : urgency === "urgent"
                    ? "animate-pulse-urgent"
                    : ""
            }`}
          >
            <Card className="p-8 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 shadow-lg mb-8 relative overflow-hidden">
              <AnimatePresence>
                {showSuccessAnimation && (
                  <motion.div
                    key="pulse-overlay"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{
                      opacity: [0, 1, 0.6, 0],
                      scale: [1, 1.2, 1, 1.2, 1], // mais expansão
                      boxShadow: [
                        "0 0 0px rgba(0,0,0,0)",
                        urgency === "ok"
                          ? "0 0 60px 30px rgba(34,197,94,1)" // verde forte
                          : urgency === "attention"
                            ? "0 0 60px 30px rgba(234,179,8,1)" // amarelo forte
                            : "0 0 60px 30px rgba(239,68,68,1)", // vermelho forte
                        "0 0 0px rgba(0,0,0,0)",
                      ],
                    }}
                    transition={{
                      duration: 1.2, // cada pulso dura 1.2s
                      repeat: 2, // total de 3 piscadas
                      ease: "easeInOut",
                    }}
                    className="absolute inset-0 rounded-lg pointer-events-none z-20"
                    style={{
                      backgroundColor:
                        urgency === "ok"
                          ? "rgba(34,197,94,0.4)" // overlay mais visível
                          : urgency === "attention"
                            ? "rgba(234,179,8,0.4)"
                            : "rgba(239,68,68,0.4)",
                    }}
                  />
                )}
              </AnimatePresence>

              <div className="text-center mb-8">
                <div className="flex items-center justify-center mx-auto mb-4">
                  <StudentAvatar
                    imageUrl={thriveSprite?.image_url}
                    seed={thriveSprite ? (thriveSprite.options as any)?.seed : undefined}
                    style={thriveSprite ? (thriveSprite.options as any)?.style : undefined}
                    size={160}
                    className="border-4 border-success rounded-full shadow-md shadow-green-500"
                  />
                </div>
                <h2 className="text-2xl font-bold mb-2">Need Help?</h2>
                <p className="hidden sm:block text-muted-foreground mb-4">Your caregivers will be notified</p>
              </div>

              <div className="space-y-8">
                {/* EMOTIONAL BUTTONS */}
                <div>
                  <div className={`flex justify-center items-center gap-6 sm:gap-12 ${urgency ? "has-selection" : ""}`}>
                    <button
                      type="button"
                      onClick={() => handleEmojiClick("ok")}
                      disabled={loading}
                      className={`emotion-button emotion-happy relative
                      ${urgency === "ok" ? "selected animate-bounce shadow-lg shadow-green-500/50" : ""} 
                      ${pendingUrgency === "ok" ? "pending" : ""}
                      w-18 h-18 sm:w-28 sm:h-28 transition-all duration-200`}
                      aria-label={pendingUrgency === "ok" ? "Cancel request" : "I'm fine – click to ask for help"}
                    >
                      <span className="text-5xl sm:text-7xl">😊</span>
                      {pendingUrgency === "ok" && (
                        <>
                          <div className="absolute -top-3 -right-3">
                            <Loader2 className="h-6 w-6 animate-spin text-green-500" strokeWidth={3} />
                          </div>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEmojiClick("attention")}
                      disabled={loading}
                      className={`emotion-button emotion-need relative
                      ${urgency === "attention" ? "selected animate-bounce shadow-lg shadow-yellow-500/50" : ""} 
                      ${pendingUrgency === "attention" ? "pending" : ""}
                      w-18 h-18 sm:w-28 sm:h-28 transition-all duration-200`}
                      aria-label={
                        pendingUrgency === "attention" ? "Cancel request" : "Need Attention - click to ask for help"
                      }
                    >
                      <span className="text-5xl sm:text-7xl">😟</span>
                      {pendingUrgency === "attention" && (
                        <>
                          <div className="absolute -top-3 -right-3">
                            <Loader2 className="h-6 w-6 animate-spin text-yellow-500" strokeWidth={3} />
                          </div>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEmojiClick("urgent")}
                      disabled={loading}
                      className={`emotion-button emotion-urgent relative
                      ${urgency === "urgent" ? "selected animate-bounce shadow-lg shadow-red-500/50" : ""} 
                      ${pendingUrgency === "urgent" ? "pending" : ""}
                      w-18 h-18 sm:w-28 sm:h-28 transition-all duration-200`}
                      aria-label={pendingUrgency === "urgent" ? "Cancel request" : "Urgent - click to ask for help"}
                    >
                      <span className="text-5xl sm:text-7xl">😭</span>
                      {pendingUrgency === "urgent" && (
                        <>
                          <div className="absolute -top-3 -right-3">
                            <Loader2 className="h-6 w-6 animate-spin text-red-500" strokeWidth={3} />
                          </div>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Feedback text */}
                  {pendingUrgency && countdown > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-center pt-6"
                    >
                      <p className="text-lg font-semibold text-muted-foreground">
                        Sending in <span className="text-2xl font-bold text-primary">{countdown}s</span>... Tap again to
                        cancel!
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
