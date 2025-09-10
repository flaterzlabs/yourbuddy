import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BuddyLogo } from "@/components/buddy-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { AvatarSelector } from "@/components/avatar-selector";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function AvatarSelection() {
  const [selectedSeed, setSelectedSeed] = useState<string>("");
  const [selectedStyle, setSelectedStyle] = useState<string>("thumbs");
  const [loading, setLoading] = useState(false);
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const handleSaveAvatar = async () => {
    if (!selectedSeed || !user) return;

    setLoading(true);
    try {
      const getAvatarUrl = (seed: string, style: string) => {
        return `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}&size=80&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
      };

      const { error } = await supabase
        .from('thrive_sprites')
        .upsert({ 
          student_id: user.id,
          image_url: getAvatarUrl(selectedSeed, selectedStyle),
          options: { seed: selectedSeed, style: selectedStyle }
        });

      if (error) throw error;

      await refreshProfile();
      
      toast({
        title: "Avatar salvo!",
        description: "Seu ThriveSprite foi definido com sucesso.",
      });

      navigate("/dashboard");
    } catch (error) {
      console.error('Error saving avatar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o avatar. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarSelect = (seed: string, style: string) => {
    setSelectedSeed(seed);
    setSelectedStyle(style);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <BuddyLogo size="lg" />
          <ThemeToggle />
        </div>

        {/* Avatar Selection */}
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 bg-gradient-card shadow-medium">
            <AvatarSelector 
              onSelect={handleAvatarSelect}
              selectedSeed={selectedSeed}
              selectedStyle={selectedStyle}
            />

            <div className="flex justify-center mt-8">
              <Button
                onClick={handleSaveAvatar}
                disabled={!selectedSeed || loading}
                variant="hero"
                size="lg"
              >
                {loading ? "Salvando..." : "Continuar"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}