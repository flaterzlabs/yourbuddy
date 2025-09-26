import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Shuffle, Check } from 'lucide-react';

interface AvatarSelectorProps {
  onSelect: (seed: string, style: string) => void;
  selectedSeed?: string;
  selectedStyle?: string;
}

export function AvatarSelector({ onSelect, selectedSeed, selectedStyle }: AvatarSelectorProps) {
  const avatarStyles = [
    'adventurer',
    'adventurer-neutral',
    'avataaars',
    'avataaars-neutral',
    'big-ears',
    'big-ears-neutral',
    'big-smile',
    'bottts',
    'bottts-neutral',
    'croodles',
    'croodles-neutral',
    'fun-emoji',
    'identicon',
    'lorelei',
    'lorelei-neutral',
    'micah',
    'miniavs',
    'open-peeps',
    'personas',
    'pixel-art',
    'pixel-art-neutral',
    'rings',
    'shapes',
    'thumbs',
  ];

  const [seeds, setSeeds] = useState<string[]>(() =>
    Array.from({ length: 16 }, () => Math.random().toString(36).substring(7)),
  );

  const [currentStyle, setCurrentStyle] = useState(selectedStyle || 'thumbs');

  const generateNewSeeds = () => {
    setSeeds(Array.from({ length: 16 }, () => Math.random().toString(36).substring(7)));
    // Also change the style randomly
    const randomStyle = avatarStyles[Math.floor(Math.random() * avatarStyles.length)];
    setCurrentStyle(randomStyle);
  };

  const getAvatarUrl = (seed: string, style: string) => {
    return `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}&size=80&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold mb-2">Choose Your Avatar</h3>
        <p className="text-muted-foreground">Select an avatar that represents you</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {seeds.map((seed) => {
          const isSelected = selectedSeed === seed && selectedStyle === currentStyle;
          return (
            <Card
              key={seed}
              className={`p-3 cursor-pointer transition-all hover:scale-105 ${
                isSelected ? 'ring-2 ring-primary bg-primary/10' : 'hover:shadow-soft'
              }`}
              onClick={() => onSelect(seed, currentStyle)}
            >
              <div className="relative">
                <img
                  src={getAvatarUrl(seed, currentStyle)}
                  alt="Avatar option"
                  className="w-full h-full rounded-lg"
                />
                {isSelected && (
                  <div className="absolute -top-1 -right-1 bg-primary rounded-full p-1">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="text-center">
        <Button variant="outline" onClick={generateNewSeeds} className="gap-2">
          <Shuffle className="h-4 w-4" />
          Generate New Avatars
        </Button>
      </div>
    </div>
  );
}