import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BuddyLogo } from "@/components/buddy-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { StudentAvatar } from "@/components/student-avatar";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Hand, Copy, Clock, CheckCircle, XCircle } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type HelpRequest = Database['public']['Tables']['help_requests']['Row'];

export default function StudentDashboard() {
  const { user, profile, thriveSprite, signOut } = useAuth();
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [urgency, setUrgency] = useState<'ok' | 'attention' | 'urgent'>('ok');

  const fetchHelpRequests = async () => {
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
  };

  useEffect(() => {
    fetchHelpRequests();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('help-requests-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'help_requests',
          filter: `student_id=eq.${user?.id}`
        },
        () => {
          fetchHelpRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleHelpRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('help_requests')
        .insert({
          student_id: user.id,
          message: message || undefined,
          urgency
        });
      
      if (error) throw error;
      
      toast({
        title: "Pedido enviado!",
        description: "Seus responsáveis foram notificados.",
      });
      
      setMessage("");
      setUrgency('ok');
    } catch (error) {
      console.error('Error creating help request:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o pedido. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyStudentCode = () => {
    if (profile?.student_code) {
      navigator.clipboard.writeText(profile.student_code);
      toast({
        title: "Código copiado!",
        description: "Compartilhe este código com seus responsáveis.",
      });
    }
  };

  const getStatusColor = (status: string): "default" | "destructive" | "secondary" | "outline" => {
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
          <BuddyLogo size="lg" />
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button variant="ghost" onClick={signOut}>
              Sair
            </Button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Welcome Section */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              <StudentAvatar 
                imageUrl={thriveSprite?.image_url}
                seed={thriveSprite ? (thriveSprite.options as any)?.seed : undefined}
                style={thriveSprite ? (thriveSprite.options as any)?.style : undefined}
                size={80} 
                className="border-4 border-primary/20"
              />
              <div>
                <h1 className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                  Olá, {profile?.username}! 👋
                </h1>
                <p className="text-xl text-muted-foreground">
                  Como você está se sentindo hoje?
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Help Request Form */}
            <Card className="p-6 bg-gradient-card shadow-medium">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Hand className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Precisa de Ajuda?</h2>
                <p className="text-muted-foreground">
                  Seus responsáveis serão notificados imediatamente
                </p>
              </div>

              <form onSubmit={handleHelpRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Como você está se sentindo?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={urgency === 'ok' ? 'default' : 'outline'}
                      onClick={() => setUrgency('ok')}
                      className="text-sm"
                    >
                      🟢 Bem
                    </Button>
                    <Button
                      type="button"
                      variant={urgency === 'attention' ? 'default' : 'outline'}
                      onClick={() => setUrgency('attention')}
                      className="text-sm"
                    >
                      🟡 Preciso
                    </Button>
                    <Button
                      type="button"
                      variant={urgency === 'urgent' ? 'default' : 'outline'}
                      onClick={() => setUrgency('urgent')}
                      className="text-sm"
                    >
                      🔴 Urgente
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Quer contar mais alguma coisa? (opcional)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="O que está acontecendo?"
                    className="w-full p-3 rounded-xl border border-border bg-background"
                    rows={3}
                  />
                </div>

                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Enviando..." : "🆘 Pedir Ajuda"}
                </Button>
              </form>
            </Card>

            {/* Student Code & Status */}
            <div className="space-y-6">
              {/* Student Code */}
              <Card className="p-6 bg-gradient-card shadow-medium">
                <h3 className="text-xl font-bold mb-4">Seu Código de Conexão</h3>
                <div className="bg-background/50 p-4 rounded-xl border border-border">
                  <div className="flex items-center justify-between">
                    <code className="text-2xl font-mono font-bold text-primary">
                      {profile?.student_code || '...'}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyStudentCode}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  Compartilhe este código com seus responsáveis para que eles possam se conectar com você.
                </p>
              </Card>

              {/* Recent Help Requests */}
              <Card className="p-6 bg-gradient-card shadow-medium">
                <h3 className="text-xl font-bold mb-4">Seus Pedidos Recentes</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {helpRequests.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      Nenhum pedido ainda
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
                          <span className="text-xs text-muted-foreground">
                            {new Date(request.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {request.message && (
                          <p className="text-sm text-muted-foreground">
                            {request.message}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}