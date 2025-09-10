import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BuddyLogo } from "@/components/buddy-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { RoleCard } from "@/components/role-card";
import { User, Users, GraduationCap } from "lucide-react";

export default function Welcome() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const roles = [
    {
      id: "student",
      title: "Estudante",
      description: "Sou uma criança que quer se comunicar melhor",
      icon: User
    },
    {
      id: "parent",
      title: "Pai/Mãe",
      description: "Quero acompanhar e ajudar meu filho",
      icon: Users
    },
    {
      id: "teacher",
      title: "Professor(a)",
      description: "Sou educador e quero apoiar meus alunos",
      icon: GraduationCap
    }
  ];

  const handleContinue = () => {
    if (selectedRole) {
      // TODO: Navigate to role-specific registration
      console.log("Selected role:", selectedRole);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <BuddyLogo size="lg" />
          <ThemeToggle />
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-12">
            <h1 className="text-5xl font-bold mb-6 bg-gradient-hero bg-clip-text text-transparent">
              Bem-vindo ao BUDDY!
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Uma plataforma de comunicação especial para crianças atípicas, 
              conectando estudantes com seus responsáveis e educadores de forma simples e carinhosa.
            </p>
          </div>

          {/* Role Selection */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-8 text-foreground">
              Como você gostaria de usar o BUDDY?
            </h2>
            <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
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

          {/* Continue Button */}
          <div className="flex justify-center">
            <Button
              variant="hero"
              size="xl"
              onClick={handleContinue}
              disabled={!selectedRole}
              className="px-12"
            >
              Continuar
            </Button>
          </div>

          {/* Features Preview */}
          <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-success/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <User className="h-6 w-6 text-success" />
              </div>
              <h3 className="font-semibold mb-2">Avatar Personalizado</h3>
              <p className="text-sm text-muted-foreground">
                Crie seu ThriveSprite único e divertido
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-warning/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-warning" />
              </div>
              <h3 className="font-semibold mb-2">Conexão Segura</h3>
              <p className="text-sm text-muted-foreground">
                Conecte-se com responsáveis via código único
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Comunicação Fácil</h3>
              <p className="text-sm text-muted-foreground">
                Peça ajuda de forma simples e rápida
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}