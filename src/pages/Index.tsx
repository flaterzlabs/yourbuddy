import { Button } from "@/components/ui/button";
import { BuddyLogo } from "@/components/buddy-logo";
import { ThemeToggle } from "@/components/theme-toggle";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-12">
          <BuddyLogo size="lg" />
          <ThemeToggle />
        </div>
        
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
            Dashboard BUDDY
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Conecte-se ao Supabase para ativar todas as funcionalidades!
          </p>
          
          <div className="bg-gradient-card p-8 rounded-3xl shadow-medium max-w-md mx-auto">
            <p className="text-muted-foreground mb-4">
              Para continuar, você precisa conectar o projeto ao Supabase clicando no botão verde no topo direito da interface.
            </p>
            <Button variant="hero" size="lg">
              Aguardando Supabase...
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
