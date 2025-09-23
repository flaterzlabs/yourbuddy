import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { BuddyLogo } from '@/components/buddy-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { RoleCard } from '@/components/role-card';
import { useAuth } from '@/hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import { User, Users, GraduationCap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Welcome() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const selectedRole = 'student'; // Fixed role for students

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleContinue = () => {
    navigate('/auth', { state: { signUp: true, selectedRole } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <BuddyLogo size="lg" />
          <div className="flex gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-12">
            <h1 className="text-5xl font-bold mb-6 bg-gradient-hero bg-clip-text text-transparent">
              {t('welcome.title')}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t('welcome.subtitle')}
            </p>
          </div>

          {/* Student Focus Section */}
         <div className="mb-12">
  <div className="max-w-sm mx-auto"> {/* largura menor só aqui */}
    <RoleCard
      title={t('roles.student.title')}
      description={t('roles.student.desc')}
      icon={User}
      selected={true}
      onClick={() => {}}
    />
  </div>
</div>

        {/* Continue Button */}
<div className="flex flex-col items-center gap-4">
  <div className="flex gap-4">
    <Button
      variant="hero"
      size="xl"
      onClick={handleContinue}
      className="px-12 transition-all duration-300 ease-in-out 
                 hover:scale-105 active:scale-95"
    >
      {t('welcome.start')}
    </Button>

    <Button
      variant="outline"
      size="xl"
      onClick={() => navigate('/auth')}
      className="px-8 transition-all duration-300 ease-in-out 
                 hover:bg-muted hover:scale-105 active:scale-95"
    >
      {t('welcome.haveAccount')}
    </Button>
  </div>
</div>
            
            {/* Link for Parents/Educators */}
            <button
              onClick={() => navigate('/caregiver-auth')}
              className="text-primary hover:underline text-sm font-medium mt-4"
            >
              {t('welcome.caregiverLink')}
            </button>
          </div>

          {/* Features Preview */}
          <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-success/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <User className="h-6 w-6 text-success" />
              </div>
              <h3 className="font-semibold mb-2">{t('welcome.features.avatarTitle')}</h3>
              <p className="text-sm text-muted-foreground">{t('welcome.features.avatarDesc')}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-warning/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-warning" />
              </div>
              <h3 className="font-semibold mb-2">{t('welcome.features.secureTitle')}</h3>
              <p className="text-sm text-muted-foreground">{t('welcome.features.secureDesc')}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{t('welcome.features.easyTitle')}</h3>
              <p className="text-sm text-muted-foreground">{t('welcome.features.easyDesc')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
