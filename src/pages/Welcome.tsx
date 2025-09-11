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
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const roles = [
    {
      id: 'student',
      title: t('roles.student.title'),
      description: t('roles.student.desc'),
      icon: User,
    },
    {
      id: 'caregiver',
      title: t('roles.caregiver.title'),
      description: t('roles.caregiver.desc'),
      icon: Users,
    },
    {
      id: 'educator',
      title: t('roles.educator.title'),
      description: t('roles.educator.desc'),
      icon: GraduationCap,
    },
  ];

  const handleContinue = () => {
    if (selectedRole) {
      navigate('/auth');
    }
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

          {/* Role Selection */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-8 text-foreground">
              {t('welcome.chooseRole')}
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
          <div className="flex justify-center gap-4">
            <Button variant="hero" size="xl" onClick={handleContinue} className="px-12">
              {t('welcome.start')}
            </Button>
            <Button variant="outline" size="xl" onClick={() => navigate('/auth')} className="px-8">
              {t('welcome.haveAccount')}
            </Button>
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
