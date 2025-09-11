import { Button } from '@/components/ui/button';
import { BuddyLogo } from '@/components/buddy-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { useTranslation } from 'react-i18next';

const Index = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-12">
          <BuddyLogo size="lg" />
          <div className="flex gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
            BUDDY Dashboard
          </h1>
          <p className="text-xl text-muted-foreground mb-8">{t('welcome.subtitle')}</p>

          <div className="bg-gradient-card p-8 rounded-3xl shadow-medium max-w-md mx-auto">
            <p className="text-muted-foreground mb-4">Supabase connection required.</p>
            <Button variant="hero" size="lg">
              Supabase pending...
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
