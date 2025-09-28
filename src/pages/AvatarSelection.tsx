import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BuddyLogo } from '@/components/buddy-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { AvatarSelector } from '@/components/avatar-selector';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export default function AvatarSelection() {
  const [selectedSeed, setSelectedSeed] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<string>('thumbs');
  const [loading, setLoading] = useState(false);
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
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
    'lorelei',
    'lorelei-neutral',
    'micah',
    'miniavs',
    'open-peeps',
    'personas',
    'pixel-art',
    'pixel-art-neutral',
    'thumbs',
  ];

  const handleSaveAvatar = async () => {
    if (!selectedSeed || !user) return;

    setLoading(true);
    try {
      const getAvatarUrl = (seed: string, style: string) => {
        return `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}&size=80&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
      };

      const { error } = await supabase.from('thrive_sprites').upsert({
        student_id: user.id,
        image_url: getAvatarUrl(selectedSeed, selectedStyle),
        options: { seed: selectedSeed, style: selectedStyle },
      });

      if (error) throw error;

      await refreshProfile();

      toast({
        title: 'Avatar saved!',
        description: 'Your avatar has been updated successfully.',
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving avatar:', error);
      toast({
        title: 'Error',
        description: 'Failed to save avatar. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRandomAvatar = async () => {
    const randomSeed = Math.random().toString(36).substring(7);
    const randomStyle = avatarStyles[Math.floor(Math.random() * avatarStyles.length)];
    setSelectedSeed(randomSeed);
    setSelectedStyle(randomStyle);
    
    if (!user) return;

    setLoading(true);
    try {
      const getAvatarUrl = (seed: string, style: string) => {
        return `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}&size=80&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
      };

      const { error } = await supabase.from('thrive_sprites').upsert({
        student_id: user.id,
        image_url: getAvatarUrl(randomSeed, randomStyle),
        options: { seed: randomSeed, style: randomStyle },
      });

      if (error) throw error;

      await refreshProfile();

      toast({
        title: 'Avatar saved!',
        description: 'Your avatar has been updated successfully.',
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving avatar:', error);
      toast({
        title: 'Error',
        description: 'Failed to save avatar. Please try again.',
        variant: 'destructive',
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
          <div className="flex gap-2">
            <ThemeToggle />
          </div>
        </div>

        {/* Avatar Selection */}
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 bg-gradient-card shadow-medium">
            <AvatarSelector
              onSelect={handleAvatarSelect}
              selectedSeed={selectedSeed}
              selectedStyle={selectedStyle}
            />

            <div className="flex justify-center mt-8 gap-3">
              <Button
                onClick={handleSaveAvatar}
                disabled={!selectedSeed || loading}
                variant="hero"
                size="lg"
              >
                {loading ? 'Saving...' : 'Continue'}
              </Button>
              <Button
                variant="outline"
                size="lg"
                disabled={loading}
                onClick={handleRandomAvatar}
              >
                Random Pick
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
