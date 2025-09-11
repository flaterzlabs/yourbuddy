import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BuddyLogo } from '@/components/buddy-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { AvatarSelector } from '@/components/avatar-selector';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function AvatarSelection() {
  const [selectedSeed, setSelectedSeed] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<string>('thumbs');
  const [loading, setLoading] = useState(false);
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
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

  const handleSaveAvatar = async (seedParam?: string, styleParam?: string) => {
    const seed = seedParam ?? selectedSeed;
    const style = styleParam ?? selectedStyle;
    if (!seed || !user) return;

    setLoading(true);
    try {
      const getAvatarUrl = (seed: string, style: string) => {
        return `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}&size=80&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
      };

      const { error } = await supabase.from('thrive_sprites').upsert({
        student_id: user.id,
        image_url: getAvatarUrl(seed, style),
        options: { seed, style },
      });

      if (error) throw error;

      await refreshProfile();

      toast({
        title: t('avatar.toast.savedTitle'),
        description: t('avatar.toast.savedDesc'),
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving avatar:', error);
      toast({
        title: t('avatar.toast.errorTitle'),
        description: t('avatar.toast.errorDesc'),
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
            <LanguageToggle />
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
                {loading ? t('avatar.saving') : t('avatar.continue')}
              </Button>
              <Button
                variant="outline"
                size="lg"
                disabled={loading}
                onClick={async () => {
                  const randomSeed = Math.random().toString(36).substring(7);
                  const randomStyle = avatarStyles[Math.floor(Math.random() * avatarStyles.length)];
                  setSelectedSeed(randomSeed);
                  setSelectedStyle(randomStyle);
                  await handleSaveAvatar(randomSeed, randomStyle);
                }}
              >
                {t('avatar.randomPick')}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
