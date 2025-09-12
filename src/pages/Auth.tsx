import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { BuddyLogo } from '@/components/buddy-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { RoleCard } from '@/components/role-card';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { User, Users, GraduationCap } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function Auth() {
  const { t } = useTranslation();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('student');
  const [loading, setLoading] = useState(false);

  const { signUp, signIn, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { signUp?: boolean; selectedRole?: string } };

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Open in SignUp mode when navigated from Welcome with intent
  useEffect(() => {
    if (location?.state?.signUp) {
      setIsSignUp(true);
      if (location.state.selectedRole) {
        setSelectedRole(location.state.selectedRole);
      }
    }
  }, [location?.state]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, selectedRole, username);
        if (error) throw error;

        toast({ title: t('auth.toast.created'), description: t('auth.toast.verify') });
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;

        toast({ title: t('auth.toast.logged'), description: t('auth.toast.welcome') });
        // Navigate immediately for better UX; ProtectedRoute will handle loading
        navigate('/dashboard');
      }
    } catch (error: any) {
      let message = t('auth.toast.genericError');

      if (error.message?.includes('Invalid login credentials')) {
        message = t('auth.toast.invalidCreds');
      } else if (error.message?.includes('User already registered')) {
        message = t('auth.toast.alreadyRegistered');
      } else if (error.message?.includes('Password should be at least')) {
        message = t('auth.toast.weakPassword');
      }

      toast({ title: t('auth.toast.errorTitle'), description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
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

        {/* Auth Form */}
        <div className="max-w-md mx-auto">
          <Card className="p-8 bg-gradient-card shadow-medium">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
                {isSignUp ? t('auth.signup') : t('auth.login')}
              </h1>
              <p className="text-muted-foreground">
                {isSignUp ? t('auth.joinBuddy') : t('auth.accessBuddy')}
              </p>
            </div>

            {/* Role Selection for Sign Up */}
            {isSignUp && (
              <div className="mb-6">
                <Label className="text-sm font-medium mb-4 block">{t('auth.howUse')}</Label>
                <div className="grid gap-3">
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
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div>
                  <Label htmlFor="username">{t('auth.username')}</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t('auth.usernamePlaceholder')}
                    className="mt-1"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                  className="mt-1"
                  required
                />
              </div>

              <Button type="submit" variant="hero" size="lg" disabled={loading} className="w-full">
                {loading ? t('auth.processing') : isSignUp ? t('auth.signup') : t('auth.login')}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary hover:underline"
              >
                {isSignUp ? t('auth.toggleToLogin') : t('auth.toggleToSignup')}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
