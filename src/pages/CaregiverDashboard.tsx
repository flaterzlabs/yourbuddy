import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BuddyLogo } from "@/components/buddy-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { StudentAvatar } from "@/components/student-avatar";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  UserPlus, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  MessageSquare,
  Activity 
} from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type Connection = Database['public']['Tables']['connections']['Row'] & {
  student_profile?: Database['public']['Tables']['profiles']['Row'];
};

type HelpRequest = Database['public']['Tables']['help_requests']['Row'] & {
  student_profile?: Database['public']['Tables']['profiles']['Row'];
};

export default function CaregiverDashboard() {
  const { user, profile, signOut } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [studentCode, setStudentCode] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchConnections = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('connections')
      .select(`
        *,
        student_profile:profiles!connections_student_id_fkey (*)
      `)
      .eq('caregiver_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching connections:', error);
    } else {
      setConnections(data || []);
    }
  };

  const fetchHelpRequests = async () => {
    if (!user) return;
    
    const activeStudents = connections
      .filter(c => c.status === 'active')
      .map(c => c.student_id);
    
    if (activeStudents.length === 0) {
      setHelpRequests([]);
      return;
    }
    
    const { data, error } = await supabase
      .from('help_requests')
      .select(`
        *,
        student_profile:profiles!help_requests_student_id_fkey (*)
      `)
      .in('student_id', activeStudents)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching help requests:', error);
    } else {
      setHelpRequests(data || []);
    }
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

    // Subscribe to realtime updates
    const helpRequestsChannel = supabase
      .channel('help-requests-caregiver')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'help_requests'
        },
        () => {
          fetchHelpRequests();
        }
      )
      .subscribe();

    const connectionsChannel = supabase
      .channel('connections-caregiver')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections',
          filter: `caregiver_id=eq.${user.id}`
        },
        () => {
          fetchConnections();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(helpRequestsChannel);
      supabase.removeChannel(connectionsChannel);
    };
  }, [user?.id]);

  const handleConnectStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentCode.trim()) return;
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase.rpc('create_connection_by_code', {
        input_code: studentCode.toUpperCase()
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; student?: any };
      
      if (result.success && result.student) {
        toast({
          title: "Estudante conectado!",
          description: `Conectado com ${result.student.username} (${result.student.student_code})`,
        });
        setStudentCode("");
        fetchConnections(); // This will refresh the "Meus Alunos" section
      } else {
        toast({
          title: "Erro",
          description: result.error || "Código inválido",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error connecting to student:', error);
      toast({
        title: "Erro",
        description: "Não foi possível conectar. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHelpRequestAction = async (requestId: string, action: 'answered' | 'closed') => {
    try {
      const { error } = await supabase
        .from('help_requests')
        .update({ 
          status: action,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString()
        })
        .eq('id', requestId);
      
      if (error) throw error;
      
      toast({
        title: action === 'answered' ? "Marcado como respondido" : "Pedido finalizado",
        description: "O estudante foi notificado.",
      });
    } catch (error) {
      console.error('Error updating help request:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o pedido.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (status) {
      case 'open': return 'destructive';
      case 'answered': return 'secondary';
      case 'closed': return 'outline';
      case 'pending': return 'destructive';
      case 'active': return 'secondary';
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

  const activeConnections = connections.filter(c => c.status === 'active');
  const openHelpRequests = helpRequests.filter(r => r.status === 'open');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <BuddyLogo size="lg" />
            <div>
              <h1 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                Olá, {profile?.username}, bem-vindo
              </h1>
              <p className="text-muted-foreground">
                Painel do {profile?.role === 'educator' ? 'Professor' : 'Responsável'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button variant="ghost" onClick={signOut}>
              Sair
            </Button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
              Painel do {profile?.role === 'caregiver' ? 'Responsável' : 'Educador'} 👨‍👩‍👧‍👦
            </h1>
            <p className="text-xl text-muted-foreground">
              Acompanhe e apoie seus estudantes conectados
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Connect Student Form */}
            <Card className="p-6 bg-gradient-card shadow-medium">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold mb-2">Conectar Estudante</h2>
                <p className="text-muted-foreground text-sm">
                  Digite o código do estudante
                </p>
              </div>

              <form onSubmit={handleConnectStudent} className="space-y-4">
                <Input
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                  placeholder="CÓDIGO DO ESTUDANTE"
                  className="text-center text-lg font-mono"
                  maxLength={8}
                />
                
                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  disabled={loading || !studentCode.trim()}
                  className="w-full"
                >
                  {loading ? "Conectando..." : "Conectar"}
                </Button>
              </form>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="text-center p-3 bg-background/50 rounded-lg border border-border">
                  <div className="text-2xl font-bold text-primary">{activeConnections.length}</div>
                  <div className="text-xs text-muted-foreground">Conectados</div>
                </div>
                <div className="text-center p-3 bg-background/50 rounded-lg border border-border">
                  <div className="text-2xl font-bold text-warning">{openHelpRequests.length}</div>
                  <div className="text-xs text-muted-foreground">Pedidos Abertos</div>
                </div>
              </div>
            </Card>

            {/* Help Requests */}
            <Card className="lg:col-span-2 p-6 bg-gradient-card shadow-medium">
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="h-6 w-6 text-warning" />
                <h2 className="text-xl font-bold">Pedidos de Ajuda</h2>
                {openHelpRequests.length > 0 && (
                  <Badge variant="destructive">{openHelpRequests.length} abertos</Badge>
                )}
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {helpRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Nenhum pedido de ajuda ainda
                    </p>
                  </div>
                ) : (
                  helpRequests.map((request) => (
                    <div
                      key={request.id}
                      className="p-4 bg-background/50 rounded-lg border border-border"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{getUrgencyEmoji(request.urgency || 'ok')}</span>
                          <div>
                            <h4 className="font-semibold">
                              {request.student_profile?.username || 'Estudante'}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(request.created_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <Badge variant={getStatusColor(request.status || 'open')}>
                          {request.status === 'open' && (
                            <>
                              <Clock className="h-3 w-3 mr-1" />
                              Aguardando
                            </>
                          )}
                          {request.status === 'answered' && (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Respondido
                            </>
                          )}
                          {request.status === 'closed' && (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Finalizado
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
                            variant="default"
                            onClick={() => handleHelpRequestAction(request.id, 'answered')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Responder
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleHelpRequestAction(request.id, 'closed')}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Finalizar
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
              <h2 className="text-xl font-bold">Meus Alunos</h2>
            </div>

            {activeConnections.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Você ainda não tem alunos conectados
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Use o código do estudante para fazer a primeira conexão
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
                        seed={(connection.student_profile as any)?.avatar_seed}
                        style={(connection.student_profile as any)?.avatar_style}
                        size={48}
                        className="border-2 border-primary/20"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">
                          {connection.student_profile?.username || 'Estudante'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Conectado em {new Date(connection.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        <Activity className="h-3 w-3 mr-1" />
                        Ativo
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}