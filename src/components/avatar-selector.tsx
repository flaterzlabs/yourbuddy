import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shuffle, Check } from "lucide-react";

interface AvatarSelectorProps {
  onSelect: (seed: string) => void;
  selectedSeed?: string;
}

export function AvatarSelector({ onSelect, selectedSeed }: AvatarSelectorProps) {
  const [seeds, setSeeds] = useState<string[]>(() => 
    Array.from({ length: 16 }, () => Math.random().toString(36).substring(7))
  );

  const generateNewSeeds = () => {
    setSeeds(Array.from({ length: 16 }, () => Math.random().toString(36).substring(7)));
  };

  const getAvatarUrl = (seed: string) => {
    return `https://api.dicebear.com/9.x/thumbs/svg?seed=${seed}&size=80&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold mb-2">Escolha seu ThriveSprite!</h3>
        <p className="text-muted-foreground">
          Selecione o avatar que mais combina com você
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {seeds.map((seed) => (
          <Card
            key={seed}
            className={`p-3 cursor-pointer transition-all hover:scale-105 ${
              selectedSeed === seed
                ? 'ring-2 ring-primary bg-primary/10'
                : 'hover:shadow-soft'
            }`}
            onClick={() => onSelect(seed)}
          >
            <div className="relative">
              <img
                src={getAvatarUrl(seed)}
                alt="Avatar option"
                className="w-full h-full rounded-lg"
              />
              {selectedSeed === seed && (
                <div className="absolute -top-1 -right-1 bg-primary rounded-full p-1">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Button
          variant="outline"
          onClick={generateNewSeeds}
          className="gap-2"
        >
          <Shuffle className="h-4 w-4" />
          Gerar novos
        </Button>
      </div>
    </div>
  );
}