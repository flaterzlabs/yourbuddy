import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { BuddyLogo } from "@/components/buddy-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { RoleCard } from "@/components/role-card";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { User, Users, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("student");
  const [loading, setLoading] = useState(false);
  
  const { signUp, signIn, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const roles = [
    {
      id: "student",
      title: "Estudante",
      description: "Sou uma criança que quer se comunicar melhor",
      icon: User
    },
    {
      id: "caregiver",
      title: "Responsável",
      description: "Quero acompanhar e ajudar meu filho",
      icon: Users
    },
    {
      id: "educator",
      title: "Professor(a)",
      description: "Sou educador e quero apoiar meus alunos",
      icon: GraduationCap
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, selectedRole, username);
        if (error) throw error;
        
        toast({
          title: "Conta criada!",
          description: "Verifique seu email para confirmar a conta.",
        });
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        
        toast({
          title: "Login realizado!",
          description: "Bem-vindo ao BUDDY!",
        });
      }
    } catch (error: any) {
      let message = "Ocorreu um erro. Tente novamente.";
      
      if (error.message?.includes("Invalid login credentials")) {
        message = "Email ou senha incorretos.";
      } else if (error.message?.includes("User already registered")) {
        message = "Este email já está cadastrado. Faça login.";
      } else if (error.message?.includes("Password should be at least")) {
        message = "A senha deve ter pelo menos 6 caracteres.";
      }
      
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <BuddyLogo size="lg" />
          <ThemeToggle />
        </div>

        {/* Auth Form */}
        <div className="max-w-md mx-auto">
          <Card className="p-8 bg-gradient-card shadow-medium">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
                {isSignUp ? "Criar Conta" : "Entrar"}
              </h1>
              <p className="text-muted-foreground">
                {isSignUp ? "Junte-se à comunidade BUDDY" : "Acesse sua conta BUDDY"}
              </p>
            </div>

            {/* Role Selection for Sign Up */}
            {isSignUp && (
              <div className="mb-6">
                <Label className="text-sm font-medium mb-4 block">
                  Como você vai usar o BUDDY?
                </Label>
                <div className="grid gap-3">
                  {roles.map((role) => (
                    <RoleCard
                      key={role.id}
                      title={role.title}
                      description={role.description}
                      icon={role.icon}
                      selected={selectedRole === role.id}
                      onClick={() => setSelectedRole(role.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div>
                  <Label htmlFor="username">Nome de usuário</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Como quer ser chamado?"
                    className="mt-1"
                  />
                </div>
              )}
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  className="mt-1"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="hero"
                size="lg"
                disabled={loading}
                className="w-full"
              >
                {loading ? "Processando..." : (isSignUp ? "Criar Conta" : "Entrar")}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary hover:underline"
              >
                {isSignUp ? "Já tem conta? Faça login" : "Não tem conta? Cadastre-se"}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}